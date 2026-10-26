/* global window */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Start Vite separately: npm exec -- vite --port 5174
process.env.PLAYWRIGHT_BROWSERS_PATH ??= fileURLToPath(new URL('../.cache/playwright', import.meta.url));
const { chromium } = await import('@playwright/test');
const output = fileURLToPath(new URL('../.cache/three-evaluation/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const sourceHashes = {};
for (const path of ['src/rendering/ThreeArena.ts', 'src/creative/threeChamber.ts', 'src/rendering/PixiArena.ts', 'src/rendering/motion.ts', 'experiments/battle-3d.ts']) {
  sourceHashes[path] = createHash('sha256').update(await readFile(new URL(`../${path}`, import.meta.url))).digest('hex');
}
const report = { date: new Date().toISOString(), browser: browser.version(), sourceHashes, results: [], errors: [] };
try {
  for (const device of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 },
    { name: 'mobile-dpr1', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
    { name: 'mobile-dpr2', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
  ]) {
    const context = await browser.newContext(device);
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    await page.goto(`${process.env.STUDY_URL ?? 'http://127.0.0.1:5174'}/experiments/battle-3d.html`);
    await page.waitForFunction(() => Boolean(window.chamberStudy));
    // Three paired rounds alternate order to reduce warm-up / ordering bias.
    for (let round = 0; round < 3; round++) {
      for (const renderer of round % 2 ? ['three', 'pixi'] : ['pixi', 'three']) {
        const result = await page.evaluate(async ({ renderer, seconds }) => window.chamberStudy.benchmark(renderer, seconds), { renderer, seconds: Number(process.env.STUDY_SECONDS ?? 6) });
        report.results.push({ device: device.name, round, ...result });
        console.log(JSON.stringify(report.results.at(-1)));
      }
    }
    for (const renderer of ['pixi', 'three']) {
      report.results.push({ device: device.name, round: 'reduced', ...await page.evaluate(renderer => window.chamberStudy.benchmark(renderer, 4, true), renderer) });
      await page.evaluate(renderer => window.chamberStudy.show(renderer, 'battle', 3), renderer);
      await page.locator('#arena').screenshot({ path: `${output}/${device.name}-${renderer}.png` });
    }
    await page.evaluate(() => window.chamberStudy.destroy());
    await context.close();
  }
} finally {
  await writeFile(`${output}/benchmark.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
if (report.errors.length) { console.error(report.errors); process.exitCode = 1; }
