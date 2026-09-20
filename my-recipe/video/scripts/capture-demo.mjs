// 実機デモの撮影。
//
// 起動中のアプリ(既定 http://localhost:3000)を、ブラウザの枠を描いた
// 1920×1080 のシェルHTMLの中に iframe で埋め、操作しながら連写する。
// 枠ごと撮るので、出てきたPNGはそのままスライドのコマとして使える。
//
//   node scripts/capture-demo.mjs <出力先ディレクトリ> [アプリのURL]
//
// 出力: <出力先>/<シーン名>/0000.png ... (シーンごとにディレクトリが分かれる)
//
// 撮影中のアプリは本物のコードだが、lib/claude.ts と lib/supabase/server.ts だけ
// スタブに差し替えてある(課金と本番DBを避けるため)。詳しくは video/README.md。

import { chromium } from "playwright-core";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const OUT = resolve(process.argv[2] || join(ROOT, "out", "demo"));
const APP = process.argv[3] || "http://localhost:3000";

const FPS = 12;              // 連写の目安
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
    flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px;
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
  // iframe のオフセットと拡大を織り込んだ値を返すので、そのまま使える。
  window.__tap = (x, y) => {
    const t = $("tap");
    if (x == null) { t.classList.remove("on"); return; }
    t.style.left = x + "px";
    t.style.top = y + "px";
    t.classList.add("on");
  };
<\/script>
</body></html>`;

// ---------------------------------------------------------------- 撮影

rmSync(OUT, { recursive: true, force: true });
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
const ZOOM = 1.4;
const applyZoom = () => app.locator("html").evaluate((el, z) => { el.style.zoom = String(z); }, ZOOM);

// 連写。シーンの間だけ回す。
let shooting = null;
function startScene(name) {
  const dir = join(OUT, name);
  mkdirSync(dir, { recursive: true });
  let i = 0, stop = false;
  const loop = (async () => {
    while (!stop) {
      const t0 = Date.now();
      try {
        await page.screenshot({ path: join(dir, String(i).padStart(4, "0") + ".png") });
        i += 1;
      } catch { /* 遷移中に撮ろうとした場合。次のコマで撮り直す */ }
      const wait = 1000 / FPS - (Date.now() - t0);
      if (wait > 0) await page.waitForTimeout(wait);
    }
  })();
  shooting = { name, async end() { stop = true; await loop; console.log(`   ${name}: ${i}コマ`); return i; } };
}
async function endScene() {
  if (!shooting) return;
  const s = shooting; shooting = null;
  await s.end();
}

// 枠の中の要素を、シェル座標に直して指し示す
async function tapAt(locator) {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.evaluate(([x, y]) => window.__tap(x, y),
    [box.x + box.width / 2, box.y + box.height / 2]);
}
const untap = () => page.evaluate(() => window.__tap(null));
const caption = (n, t, s) => page.evaluate(([n, t, s]) => window.__cap(n, t, s), [n, t, s]);
const setPath = (p) => page.evaluate((p) => window.__path(p), p);
const wait = (ms) => page.waitForTimeout(ms);

await app.locator(".ingredient-form input").waitFor({ timeout: 30000 });
await applyZoom();
await setPath("/");
await wait(500);

// 各シーンの尺は、台本のナレーションの長さに合わせてある。
// ここを変えるとデモがスロー再生/早送りになるので、chapters/*.yaml と一緒に調整すること。
const scroll = async (dy, steps, ms) => {
  for (let i = 0; i < steps; i++) {
    await app.locator("body").evaluate((b, d) => b.ownerDocument.defaultView.scrollBy(0, d), dy);
    await wait(ms);
  }
};

// ---- 1) 食材を入力する (約10秒) ----
console.log("撮影: input");
await caption(1, "食材を入力する", "ここはまだ、あなたのパソコンの中だけの話");
startScene("input");
await wait(1200);
const box = app.locator("#ingredients");
await box.click();
await wait(400);
await box.pressSequentially("鶏むね肉, 白菜, しょうが", { delay: 200 });
await wait(1200);
await app.locator("#genre").selectOption("和食");
await wait(1600);
await tapAt(app.locator(".ingredient-form button[type=submit]"));
await wait(1600);
await endScene();

// ---- 2) 考案中 (約4秒・画面はほぼ静止) ----
console.log("撮影: thinking");
await caption(2, "サーバーがAIに問い合わせる", "APIキーが使われるのは、この裏側だけ");
startScene("thinking");
await app.locator(".ingredient-form button[type=submit]").click();
await untap();
await wait(3400);
await endScene();

// ---- 3) レシピが返ってくる (約13秒) ----
console.log("撮影: result");
await app.locator(".recipe-result").waitFor({ timeout: 20000 });
await caption(3, "返ってきたJSONを画面に描く", "材料も手順も、AIが考えたもの");
startScene("result");
await wait(1800);
await scroll(24, 40, 90);          // 材料から作り方へ、ゆっくり送る
await wait(1200);
// 材料のチェックを2つ入れて、ただの表示ではないことを見せる
const checks = app.locator(".recipe-ingredients input[type=checkbox]");
for (const i of [0, 1]) {
  await tapAt(checks.nth(i));
  await wait(400);
  await checks.nth(i).click();
  await untap();
  await wait(900);
}
await wait(1000);
await scroll(24, 16, 90);
await wait(1400);
await endScene();

// ---- 4) お気に入りに登録する (約9秒) ----
console.log("撮影: save");
await caption(4, "お気に入りに登録する", "データベースに1行、追加される");
const saveBtn = app.locator(".recipe-result-actions button").first();
await saveBtn.scrollIntoViewIfNeeded();
await wait(400);
startScene("save");
await wait(1400);
await tapAt(saveBtn);
await wait(900);
await saveBtn.click();
await untap();
await app.locator(".recipe-result-actions button", { hasText: "登録しました" }).waitFor({ timeout: 20000 });
await wait(4200);
await endScene();

// ---- 5) お気に入り一覧 (約19秒) ----
console.log("撮影: list");
await caption(5, "保存したものを開く", "ここではAIを呼ばない。倉庫から出すだけ");
const navFav = app.locator(".site-nav a", { hasText: "お気に入り" });
await app.locator("body").evaluate((b) => b.ownerDocument.defaultView.scrollTo(0, 0));
await wait(400);
startScene("list");
await wait(900);
await tapAt(navFav);
await wait(700);
await navFav.click();
await untap();
await setPath("/favorites");
await app.locator(".favorite-list").waitFor({ timeout: 20000 });
await wait(2400);

// 保存したてのレシピを開く
const firstCard = app.locator(".favorite-card-toggle").first();
await tapAt(firstCard);
await wait(600);
await firstCard.click();
await untap();
await wait(2200);
await scroll(24, 30, 90);
await wait(1600);
await scroll(-24, 30, 60);
await wait(1000);

// ジャンルで絞り込む
const jpFilter = app.locator(".genre-filter a", { hasText: "和食" }).first();
await tapAt(jpFilter);
await wait(700);
await jpFilter.click();
await untap();
await setPath("/favorites?genre=和食");
await wait(3200);
await endScene();

await browser.close();
console.log("撮影完了: " + OUT);
