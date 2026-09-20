// スライドHTMLを画像に描画する。
//
// 1枚ごとにブラウザを起動すると遅いため、1プロセスで全部描く。
// ページ側の window.__setStep(n) を呼んでから撮ることで、
// 同じスライドの「段階的な表示」や「アニメーションのコマ」を書き出せる。
//
//   node scripts/render.mjs jobs.json
//
// jobs.json: { executablePath, jobs: [ { html, shots: [ { png, step } ] } ] }

import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const spec = JSON.parse(readFileSync(process.argv[2], "utf-8"));

const browser = await chromium.launch({
  executablePath: spec.executablePath || undefined,
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
});

const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});

let done = 0;
const total = spec.jobs.reduce((n, j) => n + j.shots.length, 0);

for (const job of spec.jobs) {
  await page.goto("file://" + job.html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  for (const shot of job.shots) {
    await page.evaluate((s) => window.__setStep(s), shot.step);
    await page.screenshot({ path: shot.png });
    done += 1;
    if (done % 20 === 0 || done === total) {
      process.stdout.write(`   ${done}/${total}\n`);
    }
  }
}

await browser.close();
