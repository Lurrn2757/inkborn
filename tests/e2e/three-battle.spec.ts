import { expect, test } from '@playwright/test';
import { sampleLessons } from '../../shared/samples.js';
import { answer, awaken, draw, openDrawing } from './helpers.js';

// Includes several real WebGL context startups; software rendering can be slow.
test.describe.configure({ timeout: 120_000 });

test('opt-in 3D keeps the actual drawing, direct crystals, recovery, evidence and battle record', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await openDrawing(page, '/?renderer=three');
  const hash = await draw(page, 1);
  const sprite = await page.locator('.binding-sprite').evaluate(element => {
    const image = element.querySelector('img')!, anchor = element.querySelector<HTMLElement>('.binding-crystal')!;
    return { src: image.src, width: image.naturalWidth, height: image.naturalHeight, x: parseFloat(anchor.style.left) / 100, y: parseFloat(anchor.style.top) / 100 };
  });
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  const arena = page.locator('.arena-canvas');
  await expect(arena).toHaveAttribute('data-renderer', 'three');
  await expect(arena).toHaveAttribute('data-performance-state', 'awakening');
  await expect(page.getByRole('heading', { name: 'Confront what you know.' })).toBeVisible();
  const bounds = (await page.locator('.arena-canvas canvas').boundingBox())!;
  const scale = Math.min(bounds.width * .57 / sprite.width, bounds.height * .49 / sprite.height);
  await page.mouse.click(bounds.x + bounds.width / 2 + (sprite.x - .5) * sprite.width * scale, bounds.y + bounds.height * .45 + (sprite.y - .5) * sprite.height * scale);
  const lesson = sampleLessons[0]!, first = lesson.concepts[0]!;
  await expect(page.getByRole('heading', { name: first.initial.prompt, exact: true })).toBeVisible();
  await answer(page, first.initial.options.findIndex(option => option.id !== first.initial.correctOptionId));
  await expect(page.locator('.evidence')).toBeVisible();
  await expect(page.locator('.ritual-ward.broken')).toHaveCount(1);
  await page.getByRole('button', { name: /Face the follow-up/ }).click();
  await answer(page, first.followup.options.findIndex(option => option.id === first.followup.correctOptionId));
  await page.getByRole('button', { name: /Continue the encounter/ }).click();
  for (const concept of lesson.concepts.slice(1)) {
    const control = page.getByRole('button', { name: `${concept.label}: stable`, exact: true });
    await control.focus(); await page.keyboard.press('Enter');
    const radio = page.getByRole('radio').nth(concept.initial.options.findIndex(option => option.id === concept.initial.correctOptionId));
    await radio.focus(); await page.keyboard.press('Space');
    await page.getByRole('button', { name: /Cast your answer/ }).click();
    await page.getByRole('button', { name: /Continue the encounter/ }).click();
  }
  await expect(arena).toHaveAttribute('data-performance-state', 'defeated');
  await expect(page.locator('.ending-folio')).toContainText('SCARRED VICTORY');
  await page.waitForTimeout(700);
  await page.screenshot({ path: '.cache/three-evaluation/actual-battle-victory.png', fullPage: true });
  await page.getByRole('button', { name: /Open the battle record/ }).click();
  await expect(page.locator('.result-score')).toContainText('3 / 4');
  await expect(page.locator('.portrait-frame img')).toHaveAttribute('data-sprite-hash', hash!);
  await expect(page.locator('.portrait-frame img')).toHaveAttribute('src', sprite.src);
  expect(errors).toEqual([]);
});

test('3D context loss and explicit return to standard visuals preserve an active question and selected answer', async ({ page }) => {
  await openDrawing(page, '/?renderer=three'); await draw(page); await awaken(page, /three/);
  const concept = sampleLessons[0]!.concepts[1]!;
  await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
  await page.getByRole('radio').nth(2).check();
  const oldCanvas = await page.locator('.arena-canvas canvas').elementHandle();
  await oldCanvas!.evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2')!;
    gl.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'pixi');
  expect(await oldCanvas!.evaluate(canvas => canvas.isConnected)).toBe(false);
  await expect(page.getByRole('heading', { name: concept.initial.prompt, exact: true })).toBeVisible();
  await expect(page.getByRole('radio').nth(2)).toBeChecked();
  await page.getByRole('button', { name: /Use standard visuals/ }).click();
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'pixi');
  await expect(page.getByRole('radio').nth(2)).toBeChecked();
  await expect(page.locator('.ritual-ward.intact')).toHaveCount(5);
});

test('a 3D initialization failure tries PixiJS, then a fresh Canvas, keeping reduced-motion mobile play', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await openDrawing(page, '/?renderer=three'); await draw(page, 1); await awaken(page, /canvas/);
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-effects', 'reduced');
  const concept = sampleLessons[0]!.concepts[0]!;
  await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
  await answer(page, concept.initial.options.findIndex(option => option.id === concept.initial.correctOptionId));
  await expect(page.getByRole('button', { name: `${concept.label}: shattered`, exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('failure confined to the Three.js surface recovers to PixiJS without starting a new battle', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    const denied = new WeakSet<HTMLCanvasElement>();
    let first = true;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) { if (first) { denied.add(this); first = false; } if (denied.has(this)) return null; }
      return original.apply(this, args);
    } as typeof original;
  });
  await openDrawing(page, '/?renderer=three'); await draw(page, 1); await awaken(page, /pixi/);
  const concept = sampleLessons[0]!.concepts[0]!;
  await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
  await expect(page.getByRole('heading', { name: concept.initial.prompt, exact: true })).toBeVisible();
  await expect(page.locator('.ritual-ward.intact')).toHaveCount(5);
});

test('the normal battle retains PixiJS and never downloads the 3D module', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await openDrawing(page); await draw(page); await awaken(page);
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'pixi');
  expect(requests.filter(url => /ThreeArena|threeChamber/.test(url))).toEqual([]);
  await expect(page.getByRole('button', { name: /Use standard visuals/ })).toHaveCount(0);
});

test('switching from 3D after a strike does not replay the committed presentation or break navigation persistence', async ({ page }) => {
  await openDrawing(page, '/?renderer=three'); await draw(page, 1); await awaken(page, /three/);
  const concept = sampleLessons[0]!.concepts[0]!;
  await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
  await answer(page, concept.initial.options.findIndex(option => option.id !== concept.initial.correctOptionId));
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-performance-state', 'enraged');
  await page.getByRole('button', { name: /Use standard visuals/ }).click();
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'pixi');
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-performance-state', 'enraged');
  await expect(page.locator('.ritual-ward.broken')).toHaveCount(1);
  await page.getByRole('button', { name: /INKBORN title screen/ }).click();
  await page.getByRole('button', { name: /Continue Battle/ }).click();
  await expect(page.locator('.feedback-folio')).toBeVisible();
  await expect(page.locator('.ritual-ward.broken')).toHaveCount(1);
  await page.getByRole('button', { name: /Face the follow-up/ }).click();
  await expect(page.getByRole('heading', { name: concept.followup.prompt, exact: true })).toBeVisible();
});

test('mobile 3D keeps a narrow drawing playable and stops ambient movement under reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDrawing(page, '/?renderer=three');
  await page.locator('.drawing-canvas').scrollIntoViewIfNeeded();
  const bounds = (await page.locator('.drawing-canvas').boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .46, bounds.y + bounds.height * .12); await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .86, { steps: 20 }); await page.mouse.up();
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'three');
  await expect(page.getByRole('heading', { name: 'Confront what you know.' })).toBeVisible();
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-effects', 'reduced');
  const toggle = page.getByRole('button', { name: /Use standard visuals/ });
  const toggleBounds = (await toggle.boundingBox())!;
  const wards = (await page.locator('.ritual-integrity').boundingBox())!;
  expect(toggleBounds.y).toBeGreaterThan(wards.y + wards.height);
  const canvas = page.locator('.arena-canvas canvas');
  const still = await canvas.screenshot();
  await page.waitForTimeout(350);
  expect(await canvas.screenshot()).toEqual(still);
  const concept = sampleLessons[0]!.concepts[0]!;
  await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
  await answer(page, concept.initial.options.findIndex(option => option.id === concept.initial.correctOptionId));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await toggle.click();
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'pixi');
  await expect(page.locator('.feedback-folio')).toBeVisible();
});
