// 実機デモの撮影。
//
// 起動中のアプリ(既定 http://localhost:3000)を、ブラウザの枠を描いた
// 1920×1080 のシェルHTMLの中に iframe で埋め、操作しながら連写する。
// 枠ごと撮るので、出てきたPNGはそのままスライドのコマとして使える。
//
//   node scripts/capture-demo.mjs [出力先] [アプリのURL] [--scenes a,b,c]
//
// 出力: <出力先>/<シーン名>/0000.png ...
//
// シーンは下の SCENES に並んでいる。--scenes で撮るものを絞れるが、
// **操作の流れは常に最初から最後まで通す**(レシピが出ていないとお気に入り登録が
// できない、といった前提があるため)。絞ると録画されないだけで、操作はされる。
//
// 撮影対象は本番ではなく、demoapp/setup.sh で組み立てたコピー。
// 外部サービスを呼ぶ層だけスタブに差し替わっている。詳しくは video/README.md。

import { chromium } from "playwright-core";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith("--"));
const flag = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const OUT = resolve(positional[0] || join(ROOT, "out", "demo"));
const APP = positional[1] || "http://localhost:3000";
const only = (flag("scenes") || "").split(",").map((s) => s.trim()).filter(Boolean);

const FPS = 12;
const ZOOM = 1.4;
const SHELL = join(OUT, "_shell.html");

// ---------------------------------------------------------------- シェル

// アプリを収めるブラウザ風の枠。配色はスライドと揃えている。
const shellHtml = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<style>
  @font-face { font-family: "Noto Sans JP"; font-weight: 400; src: url("${join(ROOT, ".fonts", "NotoSansJP-400.ttf")}") format("truetype"); }
  @font-face { font-family: "Noto Sans JP"; font-weight: 500; src: url("${join(ROOT, ".fonts", "NotoSansJP-500.ttf")}") format("truetype"); }
  @font-face { font-family: "Noto Sans JP"; font-weight: 700; src: url("${join(ROOT, ".fonts", "NotoSansJP-700.ttf")}") format("truetype"); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; }
  body {
    background: #fbf5ec; color: #2c231a;
    font-family: "Noto Sans JP", sans-serif; line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    display: flex; flex-direction: column;
    padding: 32px 80px 36px;
  }
  .top { display: flex; align-items: center; gap: 16px; font-size: 22px; color: #7c6d59; flex-shrink: 0; height: 44px; }
  .top .dot { width: 12px; height: 12px; border-radius: 50%; background: #cf6a2c; box-shadow: 0 0 0 5px #f7e2cd; }
  .top .now { color: #2c231a; font-weight: 500; }
  .top .live {
    margin-left: auto; display: flex; align-items: center; gap: 10px;
    font-size: 20px; font-weight: 500; color: #a8541f;
    background: #f7e2cd; border-radius: 999px; padding: 6px 18px;
  }
  .top .live i { width: 10px; height: 10px; border-radius: 50%; background: #cf6a2c; display: block; }

  .window {
    flex: 1; margin-top: 14px;
    background: #fff; border: 1px solid #ecdec4; border-radius: 16px;
    box-shadow: 0 24px 64px rgba(44,35,26,.14);
    overflow: hidden; display: flex; flex-direction: column;
  }
  .bar {
    height: 58px; flex-shrink: 0; display: flex; align-items: center; gap: 12px;
    padding: 0 22px; background: #f8efe0; border-bottom: 1px solid #ecdec4;
  }
  .bar .l { width: 13px; height: 13px; border-radius: 50%; background: #e0cfb4; }
  .bar .url {
    margin-left: 14px; flex: 1; height: 36px; border-radius: 999px;
    background: #fff; border: 1px solid #ecdec4;
    display: flex; align-items: center; padding: 0 18px;
    font-size: 19px; color: #7c6d59; letter-spacing: .01em;
  }
  .bar .url b { color: #2c231a; font-weight: 500; }

  /* アプリ本体は max-width 720px で組まれているため、そのまま1920pxで映すと
     文字が小さく余白だらけになる。拡大は枠側の transform ではなく、
     アプリ側の CSS zoom で行う(transform だとクリック位置がずれる)。 */
  .view { flex: 1; position: relative; overflow: hidden; }
  iframe {
    position: absolute; inset: 0;
    width: 100%; height: 100%; border: 0; display: block; background: #fff;
  }

  .cap {
    flex-shrink: 0; height: 66px; display: flex; align-items: center; gap: 18px;
    margin-top: 12px; font-size: 30px; font-weight: 500;
    opacity: 0; transition: opacity .18s linear;
  }
  .cap.on { opacity: 1; }
  .cap .n {
    flex-shrink: 0; min-width: 44px; height: 44px; padding: 0 12px; border-radius: 12px;
    background: #cf6a2c; color: #fff; font-size: 22px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .cap .t { color: #2c231a; }
  .cap .s { color: #7c6d59; font-size: 25px; font-weight: 400; }

  /* クリックの位置を示す輪。操作の瞬間だけ出す */
  .tap {
    position: fixed; width: 76px; height: 76px; margin: -38px 0 0 -38px;
    border: 4px solid #cf6a2c; border-radius: 50%;
    background: rgba(207,106,44,.14);
    opacity: 0; pointer-events: none; z-index: 9;
  }
  .tap.on { opacity: 1; }
</style></head>
<body>
  <div class="top">
    <span class="dot"></span>
    <span class="now" id="sec">実際に動かすとこうなります</span>
    <span class="live"><i></i>デモ</span>
  </div>

  <div class="window">
    <div class="bar">
      <span class="l"></span><span class="l"></span><span class="l"></span>
      <span class="url">localhost:3000<b id="path"></b></span>
    </div>
    <div class="view"><iframe id="app" src="${APP}"></iframe></div>
  </div>

  <div class="cap" id="cap"><span class="n" id="capn">1</span><span class="t" id="capt"></span><span class="s" id="caps"></span></div>
  <div class="tap" id="tap"></div>

<script>
  const $ = (id) => document.getElementById(id);
  window.__cap = (n, t, s) => {
    if (!t) { $("cap").classList.remove("on"); return; }
    $("capn").textContent = n; $("capt").textContent = t; $("caps").textContent = s || "";
    $("cap").classList.add("on");
  };
  window.__path = (p) => { $("path").textContent = p || ""; };
  // x, y はシェル側のビューポート座標。Playwright の boundingBox() が
  // iframe のオフセットを織り込んだ値を返すので、そのまま使える。
  window.__tap = (x, y) => {
    const t = $("tap");
    if (x == null) { t.classList.remove("on"); return; }
    t.style.left = x + "px";
    t.style.top = y + "px";
    t.classList.add("on");
  };
<\/script>
</body></html>`;

// ---------------------------------------------------------------- 下ごしらえ

mkdirSync(OUT, { recursive: true });
writeFileSync(SHELL, shellHtml);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});

await page.goto("file://" + SHELL, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);

const app = page.frameLocator("#app");

// アプリ側を拡大する。transform ではなくレイアウトごと変わる zoom を使うので、
// Playwright のクリック位置の計算もそのまま通る。
const applyZoom = () =>
  app.locator("html").evaluate((el, z) => { el.style.zoom = String(z); }, ZOOM);

const wait = (ms) => page.waitForTimeout(ms);
const caption = (n, t, s) => page.evaluate(([n, t, s]) => window.__cap(n, t, s), [n, t, s]);
const setPath = (p) => page.evaluate((p) => window.__path(p), p);
const untap = () => page.evaluate(() => window.__tap(null));

// 枠の中の要素を、シェル座標に直して指し示す
async function tapAt(locator) {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.evaluate(([x, y]) => window.__tap(x, y),
    [box.x + box.width / 2, box.y + box.height / 2]);
}

// 押す前に輪を出し、押したら消す。デモでのクリックはこれで統一する
async function press(locator, hold = 600) {
  await tapAt(locator);
  await wait(hold);
  await locator.click();
  await untap();
}

async function scroll(dy, steps, ms) {
  for (let i = 0; i < steps; i++) {
    await app.locator("body").evaluate((b, d) => b.ownerDocument.defaultView.scrollBy(0, d), dy);
    await wait(ms);
  }
}
const toTop = () =>
  app.locator("body").evaluate((b) => b.ownerDocument.defaultView.scrollTo(0, 0));

// ---------------------------------------------------------------- 連写

const recorded = [];
let shooting = null;
let capNo = 0;   // キャプションの番号。録画するシーンだけ進める

function startScene(name) {
  if (only.length && !only.includes(name)) return;      // 撮らないが操作はする
  const dir = join(OUT, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let i = 0, stop = false;
  const loop = (async () => {
    while (!stop) {
      const t0 = Date.now();
      try {
        await page.screenshot({ path: join(dir, String(i).padStart(4, "0") + ".png") });
        i += 1;
      } catch { /* 遷移中に撮ろうとした場合。次のコマで撮り直す */ }
      const left = 1000 / FPS - (Date.now() - t0);
      if (left > 0) await page.waitForTimeout(left);
    }
  })();
  shooting = {
    name,
    async end() {
      stop = true;
      await loop;
      recorded.push({ name, frames: i, seconds: (i / FPS).toFixed(1) });
      console.log(`   ${name}: ${i}コマ (約${(i / FPS).toFixed(1)}秒)`);
    },
  };
}

async function endScene() {
  if (!shooting) return;
  const s = shooting;
  shooting = null;
  await s.end();
}

// シーン1つぶんを包む。撮る/撮らないに関わらず中の操作は必ず走る。
async function scene(name, cap, body) {
  const recording = !only.length || only.includes(name);
  console.log(`撮影: ${name}${recording ? "" : " (操作のみ)"}`);
  if (cap && recording) await caption(String(++capNo), cap[0], cap[1]);
  startScene(name);
  await body();
  await endScene();
}

// ---------------------------------------------------------------- シーン
//
// 章ごとにここから必要なものを選ぶ。割り当ては video/PROGRESS.md を参照。
// 尺は台本のナレーションと合わせること(README「実機デモ」を参照)。

const SCENES = [
  // 入力チェック。ブラウザ側で止めていることを見せる
  ["validation", ["まず入力チェック", "空のまま押すと、送る前にブラウザが止める"], async () => {
    await wait(1200);
    await press(app.locator(".ingredient-form button[type=submit]"));
    await wait(3600);
    const box = app.locator("#ingredients");
    await box.click();
    await box.pressSequentially("1,2,3,4,5,6,7,8,9,10,11", { delay: 90 });
    await wait(1000);
    await press(app.locator(".ingredient-form button[type=submit]"));
    await wait(4200);
  }],

  // 食材を入力してジャンルを選ぶ
  ["input", ["食材を入力する", "ここはまだ、あなたのパソコンの中だけの話"], async () => {
    const box = app.locator("#ingredients");
    await box.click();
    await box.press("Control+a");
    await box.press("Delete");
    await wait(900);
    await box.pressSequentially("鶏むね肉, 白菜, しょうが", { delay: 200 });
    await wait(1200);
    await app.locator("#genre").selectOption("和食");
    await wait(1600);
    await tapAt(app.locator(".ingredient-form button[type=submit]"));
    await wait(1600);
  }],

  // 考案中。画面はほぼ静止する
  ["thinking", ["サーバーがAIに問い合わせる", "APIキーが使われるのは、この裏側だけ"], async () => {
    await app.locator(".ingredient-form button[type=submit]").click();
    await untap();
    await wait(3400);
  }],

  // 返ってきたレシピを見る
  ["result", ["返ってきたJSONを画面に描く", "材料も手順も、AIが考えたもの"], async () => {
    await app.locator(".recipe-result").waitFor({ timeout: 20000 });
    await wait(1800);
    await scroll(24, 40, 90);
    await wait(1200);
    const checks = app.locator(".recipe-ingredients input[type=checkbox]");
    for (const i of [0, 1]) {
      await press(checks.nth(i), 400);
      await wait(900);
    }
    await wait(1000);
    await scroll(24, 16, 90);
    await wait(1400);
  }],

  // お気に入りに登録する
  ["save", ["お気に入りに登録する", "データベースに1行、追加される"], async () => {
    const saveBtn = app.locator(".recipe-result-actions button").first();
    await saveBtn.scrollIntoViewIfNeeded();
    await wait(1400);
    await press(saveBtn, 900);
    await app.locator(".recipe-result-actions button", { hasText: "登録しました" })
      .waitFor({ timeout: 20000 });
    await wait(4200);
  }],

  // 別のレシピを出し直す
  ["regenerate", ["気に入らなければ、出し直す", "同じ食材で、別の料理を考えてもらう"], async () => {
    const again = app.locator(".recipe-result-actions button", { hasText: "別のレシピ" });
    await again.scrollIntoViewIfNeeded();
    await wait(1200);
    await press(again, 900);
    await wait(3600);
    await app.locator(".recipe-result").waitFor({ timeout: 20000 });
    await wait(2600);
    await scroll(24, 20, 90);
    await wait(1600);
  }],

  // 一覧を開く・絞り込む
  ["list", ["保存したものを開く", "ここではAIを呼ばない。倉庫から出すだけ"], async () => {
    await toTop();
    await wait(900);
    await press(app.locator(".site-nav a", { hasText: "お気に入り" }), 700);
    await setPath("/favorites");
    await app.locator(".favorite-list").waitFor({ timeout: 20000 });
    await wait(2400);
    await press(app.locator(".favorite-card-toggle").first(), 600);
    await wait(2200);
    await scroll(24, 30, 90);
    await wait(1600);
    await scroll(-24, 30, 60);
    await wait(1000);
    await press(app.locator(".genre-filter a", { hasText: "和食" }).first(), 700);
    await setPath("/favorites?genre=和食");
    await wait(3200);
  }],

  // 消す
  ["delete", ["いらなくなったら消す", "データベースから1行、消える"], async () => {
    await press(app.locator(".genre-filter a", { hasText: "すべて" }).first(), 700);
    await setPath("/favorites");
    await wait(2200);
    const before = await app.locator(".favorite-card").count();
    await press(app.locator(".favorite-card").first().locator("button", { hasText: "削除" }), 900);
    await app.locator(".favorite-card").nth(before - 1).waitFor({ state: "detached", timeout: 20000 });
    await wait(3000);
  }],
];

const known = SCENES.map(([n]) => n);
const unknown = only.filter((n) => !known.includes(n));
if (unknown.length) {
  console.error(`知らないシーンです: ${unknown.join(", ")}`);
  console.error(`使えるのは: ${known.join(", ")}`);
  await browser.close();
  process.exit(1);
}

await app.locator(".ingredient-form input").waitFor({ timeout: 30000 });
await applyZoom();
await setPath("/");
await wait(500);

for (const [name, cap, body] of SCENES) {
  await scene(name, cap, body);
}

await browser.close();

console.log("\n撮影完了: " + OUT);
if (recorded.length) {
  console.log("\n  シーン       コマ数   尺の目安");
  for (const r of recorded) {
    console.log(`  ${r.name.padEnd(12)} ${String(r.frames).padStart(4)}   約${r.seconds}秒`);
  }
  console.log("\n  台本のナレーションは、この尺の1.2倍以内に収めること。");
}
