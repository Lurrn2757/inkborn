import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 180_000 });
const presets = ['The Cathedral Wraith', 'The Thorn Devourer', 'The Abyssal Oracle'];

async function openQuickDrawing(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Exam Siege', exact: true }).click();
  await page.getByRole('button', { name: /Quick Battle/ }).click();
  await page.getByRole('checkbox', { name: /I confirm every included question/ }).check();
  await page.getByRole('button', { name: /Draw your titan/ }).click();
  await expect(page.getByRole('region', { name: 'Pre-drawn monster bestiary' })).toBeVisible();
  await expect(page.locator('.monster-card')).toHaveCount(3);
}

async function canvasPixels(page: Page) {
  return page.locator('.drawing-canvas').evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let visible = 0, hash = 2166136261;
    for (let index = 0; index < data.length; index++) {
      hash = Math.imul(hash ^ data[index]!, 16777619);
      if (index % 4 === 3 && data[index]! > 16) visible++;
    }
    return { visible, hash: (hash >>> 0).toString(16) };
  });
}

async function usePreset(page: Page, name: string) {
  const before = (await canvasPixels(page)).hash;
  await page.getByRole('button', { name: `Use ${name}`, exact: true }).click();
  await expect.poll(async () => (await canvasPixels(page)).visible).toBeGreaterThan(20_000);
  await expect.poll(async () => (await canvasPixels(page)).hash).not.toBe(before);
}

async function prepare(page: Page) {
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  await expect(page.getByRole('heading', { name: 'Bind the living ink.', exact: true })).toBeVisible();
  const image = page.locator('.rig-sprite img');
  await expect(image).toHaveAttribute('data-sprite-hash', /^[a-f0-9]{8}$/);
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  return { src: (await image.getAttribute('src'))!, hash: (await image.getAttribute('data-sprite-hash'))! };
}

async function awaken(page: Page) {
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  await page.getByRole('button', { name: 'Enter the arena', exact: true }).click();
  await expect(page.locator('.siege-question')).toBeVisible();
}

async function answer(page: Page, option: number) {
  await page.locator('.siege-question .answer-option').nth(option).click();
  await page.getByRole('button', { name: /Commit answer/ }).dblclick();
  await expect(page.locator('.siege-feedback')).toBeVisible();
}

async function next(page: Page) {
  await page.getByRole('button', { name: /Next question/ }).click();
}

async function resume(page: Page) {
  await page.reload();
  await page.getByRole('button', { name: 'Enter Exam Siege', exact: true }).click();
  await page.getByRole('button', { name: /Resume saved examination/ }).click();
}

async function metrics(page: Page) {
  return {
    hp: await page.getByRole('meter', { name: 'Survival potential' }).getAttribute('aria-valuenow'),
    armor: await page.getByRole('progressbar', { name: 'Titan armor remaining' }).getAttribute('aria-valuenow'),
    score: await page.locator('.survival-panel > p').first().textContent(),
    question: await page.locator('.siege-feedback > .eyebrow').textContent(),
  };
}

test('all three detailed presets contain distinct actual pixels, persist through reload, and permit fresh original drawing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openQuickDrawing(page);
  await page.locator('.drawing-canvas').scrollIntoViewIfNeeded();
  const initialBounds = (await page.locator('.drawing-canvas').boundingBox())!;
  await page.mouse.click(initialBounds.x + initialBounds.width * .5, initialBounds.y + initialBounds.height * .5);
  await expect.poll(async () => (await canvasPixels(page)).visible).toBeGreaterThan(0);
  const originalDraft = (await canvasPixels(page)).hash;
  await usePreset(page, presets[0]!);
  await page.getByRole('button', { name: /Restore previous drawing/ }).click();
  await expect.poll(async () => (await canvasPixels(page)).hash).toBe(originalDraft);
  const hashes: string[] = [];
  for (const [index, name] of presets.entries()) {
    await usePreset(page, name);
    if (index === 0) {
      const original = await canvasPixels(page);
      await resume(page);
      await expect(page.locator('.drawing-canvas')).toBeVisible();
      await expect.poll(async () => (await canvasPixels(page)).hash).toBe(original.hash);
    }
    const sprite = await prepare(page);
    const pixels = await page.locator('.rig-sprite img').evaluate((image: HTMLImageElement) => {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = 0, transparent = 0;
      for (let index = 3; index < data.length; index += 4) { if (data[index]! > 16) visible++; else transparent++; }
      return { visible, transparent };
    });
    expect(pixels.visible).toBeGreaterThan(20_000);
    expect(pixels.transparent).toBeGreaterThan(20_000);
    hashes.push(sprite.hash);
    await page.screenshot({ path: `.cache/monster-specials/preset-${index + 1}-binding.png`, fullPage: true });
    await page.getByRole('button', { name: /Return to drawing/ }).click();
    await expect.poll(async () => (await canvasPixels(page)).visible).toBeGreaterThan(20_000);
  }
  expect(new Set(hashes).size).toBe(3);
  await page.getByRole('button', { name: 'Clear drawing', exact: true }).click();
  await expect.poll(async () => (await canvasPixels(page)).visible).toBe(0);
  await page.locator('.drawing-canvas').scrollIntoViewIfNeeded();
  const bounds = (await page.locator('.drawing-canvas').boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .3, bounds.y + bounds.height * .75);
  await page.mouse.down();
  for (const [x, y] of [[.36, .22], [.5, .4], [.7, .2], [.75, .75], [.3, .75]]) await page.mouse.move(bounds.x + bounds.width * x!, bounds.y + bounds.height * y!, { steps: 3 });
  await page.mouse.up();
  const original = await prepare(page);
  expect(hashes).not.toContain(original.hash);
  expect(errors).toEqual([]);
});

test('Sovereign Sigil unlocks from earned passing marks, casts once without changing grading, and stays spent after reload', async ({ page }) => {
  await openQuickDrawing(page);
  await usePreset(page, presets[0]!);
  const sprite = await prepare(page);
  await awaken(page);
  await expect(page.locator('.titan-scene canvas')).toHaveAttribute('data-renderer', 'three');
  await expect(page.locator('.titan-scene canvas')).toHaveAttribute('data-sprite-status', 'ready');
  await expect(page.getByRole('button', { name: /Cast Sovereign Sigil/ })).toHaveCount(0);
  await answer(page, 0); await next(page);
  await answer(page, 3); // 1 + 2 earned marks secures the real 3/10 passing target.
  const special = page.getByRole('button', { name: /Cast Sovereign Sigil/ });
  await expect(special).toBeEnabled();
  const before = await metrics(page);
  expect(before.hp).toBe('100');
  expect(before.score).toContain('Earned score: 3 / 10');
  expect(before.score).toContain('2 correct');
  await special.dblclick();
  await expect(special).toBeDisabled();
  await expect(page.locator('.player-special')).toContainText('SOVEREIGN SIGIL · CAST');
  await expect(page.locator('.titan-attack-label')).toContainText(/SOVEREIGN SIGIL|SIGIL OF CONQUEST/);
  expect(await metrics(page)).toEqual(before);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.screenshot({ path: '.cache/monster-specials/sovereign-sigil-desktop.png', fullPage: true });
  await resume(page);
  await expect(page.getByRole('button', { name: /Cast Sovereign Sigil/ })).toBeDisabled();
  await expect(page.locator('.player-special')).toContainText('SOVEREIGN SIGIL · CAST');
  expect(await metrics(page)).toEqual(before);
  await next(page);
  for (const [index, correct] of [2, 1, 0].entries()) {
    await answer(page, correct);
    if (index < 2) await next(page);
  }
  await page.getByRole('button', { name: /View examination report/ }).click();
  await expect(page.getByRole('heading', { name: 'Crystal Conquest', exact: true })).toBeVisible();
  await expect(page.locator('.performance-emblem')).toContainText('10 / 10 MARKS EARNED');
  await expect(page.locator('.performance-emblem img')).toHaveAttribute('src', sprite.src);
  await expect(page.locator('.performance-emblem img')).toHaveAttribute('data-sprite-hash', sprite.hash);
  await expect(page.locator('.answer-record.correct')).toHaveCount(5);
  await expect(page.locator('.answer-record.incorrect')).toHaveCount(0);
});

test('Eclipse Judgment is a real 3D failure presentation with immediate access to the accurate report', async ({ page }) => {
  await openQuickDrawing(page);
  await usePreset(page, presets[1]!);
  await prepare(page); await awaken(page);
  await expect(page.locator('.titan-scene canvas')).toHaveAttribute('data-renderer', 'three');
  await expect(page.locator('.titan-scene canvas')).toHaveAttribute('data-sprite-status', 'ready');
  for (const [index, wrong] of [1, 0, 0, 0, 1].entries()) {
    await answer(page, wrong);
    if (index < 4) await next(page);
  }
  await expect(page.getByRole('heading', { name: 'Eclipse Judgment.', exact: true })).toBeVisible();
  await expect(page.locator('.titan-attack-label')).toContainText('ECLIPSE JUDGMENT');
  await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveAttribute('aria-valuenow', '0');
  const report = page.getByRole('button', { name: /View examination report/ });
  await expect(report).toBeEnabled();
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.screenshot({ path: '.cache/monster-specials/eclipse-judgment-desktop.png', fullPage: true });
  await report.click();
  await expect(page.getByRole('heading', { name: 'The Shattering', exact: true })).toBeVisible();
  await expect(page.locator('.performance-emblem')).toContainText('0 / 10 MARKS EARNED');
  await expect(page.locator('.answer-record.incorrect')).toHaveCount(5);
  await expect(page.locator('.answer-record.unattempted')).toHaveCount(0);
});

test('the detailed Oracle and one-cast special remain playable in reduced-motion mobile fallback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await openQuickDrawing(page);
  await usePreset(page, presets[2]!);
  const sprite = await prepare(page); await awaken(page);
  await expect(page.locator('.titan-fallback img')).toHaveAttribute('src', sprite.src);
  await answer(page, 0); await next(page); await answer(page, 3);
  const special = page.getByRole('button', { name: /Cast Sovereign Sigil/ });
  await expect(special).toBeEnabled();
  const before = await metrics(page);
  await special.dblclick();
  await expect(special).toBeDisabled();
  expect(await metrics(page)).toEqual(before);
  await expect(page.locator('.player-special')).toContainText('SOVEREIGN SIGIL · CAST');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: '.cache/monster-specials/oracle-special-mobile-fallback.png', fullPage: true });
});
