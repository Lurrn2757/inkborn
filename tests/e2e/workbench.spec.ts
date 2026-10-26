import { test, expect, type Page } from '@playwright/test';
import { openDrawing, draw, awaken } from './helpers.js';
import { sampleLessons } from '../../shared/samples.js';

async function pixels(page: Page) {
  return page.locator('.drawing-canvas').evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext('2d')!;
    const bytes = context.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    for (let i = 3; i < bytes.length; i += 4) if (bytes[i]! > 0) count++;
    return count;
  });
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}
async function dot(page: Page, x = .5, y = .5) {
  await page.locator('.drawing-canvas').scrollIntoViewIfNeeded();
  const box = (await page.locator('.drawing-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
}

test('workbench preserves strokes, erases, branches history and rejects a fully erased creature', async ({ page }) => {
  await openDrawing(page);
  await page.getByRole('button', { name: 'Oxblood', exact: true }).click();
  await dot(page);
  await expect.poll(() => pixels(page)).toBeGreaterThan(0);
  const original = await pixels(page);
  await page.getByRole('button', { name: /Undo/ }).click();
  await expect.poll(() => pixels(page)).toBe(0);
  await page.getByRole('button', { name: /Redo/ }).click();
  await expect.poll(() => pixels(page)).toBe(original);
  await page.getByRole('button', { name: 'Clear drawing' }).click();
  await expect.poll(() => pixels(page)).toBe(0);
  await page.getByRole('button', { name: /Undo/ }).click();
  await expect.poll(() => pixels(page)).toBe(original);
  await page.getByRole('button', { name: /Eraser/, exact: false }).click();
  await page.getByRole('slider', { name: 'Brush size' }).fill('42');
  await dot(page);
  await expect.poll(() => pixels(page)).toBe(0);
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  await expect(page.getByRole('alert')).toContainText('needs a little ink');
  await page.getByRole('button', { name: /Undo/ }).click();
  await expect.poll(() => pixels(page)).toBe(original);
  await page.getByRole('button', { name: 'Verdigris', exact: true }).click();
  await dot(page, .7, .7);
  await expect(page.getByRole('button', { name: /Redo/ })).toBeDisabled();
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  const sprite = page.locator('.binding-sprite img');
  await expect(sprite).toBeVisible();
  expect(await sprite.evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<string>();
    for (let i = 0; i < bytes.length; i += 4) if (bytes[i + 3] === 255) colors.add(`${bytes[i]},${bytes[i + 1]},${bytes[i + 2]}`);
    return colors.has('146,62,85') && colors.has('57,123,119');
  })).toBe(true);
  const crystal = page.getByRole('button', { name: /^Position crystal 1:/ });
  await crystal.focus();
  const before = await crystal.getAttribute('style');
  await page.keyboard.press('ArrowRight');
  expect(await crystal.getAttribute('style')).not.toBe(before);
  await page.getByRole('button', { name: /Reset crystal positions/ }).click();
  await expect(crystal).toHaveAttribute('style', before!);
});

test('sound and motion settings are keyboard accessible and return focus', async ({ page }) => {
  await page.goto('/');
  const settings = page.getByRole('button', { name: 'Sound and motion settings' });
  await settings.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('checkbox', { name: /Mute all sound/ }).check();
  await page.getByRole('slider', { name: 'Sound volume' }).fill('18');
  await page.getByRole('combobox', { name: 'Motion preference' }).selectOption('reduced');
  await page.getByRole('button', { name: /Play a crystal chime/ }).click();
  await expect(page.getByRole('status', { name: 'Sound test feedback' })).toContainText('muted');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(settings).toBeFocused();
  await settings.click();
  await expect(page.getByRole('checkbox', { name: /Mute all sound/ })).toBeChecked();
  await page.getByRole('checkbox', { name: /Mute all sound/ }).uncheck();
  await page.getByRole('button', { name: /Play a crystal chime/ }).click();
  await expect(page.getByRole('status', { name: 'Sound test feedback' })).toContainText('playing');
});

test('graphics initialization failure uses a fresh 2D renderer and retains a genuine playable creature', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await openDrawing(page); await dot(page); // a deliberately sparse silhouette
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  await awaken(page);
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'canvas');
  const concept = sampleLessons[0]!.concepts[0]!;
  await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
  await expect(page.getByRole('heading', { name: concept.initial.prompt, exact: true })).toBeVisible();
  await page.screenshot({ path: '.cache/screenshots/fallback.png', fullPage: true });
});

test('runtime context loss replaces only the graphics surface and keeps the active question', async ({ page }) => {
  await openDrawing(page); await draw(page, 1); await awaken(page);
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'pixi');
  const concept = sampleLessons[0]!.concepts[1]!;
  await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
  const canvas = page.locator('.arena-canvas canvas');
  await canvas.evaluate((element: HTMLCanvasElement) => {
    const gl = element.getContext('webgl2') ?? element.getContext('webgl');
    if (!gl) throw new Error('No active WebGL context to test');
    const extension = gl.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Context-loss extension unavailable');
    extension.loseContext();
  });
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'canvas');
  await expect(page.getByRole('heading', { name: concept.initial.prompt, exact: true })).toBeVisible();
  await expect(page.locator('.answer-option')).toHaveCount(4);
});

for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  test(`authored journey stays readable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/'); await noOverflow(page);
    await page.screenshot({ path: `.cache/screenshots/title-${viewport.width}.png`, fullPage: true });
    await openDrawing(page); await noOverflow(page);
    await page.screenshot({ path: `.cache/screenshots/drawing-${viewport.width}.png`, fullPage: true });
    await draw(page, 1); await noOverflow(page);
    await page.screenshot({ path: `.cache/screenshots/binding-${viewport.width}.png`, fullPage: true });
    await awaken(page);
    const concept = sampleLessons[0]!.concepts[2]!;
    await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
    await expect(page.getByRole('heading', { name: concept.initial.prompt, exact: true })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: `.cache/screenshots/question-${viewport.width}.png`, fullPage: true });
  });
}

test('history compaction keeps old ink while retaining the bounded undo window', async ({ page }) => {
  test.setTimeout(120_000);
  await openDrawing(page);
  await page.getByRole('slider', { name: 'Brush size' }).fill('3');
  for (let index = 0; index < 103; index++) await dot(page, .15 + (index % 16) * .04, .2 + Math.floor(index / 16) * .07);
  const full = await pixels(page);
  expect(full).toBeGreaterThan(500);
  for (let index = 0; index < 100; index++) await page.getByRole('button', { name: /Undo/ }).click();
  await expect(page.getByRole('button', { name: /Undo/ })).toBeDisabled();
  const retained = await pixels(page);
  expect(retained).toBeGreaterThan(0);
  expect(retained).toBeLessThan(full);
  for (let index = 0; index < 100; index++) await page.getByRole('button', { name: /Redo/ }).click();
  await expect.poll(() => pixels(page)).toBe(full);
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  const originalHash = await page.locator('.binding-sprite img').getAttribute('data-sprite-hash');
  await page.getByRole('button', { name: /Return to drawing/ }).click();
  await page.getByRole('button', { name: 'Clear drawing' }).click();
  await expect.poll(() => pixels(page)).toBe(0);
  await page.getByRole('button', { name: /Undo/ }).click();
  await expect.poll(() => pixels(page)).toBeGreaterThan(0);
  // Display antialiasing can change when vectors become a scaled base bitmap.
  // The logical-resolution export must remain byte-for-byte the same creature.
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  await expect(page.locator('.binding-sprite img')).toHaveAttribute('data-sprite-hash', originalHash!);
});

test.describe('touch workbench', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('a touch tap becomes actual visible ink and an adjustable creature', async ({ page }) => {
    await openDrawing(page);
    const box = (await page.locator('.drawing-canvas').boundingBox())!;
    await page.touchscreen.tap(box.x + box.width * .5, box.y + box.height * .5);
    await expect.poll(() => pixels(page)).toBeGreaterThan(0);
    await page.getByRole('button', { name: /Prepare the creature/ }).click();
    await expect(page.locator('.binding-sprite img')).toBeVisible();
    await noOverflow(page);
  });
});

test.describe('high-density drawing surface', () => {
  test.use({ deviceScaleFactor: 2 });
  test('resizing replays ink without changing the exported creature', async ({ page }) => {
    await openDrawing(page);
    const first = await draw(page, 1);
    await page.getByRole('button', { name: /Return to drawing/ }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.locator('.drawing-canvas').evaluate((canvas: HTMLCanvasElement) => Math.abs(canvas.width - canvas.getBoundingClientRect().width * 2))).toBeLessThan(2);
    await expect.poll(() => pixels(page)).toBeGreaterThan(0);
    await page.getByRole('button', { name: /Prepare the creature/ }).click();
    await expect(page.locator('.binding-sprite img')).toHaveAttribute('data-sprite-hash', first!);
    await noOverflow(page);
  });
});

test('unavailable graphics has an in-page retry that preserves the prepared creature', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if ((window as Window & { blockInkbornGraphics?: boolean }).blockInkbornGraphics) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await openDrawing(page); const hash = await draw(page, 1);
  await page.evaluate(() => { (window as Window & { blockInkbornGraphics?: boolean }).blockInkbornGraphics = true; });
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'error');
  await expect(page.getByRole('alert')).toContainText('remain in this page');
  await page.evaluate(() => { (window as Window & { blockInkbornGraphics?: boolean }).blockInkbornGraphics = false; });
  await page.getByRole('button', { name: 'Retry graphics' }).click();
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', /pixi|canvas/);
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-sprite-status', 'ready');
  await page.getByRole('button', { name: /Skip awakening/ }).click();
  await page.getByRole('button', { name: 'INKBORN title screen' }).click();
  await page.getByRole('button', { name: /Continue Battle/ }).click();
  await expect(page.getByRole('heading', { name: 'Confront what you know.' })).toBeVisible();
  expect(hash).toMatch(/^[a-f0-9]{8}$/);
});
