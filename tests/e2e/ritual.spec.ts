import { test, expect } from '@playwright/test';
import { openDrawing, draw, awaken, answer } from './helpers.js';
import { sampleLessons } from '../../shared/samples.js';

test('mobile reduced-motion Canvas battle preserves scars and unresolved feedback through a retreat with wards remaining', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await openDrawing(page);
  await draw(page, 1);
  await awaken(page);
  const lesson = sampleLessons[0]!;
  const first = lesson.concepts[0]!;
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', 'canvas');
  await expect(page.locator('.ritual-ward.intact')).toHaveCount(5);
  await page.getByRole('button', { name: `${first.label}: stable`, exact: true }).click();
  await answer(page, first.initial.options.findIndex(option => option.id !== first.initial.correctOptionId));
  await expect(page.locator('.ritual-ward.broken')).toHaveCount(1);
  await expect(page.locator('.ritual-consequence')).toContainText('4 of 5 remain');
  await expect(page.getByRole('button', { name: `${first.label}: corrupted`, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /Face the follow-up/ }).click();
  await answer(page, first.followup.options.findIndex(option => option.id !== first.followup.correctOptionId));
  await expect(page.locator('.ritual-ward.broken')).toHaveCount(2);
  await expect(page.locator('.ritual-consequence')).toContainText('crystal is unresolved');
  await expect(page.locator('.battle-layout')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: /Continue the encounter/ }).click();
  for (const concept of lesson.concepts.slice(1)) {
    await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
    await answer(page, concept.initial.options.findIndex(option => option.id === concept.initial.correctOptionId));
    await expect(page.getByRole('button', { name: `${concept.label}: shattered`, exact: true })).toBeDisabled();
    await page.getByRole('button', { name: /Continue the encounter/ }).click();
  }
  await expect(page.locator('.ending-folio')).toContainText('RETREAT · UNRESOLVED');
  await expect(page.locator('.ending-integrity')).toContainText('3 / 5 seals intact');
  await expect(page.locator('.ritual-ward.intact')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: '.cache/screenshots/ritual-mobile-retreat.png', fullPage: true });
  await page.getByRole('button', { name: /Open the battle record/ }).click();
  await expect(page.locator('.result-score')).toContainText('2 / 4');
  await expect(page.locator('.record-integrity')).toContainText('3 / 5 ritual seals intact');
});
