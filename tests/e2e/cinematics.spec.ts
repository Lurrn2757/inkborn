import { test, expect } from '@playwright/test';
import { openDrawing, draw, answer } from './helpers.js';
import { sampleLessons } from '../../shared/samples.js';

test('real awakening, direct crystal selection, corruption, recovery and ink dissolution play through', async ({ page }) => {
  test.setTimeout(120_000);
  await openDrawing(page); await draw(page);
  const sprite = await page.locator('.binding-sprite').evaluate(element => {
    const image = element.querySelector('img')!;
    const crystal = element.querySelector<HTMLElement>('.binding-crystal')!;
    return { width: image.naturalWidth, height: image.naturalHeight, x: parseFloat(crystal.style.left) / 100, y: parseFloat(crystal.style.top) / 100 };
  });
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  const arena = page.locator('.arena-canvas');
  await expect(arena).toHaveAttribute('data-sprite-status', 'ready');
  await expect(arena).toHaveAttribute('data-performance-state', 'awakening');
  await page.waitForTimeout(1500); // capture the actual gathering beat, not a fabricated game outcome
  await page.screenshot({ path: '.cache/screenshots/awakening.png', fullPage: true });
  await expect(page.getByRole('heading', { name: 'Confront what you know.' })).toBeVisible();
  await expect(arena).toHaveAttribute('data-renderer', /pixi|canvas/);
  const box = (await page.locator('.arena-canvas canvas').boundingBox())!;
  const scale = Math.min(box.width * .57 / sprite.width, box.height * .49 / sprite.height);
  await page.mouse.click(box.x + box.width / 2 + (sprite.x - .5) * sprite.width * scale, box.y + box.height * .45 + (sprite.y - .5) * sprite.height * scale);
  const lesson = sampleLessons[0]!;
  const first = lesson.concepts[0]!;
  await expect(page.getByRole('heading', { name: first.initial.prompt, exact: true })).toBeVisible();
  const correct = first.initial.options.findIndex(option => option.id === first.initial.correctOptionId);
  await page.locator('.answer-option').nth((correct + 1) % 4).click();
  await page.getByRole('button', { name: /Cast your answer/ }).click();
  await expect(arena).toHaveAttribute('data-performance-state', /charging|attacking/);
  await page.screenshot({ path: '.cache/screenshots/corruption-impact.png', fullPage: true });
  await page.getByRole('button', { name: /Face the follow-up/ }).click();
  await page.locator('.answer-option').nth(first.followup.options.findIndex(option => option.id === first.followup.correctOptionId)).click();
  await page.getByRole('button', { name: /Cast your answer/ }).click();
  await expect(arena).toHaveAttribute('data-performance-state', /stunned|damage/);
  await page.waitForTimeout(420);
  await page.screenshot({ path: '.cache/screenshots/recovery-impact.png', fullPage: true });
  await page.getByRole('button', { name: /Continue the encounter/ }).click();
  for (const concept of lesson.concepts.slice(1)) {
    await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).focus();
    await page.keyboard.press('Enter');
    const radio = page.getByRole('radio').nth(concept.initial.options.findIndex(option => option.id === concept.initial.correctOptionId));
    await radio.focus(); await page.keyboard.press('Space');
    await page.getByRole('button', { name: /Cast your answer/ }).focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /Continue the encounter/ }).click();
  }
  await expect(arena).toHaveAttribute('data-performance-state', 'defeated');
  await page.waitForTimeout(650);
  await page.screenshot({ path: '.cache/screenshots/ink-dissolution.png', fullPage: true });
  await page.getByRole('button', { name: /Open the battle record/ }).click();
  await expect(page.locator('.result-score')).toContainText('3 / 4');
});

test('reduced motion and a narrow asymmetric creature keep finite battles playable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDrawing(page);
  const box = (await page.locator('.drawing-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width * .12, box.y + box.height * .15); await page.mouse.down();
  await page.mouse.move(box.x + box.width * .15, box.y + box.height * .85, { steps: 14 }); await page.mouse.up();
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-effects', 'reduced');
  await expect(page.getByRole('heading', { name: 'Confront what you know.' })).toBeVisible();
  for (const concept of sampleLessons[0]!.concepts) {
    await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
    await answer(page, concept.initial.options.findIndex(option => option.id === concept.initial.correctOptionId));
    await page.getByRole('button', { name: /Continue the encounter/ }).click();
  }
  await expect(page.locator('.ending-folio')).toContainText('DOMINANT VICTORY');
  await expect(page.locator('.ritual-ward.intact')).toHaveCount(5);
  await page.screenshot({ path: '.cache/screenshots/dominant-victory.png', fullPage: true });
  await page.getByRole('button', { name: /Open the battle record/ }).click();
  await expect(page.locator('.result-score')).toContainText('3 / 3');
});
