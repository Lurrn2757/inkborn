import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { sampleLessons } from '../../shared/samples';
import { openDrawing, draw, awaken } from './helpers';

test.describe.configure({ timeout: 180_000 });
async function siege(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Exam Siege', exact: true }).click();
  await page.getByRole('button', { name: /Quick Battle/ }).click();
  await page.getByRole('checkbox', { name: /I confirm every included question/ }).check();
  await page.getByRole('button', { name: /Draw your titan/ }).click();
  await page.locator('.drawing-canvas').scrollIntoViewIfNeeded();
  const b = (await page.locator('.drawing-canvas').boundingBox())!;
  // An intentionally irregular, anatomically unriggable scribble; no substituted artwork.
  await page.mouse.move(b.x + b.width * .2, b.y + b.height * .6); await page.mouse.down();
  for (let i = 0; i < 28; i++) await page.mouse.move(b.x + b.width * (.5 + Math.sin(i * 1.7) * .29), b.y + b.height * (.5 + Math.cos(i * 2.3) * .28), { steps: 2 });
  await page.mouse.up();
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  const hash = (await page.locator('.rig-sprite img').getAttribute('data-sprite-hash'))!;
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  await page.getByRole('button', { name: 'Enter the arena', exact: true }).click();
  await expect(page.locator('.titan-scene canvas')).toHaveAttribute('data-sprite-status', 'ready');
  return hash;
}
async function grade(page: Page) { return { hp: await page.getByRole('meter', { name: 'Survival potential' }).getAttribute('aria-valuenow'), text: await page.locator('.survival-panel>p').first().textContent() }; }

test('five real engine attacks preserve exact marks across resizing, fullscreen, fallback and reload', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /shader|program|GL_INVALID/.test(message.text())) errors.push(message.text()); });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const hash = await siege(page);
  const canvas = page.locator('.titan-scene canvas');
  await expect(canvas).toHaveAttribute('data-sprite-hash', hash);
  for (const [width, height] of [[1920, 1080], [1600, 900], [1366, 768], [390, 844]]) {
    await page.setViewportSize({ width: width!, height: height! });
    const surface = page.locator('.logical-surface');
    await expect.poll(async () => { const b = (await surface.boundingBox())!; return b.width / b.height; }).toBeCloseTo(16 / 9, 2);
    await expect(canvas).toHaveAttribute('data-logical-width', '1920');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `devpost/evidence/boss-${width}x${height}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1600, height: 900 });
  const fullscreen = page.getByRole('button', { name: 'Fullscreen battle', exact: true });
  if (await fullscreen.count()) {
    await fullscreen.click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await expect(page.locator('.siege-question')).toBeVisible();
    await page.getByRole('button', { name: 'Exit fullscreen battle', exact: true }).click();
  }
  const attacks = ['slam', 'storm', 'beam', 'sweep', 'final'];
  const names = ['ABYSSAL SLAM', 'SHARD TEMPEST', 'FRACTURED BEAM', 'INKBORN’S WRATH', 'THE LAST RECKONING'];
  for (const [index, wrong] of [1, 0, 0, 0, 1].entries()) {
    await page.evaluate(expected => {
      const canvas = document.querySelector<HTMLCanvasElement>('.titan-scene canvas')!;
      const captured = window as typeof window & { inkbornMoveFrame?: { dataUrl: string; phase: string } };
      delete captured.inkbornMoveFrame;
      const observer = new MutationObserver(() => {
        if (canvas.dataset.attack !== expected) return;
        const phase = canvas.dataset.phase!;
        if (phase === 'action' || phase === 'impact' || phase === 'recovery' && !captured.inkbornMoveFrame) {
          captured.inkbornMoveFrame = { dataUrl: canvas.toDataURL('image/png'), phase };
        }
        if (phase === 'impact' || phase === 'recovery') observer.disconnect();
      });
      observer.observe(canvas, { attributes: true, attributeFilter: ['data-phase'] });
    }, attacks[index]!);
    await page.locator('.siege-question .answer-option').nth(wrong).click();
    await page.getByRole('button', { name: /Commit answer/ }).dblclick();
    await expect(canvas).toHaveAttribute('data-attack', attacks[index]!);
    await expect(page.locator('.titan-attack-label')).toContainText(names[index]!);
    const committed = await grade(page);
    expect(committed.hp).toBe(`${[90, 70, 60, 40, 0][index]}`);
    await page.waitForTimeout(1250);
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await page.screenshot({ path: `devpost/evidence/boss-${attacks[index]}.png`, fullPage: true });
    const captured = await page.evaluate(() => (window as typeof window & { inkbornMoveFrame?: { dataUrl: string; phase: string } }).inkbornMoveFrame);
    expect(captured?.dataUrl).toMatch(/^data:image\/png;base64,/);
    await writeFile(`devpost/evidence/boss-${attacks[index]}-release.png`, Buffer.from(captured!.dataUrl.split(',')[1]!, 'base64'));
    await test.info().attach(`${attacks[index]}-frame-phase.json`, { body: JSON.stringify({ event: attacks[index], phase: captured!.phase, realBrowserFrame: true }), contentType: 'application/json' });
    if (index < 4) { await page.getByRole('button', { name: /Next question/ }).click(); expect(await grade(page)).toEqual(committed); }
  }
  const finalGrade = await grade(page);
  await page.getByRole('button', { name: 'Lightweight graphics', exact: true }).click();
  await expect(page.locator('.titan-fallback img')).toHaveAttribute('data-sprite-hash', hash);
  expect(await grade(page)).toEqual(finalGrade);
  await page.getByRole('button', { name: 'Retry 3D graphics', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-sprite-hash', hash);
  expect(await grade(page)).toEqual(finalGrade);
  await page.reload();
  await page.getByRole('button', { name: 'Enter Exam Siege', exact: true }).click();
  await page.getByRole('button', { name: /Resume saved examination/ }).click();
  expect(await grade(page)).toEqual(finalGrade);
  await page.getByRole('button', { name: /View examination report/ }).click();
  await expect(page.locator('.answer-record.incorrect')).toHaveCount(5);
  await expect(page.locator('.siege-report')).toContainText('0 / 10 MARKS EARNED');
  expect(errors).toEqual([]);
});

test('logical crystal hit regions stay aligned after resizing in Pixi and Canvas', async ({ page }) => {
  for (const fallback of [false, true]) {
    if (fallback) await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) { return String(args[0]).includes('webgl') ? null : original.apply(this, args); } as typeof original;
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDrawing(page); await draw(page, 1);
    const sprite = await page.locator('.binding-sprite').evaluate(element => { const img = element.querySelector('img')!, anchor = element.querySelector<HTMLElement>('.binding-crystal')!; return { width: img.naturalWidth, height: img.naturalHeight, x: parseFloat(anchor.style.left) / 100, y: parseFloat(anchor.style.top) / 100 }; });
    await awaken(page, fallback ? /canvas/ : /pixi/);
    await page.setViewportSize({ width: 1366, height: 768 });
    const canvas = page.locator('.arena-canvas canvas'), bounds = (await canvas.boundingBox())!;
    expect(bounds.width / bounds.height).toBeCloseTo(16 / 9, 2);
    const scale = Math.min(bounds.width * .57 / sprite.width, bounds.height * .49 / sprite.height);
    await page.mouse.click(bounds.x + bounds.width / 2 + (sprite.x - .5) * sprite.width * scale, bounds.y + bounds.height * .45 + (sprite.y - .5) * sprite.height * scale);
    await expect(page.getByRole('heading', { name: sampleLessons[0]!.concepts[0]!.initial.prompt, exact: true })).toBeVisible();
  }
});

test('a recognizable anchored creature survives reload and reaches actual ink dissolution with perfect marks', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Exam Siege', exact: true }).click();
  await page.getByRole('button', { name: /Quick Battle/ }).click();
  await page.getByRole('checkbox', { name: /I confirm every included question/ }).check();
  await page.getByRole('button', { name: /Draw your titan/ }).click();
  await page.locator('.drawing-canvas').scrollIntoViewIfNeeded();
  const b = (await page.locator('.drawing-canvas').boundingBox())!;
  const stroke = async (points: number[][]) => {
    await page.mouse.move(b.x + b.width * points[0]![0]!, b.y + b.height * points[0]![1]!); await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(b.x + b.width * p[0]!, b.y + b.height * p[1]!, { steps: 4 });
    await page.mouse.up();
  };
  await stroke([[.29,.72],[.31,.23],[.43,.35],[.64,.19],[.72,.7],[.29,.72]]);
  await stroke([[.31,.44],[.18,.38],[.12,.6]]); await stroke([[.68,.44],[.82,.35],[.9,.59]]);
  await stroke([[.43,.54],[.51,.59],[.6,.53]]);
  for (const x of [.43,.59]) await page.mouse.click(b.x + b.width * x, b.y + b.height * .44);
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  const hash = (await page.locator('.rig-sprite img').getAttribute('data-sprite-hash'))!;
  await page.getByRole('checkbox', { name: 'Mark optional shoulder and hand anchors', exact: true }).check();
  await page.getByRole('slider', { name: 'leftShoulder x', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await page.screenshot({ path: 'devpost/evidence/boss-recognizable-rig.png', fullPage: true });
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  await page.getByRole('button', { name: 'Enter the arena', exact: true }).click();
  await expect(page.locator('.titan-scene canvas')).toHaveAttribute('data-sprite-hash', hash);
  await page.screenshot({ path: 'devpost/evidence/boss-recognizable-creature.png', fullPage: true });
  await page.reload(); await page.getByRole('button', { name: 'Enter Exam Siege', exact: true }).click();
  await page.getByRole('button', { name: /Resume saved examination/ }).click();
  await expect(page.locator('.titan-scene canvas')).toHaveAttribute('data-sprite-hash', hash);
  // Capture a real rendered frame before compositing clears WebGL's drawing buffer.
  // This observes a naturally earned ending; it never supplies game or animation state.
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.titan-scene canvas')!;
    const captured = window as typeof window & { inkbornDefeatFrame?: string };
    const observer = new MutationObserver(() => {
      const dissolve = Number(canvas.dataset.dissolve);
      if (canvas.dataset.attack === 'victory' && dissolve > .15 && dissolve < .85) {
        captured.inkbornDefeatFrame = canvas.toDataURL('image/png'); observer.disconnect();
      }
    });
    observer.observe(canvas, { attributes: true, attributeFilter: ['data-dissolve'] });
  });
  for (const [index, correct] of [0,3,2,1,0].entries()) {
    await page.locator('.siege-question .answer-option').nth(correct).click();
    await page.getByRole('button', { name: /Commit answer/ }).dblclick();
    await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveAttribute('aria-valuenow', '100');
    if (index < 4) await page.getByRole('button', { name: /Next question/ }).click();
  }
  await expect(page.locator('.titan-scene canvas')).toHaveAttribute('data-attack', 'victory');
  await page.waitForTimeout(1900);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.screenshot({ path: 'devpost/evidence/boss-perfect-ending.png', fullPage: true });
  const captured = await page.evaluate(() => (window as typeof window & { inkbornDefeatFrame?: string }).inkbornDefeatFrame);
  expect(captured).toMatch(/^data:image\/png;base64,/);
  await writeFile('devpost/evidence/boss-ink-dissolution.png', Buffer.from(captured!.split(',')[1]!, 'base64'));
  await page.getByRole('button', { name: /View examination report/ }).click();
  await expect(page.locator('.siege-report')).toContainText('10 / 10 MARKS EARNED');
  await expect(page.locator('.answer-record.correct')).toHaveCount(5);
  await expect(page.locator('.performance-emblem img')).toHaveAttribute('data-sprite-hash', hash);
  expect(errors).toEqual([]);
});
