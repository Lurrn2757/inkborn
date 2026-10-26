import { expect, test, type Page, type BrowserContext } from '@playwright/test';
import { questionBank } from '../../server/arena/questions.js';

test.describe.configure({ timeout: 180_000 });
async function enter(page: Page, name: string) {
  await page.goto('/');
  await page.getByRole('button', { name: /Challenge Another Mind/ }).click();
  await expect(page.locator('.arena-connection')).toContainText('CONNECTED TO ARENA');
  await page.getByLabel('Arena nickname').fill(name);
  await page.getByRole('radio', { name: /Quick Duel/ }).check();
}
async function choose(page: Page, correct = true) {
  await expect(page.locator('.arena-online')).toHaveAttribute('data-arena-phase', 'question');
  const prompt = (await page.locator('.arena-live-question h2').textContent())!;
  const q = questionBank.find(q => q.text === prompt)!;
  expect(q).toBeDefined();
  const text = q.choices.find(c => (c.id === q.correctChoiceId) === correct)!.text;
  const button = page.locator('.arena-answer').filter({ has: page.getByText(text, { exact: true }) });
  await expect(button).toBeEnabled(); await button.click();
}
async function ready(a: Page, b: Page) {
  await a.getByRole('button', { name: /Ready for battle/ }).click();
  await expect(a.locator('.arena-online')).toHaveAttribute('data-arena-phase', 'lobby');
  await b.getByRole('button', { name: /Ready for battle/ }).click();
  await expect(a.locator('.arena-online')).toHaveAttribute('data-arena-phase', 'question', { timeout: 15000 });
  await expect(b.locator('.arena-online')).toHaveAttribute('data-arena-phase', 'question', { timeout: 15000 });
  expect(await a.locator('.arena-live-question h2').textContent()).toBe(await b.locator('.arena-live-question h2').textContent());
}

// Independent browser contexts have independent guest tokens, storage and network sockets.
test('two independent guests play a private duel with actual drawing, backlash, refresh recovery, victory and mutual rematch', async ({ browser }) => {
  const contexts: BrowserContext[] = [];
  const errors: string[] = [];
  try {
    const ca = await browser.newContext({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' }); contexts.push(ca);
    const cb = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' }); contexts.push(cb);
    const a = await ca.newPage(), b = await cb.newPage();
    for (const p of [a,b]) p.on('pageerror', e => errors.push(e.message));
    await enter(a, 'Aster'); await enter(b, 'Bram');
    await a.getByRole('button', { name: /Draw my Arena monster/ }).click();
    const canvas = a.locator('.drawing-canvas'); await canvas.scrollIntoViewIfNeeded(); const box = (await canvas.boundingBox())!;
    await a.mouse.move(box.x + box.width * .27, box.y + box.height * .7); await a.mouse.down();
    for (const [x,y] of [[.3,.2],[.45,.35],[.66,.18],[.75,.7],[.27,.7]]) await a.mouse.move(box.x + box.width * x!, box.y + box.height * y!, { steps: 3 });
    await a.mouse.up(); await a.getByRole('button', { name: /Prepare the creature/ }).click();
    await expect(a.locator('.arena-current-monster img')).toBeVisible();
    await a.getByRole('button', { name: /Create Private Room/ }).click();
    const code = (await a.locator('[aria-label="Current private room code"]').textContent())!;
    await b.getByLabel('Private room code').fill(code); await b.getByRole('button', { name: /Join room/ }).click();
    await expect(a.locator('.arena-player-card')).toHaveCount(2); await expect(b.locator('.arena-player-card')).toHaveCount(2);
    await a.screenshot({ path: 'devpost/evidence/arena-private-room.png', fullPage: true });
    await ready(a,b);
    const tokens = await Promise.all([a.evaluate(() => sessionStorage.getItem('inkborn-arena-guest-v1')), b.evaluate(() => sessionStorage.getItem('inkborn-arena-guest-v1'))]);
    expect(tokens[0]).not.toBe(tokens[1]);
    await expect(a.locator('.arena-stage')).toHaveAttribute('data-sprite-status', 'ready');
    const drawingHash = await a.locator('[data-stage-player]').first().getAttribute('data-monster-hash');
    await choose(a, false); await expect(a.locator('.arena-answer-status')).toContainText('backlash');
    await expect(a.locator('.arena-answer').first()).toBeDisabled();
    await a.reload();
    await a.getByRole('button', { name: /Challenge Another Mind/ }).click();
    await expect(a.locator('.arena-online')).toHaveAttribute('data-arena-phase', 'question', { timeout: 15000 });
    expect(await a.evaluate(() => sessionStorage.getItem('inkborn-arena-guest-v1'))).toBe(tokens[0]);
    await expect(a.locator('[data-stage-player]').first()).toHaveAttribute('data-monster-hash', drawingHash!);
    await expect(a.locator('.arena-answer-status')).toContainText('backlash');
    await choose(b, true);
    await expect(a.locator('.arena-score-number').nth(1)).toHaveText('1');
    await expect(b.locator('.arena-score-number').nth(1)).toHaveText('1');
    await a.screenshot({ path: 'devpost/evidence/arena-authoritative-round.png', fullPage: true });
    await a.getByRole('button', { name: 'Lightweight graphics', exact: true }).click();
    await expect(a.locator('.arena-stage')).toHaveAttribute('data-renderer', 'lightweight');
    await expect(a.locator('.arena-stage img').first()).toHaveAttribute('data-monster-hash', drawingHash!);
    for (let round = 0; round < 2; round++) { await choose(b, true); if (round === 0) await expect(b.locator('.arena-score-number').nth(1)).toHaveText('2'); }
    await expect(a.locator('.arena-match-ending')).toContainText('Bram prevails');
    await expect(b.locator('.arena-match-ending')).toContainText('Your mind prevails');
    await expect(a.locator('.arena-final-score')).toHaveText('0 : 3');
    await expect(a.locator('.arena-history-round')).toHaveCount(3);
    await a.screenshot({ path: 'devpost/evidence/arena-duel-result.png', fullPage: true });
    await a.getByRole('button', { name: /Accept rematch/ }).click();
    await expect(a.locator('.arena-online')).toHaveAttribute('data-arena-phase', 'completed');
    await b.getByRole('button', { name: /Accept rematch/ }).click();
    await expect(a.locator('.arena-online')).toHaveAttribute('data-arena-phase', 'intro');
    await expect(a.locator('.arena-score-number').first()).toHaveText('0');
    await expect(a.locator('.arena-score-number').nth(1)).toHaveText('0');
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});

test('real Quick Match waits, cancels, pairs two sessions and resolves an expired disconnect as a forfeit', async ({ browser }) => {
  const ca = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }), cb = await browser.newContext({ reducedMotion: 'reduce' });
  try {
    const a = await ca.newPage(), b = await cb.newPage(); await enter(a,'Mira'); await enter(b,'Nox');
    await a.getByRole('button', { name: /Quick Match/ }).click(); await expect(a.locator('.arena-online')).toHaveAttribute('data-arena-phase','queue');
    await a.getByRole('button', { name: /Cancel Quick Match/ }).click(); await expect(a.locator('.arena-online')).toHaveAttribute('data-arena-phase','lobby');
    await a.getByRole('button', { name: /Quick Match/ }).click(); await b.getByRole('button', { name: /Quick Match/ }).click();
    await expect(a.locator('.arena-room-banner')).toContainText('A challenger has arrived');
    await expect(b.locator('.arena-room-banner')).toContainText('A challenger has arrived');
    await ready(a,b);
    expect(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await a.screenshot({ path: 'devpost/evidence/arena-mobile-question.png', fullPage: true });
    await ca.setOffline(true); await expect(b.locator('.arena-online')).toHaveAttribute('data-arena-phase','paused',{ timeout: 25000 });
    await expect(b.locator('.arena-match-ending')).toContainText('FORFEIT',{ timeout: 30000 });
    await expect(b.locator('.arena-final-score')).toHaveText('0 : 0');
    await expect(b.locator('.arena-history-round')).toHaveCount(1);
  } finally { await ca.close(); await cb.close(); }
});

test('bad room codes and an unavailable backend disclose errors without inventing a rival', async ({ page }) => {
  await enter(page,'Lumen'); await page.getByLabel('Private room code').fill('AAAAAA'); await page.getByRole('button',{name:/Join room/}).click();
  await expect(page.getByRole('alert')).toContainText('No active room');
  await page.getByRole('button',{name:/Return to INKBORN/}).click();
  await page.context().setOffline(true);
  await page.getByRole('button',{name:/Challenge Another Mind/}).click();
  await expect(page.locator('.arena-connection')).toContainText('UNAVAILABLE',{timeout:20000});
  await expect(page.locator('.arena-online')).toContainText('No opponent');
});
