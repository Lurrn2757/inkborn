import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openDrawing, draw, awaken, answer } from './helpers.js';
import { sampleLessons } from '../../shared/samples.js';

mkdirSync('.cache/screenshots', { recursive: true });
const lesson = sampleLessons[0]!;
test('blank drawing is rejected; actual distinct drawings produce distinct creature sprites', async ({ page }) => {
  await openDrawing(page);
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  await expect(page.getByRole('alert')).toContainText('needs a little ink');
  const first = await draw(page, 0);
  await page.screenshot({ path: '.cache/screenshots/binding.png', fullPage: true });
  await page.getByRole('button', { name: /Return to drawing/ }).click();
  await page.getByRole('button', { name: 'Clear drawing' }).click();
  const second = await draw(page, 1);
  expect(second).not.toBe(first);
});
test('genuine sample victory records a correction and two initial successes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'INKBORN', exact: true })).toBeVisible();
  const entry = await page.getByRole('button', { name: /Sample Battle/ }).boundingBox();
  expect(entry && entry.y + entry.height).toBeLessThanOrEqual(900);
  await page.screenshot({ path: '.cache/screenshots/title.png', fullPage: true });
  await openDrawing(page);
  await draw(page);
  await awaken(page);
  for (const [index, concept] of lesson.concepts.entries()) {
    await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
    await expect(page.getByRole('heading', { name: concept.initial.prompt, exact: true })).toBeVisible();
    const initialIndex = concept.initial.options.findIndex(option => option.id === concept.initial.correctOptionId);
    await answer(page, index === 0 ? (initialIndex + 1) % 4 : initialIndex);
    if (index === 0) {
      await expect(page.getByRole('heading', { name: 'The ink grows restless.' })).toBeVisible();
      await expect(page.getByRole('status', { name: /Ritual Integrity: 4 of 5/ })).toBeVisible();
      await expect(page.locator('.ritual-ward.broken')).toHaveCount(1);
      await page.screenshot({ path: '.cache/screenshots/corrupted.png', fullPage: true });
      await page.getByRole('button', { name: /Face the follow-up/ }).click();
      await expect(page.getByRole('heading', { name: concept.followup.prompt, exact: true })).toBeVisible();
      await answer(page, concept.followup.options.findIndex(option => option.id === concept.followup.correctOptionId));
      await expect(page.getByRole('heading', { name: 'Understanding breaks the spell.' })).toBeVisible();
      await expect(page.locator('.ritual-ward.broken')).toHaveCount(1);
      await expect(page.locator('.ritual-consequence')).toContainText('Concept reclaimed');
      await page.screenshot({ path: '.cache/screenshots/recovery.png', fullPage: true });
    }
    await page.getByRole('button', { name: /Continue the encounter/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'The spell is broken.' })).toBeVisible();
  await expect(page.locator('.ending-folio')).toContainText('SCARRED VICTORY');
  await expect(page.locator('.ritual-ward.intact')).toHaveCount(4);
  await page.screenshot({ path: '.cache/screenshots/scarred-victory.png', fullPage: true });
  await page.getByRole('button', { name: /Open the battle record/ }).click();
  await expect(page.getByRole('heading', { name: 'You changed the creature.' })).toBeVisible();
  await expect(page.locator('.result-score')).toContainText('3 / 4');
  await expect(page.locator('.outcome-totals>div').nth(0)).toContainText('2');
  await expect(page.locator('.outcome-totals>div').nth(1)).toContainText('1');
  await expect(page.locator('.outcome-totals>div').nth(2)).toContainText('0');
  await page.locator('.concept-record').first().locator('summary').click();
  await expect(page.locator('.concept-record[open] .question-record')).toHaveCount(2);
  await page.screenshot({ path: '.cache/screenshots/results.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('all unresolved concepts still reach a constructive retreat and accurate results', async ({ page }) => {
  await openDrawing(page);
  await draw(page, 1);
  await awaken(page);
  for (const concept of [...lesson.concepts].reverse()) {
    await page.getByRole('button', { name: `${concept.label}: stable`, exact: true }).click();
    for (const question of [concept.initial, concept.followup]) {
      const correctIndex = question.options.findIndex(option => option.id === question.correctOptionId);
      await answer(page, (correctIndex + 1) % 4);
      const retreat = await page.getByRole('button', { name: /Retreat with your record/ }).count();
      await page.getByRole('button', { name: /Face the follow-up|Continue the encounter|Retreat with your record/ }).click();
      if (retreat) break;
    }
  }
  await expect(page.getByRole('heading', { name: 'The creature withdraws.' })).toBeVisible();
  await expect(page.locator('.ritual-ward.broken')).toHaveCount(5);
  await expect(page.locator('.ending-folio')).toContainText('RETREAT · UNRESOLVED');
  await page.screenshot({ path: '.cache/screenshots/ritual-retreat.png', fullPage: true });
  await page.getByRole('button', { name: /Open the battle record/ }).click();
  await expect(page.getByRole('heading', { name: 'Every mark tells you something.' })).toBeVisible();
  await expect(page.locator('.result-score')).toContainText('0 / 5');
  await expect(page.locator('.outcome-totals>div').nth(2)).toContainText('3');
});
