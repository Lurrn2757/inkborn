import { expect, type Page } from '@playwright/test';
export async function openDrawing(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: 'INKBORN', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Sample Battle/ }).click();
  await page.getByRole('button', { name: /Draw your creature/ }).click();
  await expect(page.locator('.drawing-canvas')).toBeVisible();
}
export async function draw(page: Page, variant = 0) {
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
export async function awaken(page: Page, renderer: RegExp = /pixi|canvas/) {
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-sprite-status', 'ready');
  await expect(page.locator('.arena-canvas')).toHaveAttribute('data-renderer', renderer);
  await page.getByRole('button', { name: /Skip awakening/ }).click();
  await expect(page.getByRole('heading', { name: 'Confront what you know.' })).toBeVisible();
}
export async function answer(page: Page, optionIndex: number) {
  await page.locator('.answer-option').nth(optionIndex).click();
  await page.getByRole('button', { name: /Cast your answer/ }).dblclick();
  await expect(page.locator('.feedback-folio')).toBeVisible();
  const next = page.getByRole('button', { name: /Face the follow-up|Continue the encounter|Retreat with your record/ });
  await expect(next).toBeEnabled();
}
