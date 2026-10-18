import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { sampleLessons } from '../../shared/samples.js';

mkdirSync('.cache/screenshots', { recursive: true });
const lesson = sampleLessons[0]!;
async function openDrawing(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'INKBORN', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Sample Battle/ }).click();
  await page.getByRole('button', { name: /Draw your creature/ }).click();
  await expect(page.locator('.drawing-canvas')).toBeVisible();
}
async function draw(page: Page, variant = 0) {
  const bounds = await page.locator('.drawing-canvas').boundingBox();
  if (!bounds) throw new Error('Drawing surface has no usable bounds.');
  const points = variant === 0
    ? Array.from({ length: 40 }, (_, index) => { const angle = index / 39 * Math.PI * 2; return { x: 0.5 + Math.cos(angle) * .24, y: 0.5 + Math.sin(angle) * .27 }; })
    : [{ x: .25, y: .72 }, { x: .34, y: .2 }, { x: .5, y: .38 }, { x: .73, y: .15 }, { x: .78, y: .73 }, { x: .25, y: .72 }];
  const first = points[0]!;
  await page.mouse.move(bounds.x + bounds.width * first.x, bounds.y + bounds.height * first.y);
  await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(bounds.x + bounds.width * point.x, bounds.y + bounds.height * point.y, { steps: 2 });
  await page.mouse.up();
  if (variant === 0) {
    for (const eye of [.42, .58]) {
      await page.mouse.click(bounds.x + bounds.width * eye, bounds.y + bounds.height * .45);
    }
    await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + bounds.height * .58);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .63, { steps: 4 });
    await page.mouse.move(bounds.x + bounds.width * .6, bounds.y + bounds.height * .58, { steps: 4 });
    await page.mouse.up();
  }
  await expect(page.getByRole('button', { name: /Undo/ })).toBeEnabled();
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  await expect(page.getByRole('button', { name: /Awaken my creature/ })).toBeVisible();
  const hash = await page.locator('.binding-sprite img').getAttribute('data-sprite-hash');
  expect(hash).toMatch(/^[a-f0-9]{8}$/);
  return hash;
}
async function awaken(page: Page) {
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-sprite-status', 'ready');
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', /pixi|canvas/);
  await page.getByRole('button', { name: /Skip awakening/ }).click();
  await expect(page.getByRole('heading', { name: 'Confront what you know.' })).toBeVisible();
}
async function answer(page: Page, optionIndex: number) {
  await page.locator('.answer-option').nth(optionIndex).click();
  await page.getByRole('button', { name: /Cast your answer/ }).dblclick();
  await expect(page.locator('.feedback-folio')).toBeVisible();
  const next = page.getByRole('button', { name: /Face the follow-up|Continue the encounter/ });
  await expect(next).toBeEnabled();
}
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
      await page.screenshot({ path: '.cache/screenshots/corrupted.png', fullPage: true });
      await page.getByRole('button', { name: /Face the follow-up/ }).click();
      await expect(page.getByRole('heading', { name: concept.followup.prompt, exact: true })).toBeVisible();
      await answer(page, concept.followup.options.findIndex(option => option.id === concept.followup.correctOptionId));
      await expect(page.getByRole('heading', { name: 'Understanding breaks the spell.' })).toBeVisible();
      await page.screenshot({ path: '.cache/screenshots/recovery.png', fullPage: true });
    }
    await page.getByRole('button', { name: /Continue the encounter/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'The spell is broken.' })).toBeVisible();
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
      await page.getByRole('button', { name: /Face the follow-up|Continue the encounter/ }).click();
    }
  }
  await expect(page.getByRole('heading', { name: 'The creature withdraws.' })).toBeVisible();
  await page.getByRole('button', { name: /Open the battle record/ }).click();
  await expect(page.getByRole('heading', { name: 'Every mark tells you something.' })).toBeVisible();
  await expect(page.locator('.result-score')).toContainText('0 / 6');
  await expect(page.locator('.outcome-totals>div').nth(2)).toContainText('3');
});
