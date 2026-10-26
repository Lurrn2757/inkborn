import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Real production UI and pointer strokes; no injected answer state or fake outcomes.
test.describe.configure({ timeout: 180_000 });

async function enterSiege(page: Page, captureTitle = false) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Enter Exam Siege', exact: true })).toBeVisible();
  if (captureTitle) await page.screenshot({ path: '.cache/exam-siege/title-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Enter Exam Siege', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prepare the examination.', exact: true })).toBeVisible();
}

async function confirmAndDraw(page: Page) {
  await expect(page.getByRole('heading', { name: 'Review the paper.', exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: /I confirm every included question/ }).check();
  await page.getByRole('button', { name: /Draw your titan/ }).click();
  const canvas = page.locator('.drawing-canvas');
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  // Asymmetric ears, round body, two eyes: a fresh recognizable original input.
  const points = [[.24, .7], [.3, .21], [.43, .37], [.63, .17], [.76, .67], [.57, .76], [.24, .7]];
  const first = points[0]!;
  await page.mouse.move(bounds.x + bounds.width * first[0]!, bounds.y + bounds.height * first[1]!);
  await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(bounds.x + bounds.width * point[0]!, bounds.y + bounds.height * point[1]!, { steps: 3 });
  await page.mouse.up();
  await page.mouse.click(bounds.x + bounds.width * .43, bounds.y + bounds.height * .47);
  await page.mouse.click(bounds.x + bounds.width * .59, bounds.y + bounds.height * .47);
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  await expect(page.getByRole('heading', { name: 'Bind the living ink.', exact: true })).toBeVisible();
  const sprite = { src: (await page.locator('.binding-sprite img').getAttribute('src'))!, hash: (await page.locator('.binding-sprite img').getAttribute('data-sprite-hash'))! };
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  await page.getByRole('button', { name: 'Enter the arena', exact: true }).click();
  await expect(page.locator('.siege-battle')).toBeVisible();
  return sprite;
}

async function choose(page: Page, index: number) {
  await page.locator('.siege-question .answer-option').nth(index).click();
  await page.getByRole('button', { name: /Commit answer/ }).dblclick();
  await expect(page.locator('.siege-feedback')).toBeVisible();
}

async function next(page: Page) {
  await page.getByRole('button', { name: /Next question/ }).click();
}

async function resumeAfterReload(page: Page) {
  await page.reload();
  await page.getByRole('button', { name: 'Enter Exam Siege', exact: true }).click();
  const resume = page.getByRole('button', { name: /Resume saved examination/ });
  await expect(resume).toBeVisible();
  await resume.click();
}

/** Minimal genuine two-page selectable-text PDF; object offsets are generated, not mocked. */
function examPdf() {
  const pages = [
    ['1. Calculate 2 + 3. [2 marks]', 'A) 5', 'B) 6'],
    ['2. Calculate 4 + 4. [3 marks]', 'A) 7', 'B) 8'],
  ];
  const escape = (value: string) => value.replace(/[\\()]/g, '\\$&');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
    '',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  for (const [index, lines] of pages.entries()) {
    const stream = `BT /F1 16 Tf 50 730 Td 26 TL ${lines.map((line, i) => `${i ? 'T* ' : ''}(${escape(line)}) Tj`).join('\n')} ET`;
    objects[3 + index * 2] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  }
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

test('Quick Battle commits one weighted loss, resumes feedback, and completes a real conquest report', async ({ page }) => {
  const started = Date.now();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await enterSiege(page, true);
  await page.getByRole('button', { name: /Quick Battle/ }).click();
  const sprite = await confirmAndDraw(page);
  await expect(page.locator('.titan-scene canvas')).toBeVisible();
  await expect(page.locator('.titan-scene canvas')).toHaveAttribute('data-sprite-status', 'ready');
  await choose(page, 1); // Question one is worth one of ten marks. Correct key is A.
  await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveAttribute('aria-valuenow', '90');
  await page.screenshot({ path: '.cache/exam-siege/wrong-answer-desktop.png', fullPage: true });
  await resumeAfterReload(page);
  await expect(page.locator('.siege-feedback')).toBeVisible();
  await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveAttribute('aria-valuenow', '90');
  await next(page);
  for (const [offset, option] of [3, 2, 1, 0].entries()) {
    await choose(page, option);
    if (offset < 3) await next(page);
  }
  await page.getByRole('button', { name: /View examination report/ }).click();
  await expect(page.getByRole('heading', { name: 'Crystal Conquest', exact: true })).toBeVisible();
  await expect(page.locator('.siege-report')).toContainText('9 / 10 MARKS EARNED');
  await expect(page.locator('.answer-record.incorrect')).toHaveCount(1);
  await expect(page.locator('.answer-record.correct')).toHaveCount(4);
  await expect(page.locator('.performance-emblem img')).toHaveAttribute('src', sprite.src);
  await expect(page.locator('.performance-emblem img')).toHaveAttribute('data-sprite-hash', sprite.hash);
  await page.screenshot({ path: '.cache/exam-siege/conquest-report.png', fullPage: true });
  expect(errors).toEqual([]);
  const durationMs = Date.now() - started;
  expect(durationMs).toBeLessThan(180_000);
  await test.info().attach('automated-demo-duration.json', { body: JSON.stringify({ durationMs, automated: true, route: 'fresh drawing, weighted mistake, reload, four correct answers, report' }), contentType: 'application/json' });
  console.log(`Exam Siege real-system automated demo: ${(durationMs / 1000).toFixed(2)} seconds.`);
});

test('50 and 100 question samples share the editable examination preparation flow', async ({ page }) => {
  for (const count of [50, 100]) {
    await enterSiege(page);
    await page.getByRole('button', { name: new RegExp(`Full Examination · ${count}`) }).click();
    await expect(page.getByRole('heading', { name: 'Review the paper.', exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText(`${count} questions`);
    await expect(page.getByRole('button', { name: /Draw your titan/ })).toBeDisabled();
  }
});

test('a genuine two-page text PDF extracts unequal marks and requires a confirmed answer key', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') requests.push(request.url()); });
  await enterSiege(page);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'fresh-two-page-exam.pdf', mimeType: 'application/pdf', buffer: examPdf() });
  await expect(page.getByRole('heading', { name: 'Review the paper.', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('2 questions');
  await expect(page.locator('main')).toContainText('5 maximum marks');
  await expect(page.getByRole('button', { name: /Draw your titan/ })).toBeDisabled();
  // The original document has no answer key; the app must never invent one.
  await expect(page.locator('main')).toContainText(/answer key|correct answer/i);
  expect(requests).toEqual([]);
  await page.screenshot({ path: '.cache/exam-siege/pdf-review.png', fullPage: true });
});

test('unsupported and excessive files fail safely without replacing the working preparation flow', async ({ page }) => {
  await enterSiege(page);
  const input = page.locator('input[type=file]').first();
  await input.setInputFiles({ name: 'instructions.html', mimeType: 'text/html', buffer: Buffer.from('<script>throw 1</script>') });
  await expect(page.getByRole('alert')).toContainText(/Supported files|supported examination format/i);
  await input.setInputFiles({ name: 'too-large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await expect(page.getByRole('alert')).toContainText('10 MB');
});

test('reduced-motion mobile fallback keeps the original drawing and grading playable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await enterSiege(page);
  await page.getByRole('button', { name: /Quick Battle/ }).click();
  await confirmAndDraw(page);
  await expect(page.locator('.titan-fallback img')).toBeVisible();
  await choose(page, 0);
  await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveAttribute('aria-valuenow', '100');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: '.cache/exam-siege/fallback-mobile.png', fullPage: true });
});

test('an uploaded confirmed key and corrected marks produce exact-threshold scarred victory', async ({ page }) => {
  await enterSiege(page);
  await page.getByLabel('Upload examination files').setInputFiles({ name: 'editable-real-paper.pdf', mimeType: 'application/pdf', buffer: examPdf() });
  await expect(page.getByRole('heading', { name: 'Review the paper.', exact: true })).toBeVisible();
  await page.getByLabel('Question marks', { exact: true }).fill('7');
  await page.getByLabel('Question text', { exact: true }).fill('Calculate 2 + 3. Corrected from the original layout.');
  await page.getByLabel('Numbered answer key', { exact: true }).fill('1: A\n2: B');
  await page.getByRole('button', { name: 'Apply key for review', exact: true }).click();
  await confirmAndDraw(page);
  await choose(page, 1); // Lose 7/10; exactly 30% remains and must continue.
  await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveAttribute('aria-valuenow', '30');
  await expect(page.getByRole('button', { name: /Next question/ })).toBeEnabled();
  await next(page);
  await choose(page, 1); // Three earned marks = precisely 30%, a genuine pass.
  await page.getByRole('button', { name: /View examination report/ }).click();
  await expect(page.getByRole('heading', { name: 'Scarred Victory', exact: true })).toBeVisible();
  await expect(page.locator('.siege-report')).toContainText('3 / 10 MARKS EARNED');
  await expect(page.locator('.answer-record.incorrect')).toHaveCount(1);
  await expect(page.locator('.answer-record.correct')).toHaveCount(1);
});

test('early mathematical failure reports unanswered questions separately from mistakes', async ({ page }) => {
  await enterSiege(page);
  await page.getByLabel('Upload examination files').setInputFiles({ name: 'early-failure-paper.pdf', mimeType: 'application/pdf', buffer: examPdf() });
  await expect(page.getByRole('heading', { name: 'Review the paper.', exact: true })).toBeVisible();
  await page.getByLabel('Pass threshold (%)', { exact: true }).fill('70');
  await page.getByLabel('Numbered answer key', { exact: true }).fill('1: A\n2: B');
  await page.getByRole('button', { name: 'Apply key for review', exact: true }).click();
  await confirmAndDraw(page);
  await choose(page, 1); // 3/5 attainable = 60%, strictly below configured 70%.
  await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveAttribute('aria-valuenow', '60');
  await expect(page.locator('.siege-feedback')).toContainText('1 questions remain unattempted');
  await expect(page.getByRole('button', { name: /Next question/ })).toHaveCount(0);
  await page.getByRole('button', { name: /View examination report/ }).click();
  await expect(page.getByRole('heading', { name: 'The Shattering', exact: true })).toBeVisible();
  await expect(page.locator('.siege-report')).toContainText('maximum attainable score (60.00%) fell strictly below 70%');
  await expect(page.locator('.answer-record.incorrect')).toHaveCount(1);
  await expect(page.locator('.answer-record.unattempted')).toHaveCount(1);
  await page.screenshot({ path: '.cache/exam-siege/early-failure-report.png', fullPage: true });
});

test('reduced-motion 3D remains still and context loss preserves the selected answer and original ink', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterSiege(page);
  await page.getByRole('button', { name: /Quick Battle/ }).click();
  const sprite = await confirmAndDraw(page);
  const canvas = page.locator('.titan-scene canvas');
  await expect(canvas).toHaveAttribute('data-sprite-status', 'ready');
  await expect(canvas).toHaveAttribute('data-renderer', 'three');
  await page.waitForTimeout(500);
  const still = await canvas.screenshot();
  await page.waitForTimeout(350);
  expect(await canvas.screenshot()).toEqual(still);
  const selected = page.locator('.siege-question .answer-option').nth(1);
  await selected.click();
  const oldCanvas = (await canvas.elementHandle())!;
  await oldCanvas.evaluate((surface: HTMLCanvasElement) => {
    const context = surface.getContext('webgl2')!;
    context.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.locator('.titan-fallback img')).toHaveAttribute('src', sprite.src);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  expect(await oldCanvas.evaluate(surface => surface.isConnected)).toBe(false);
  await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('button', { name: /Commit answer/ }).click();
  await expect(page.locator('.siege-feedback')).toBeVisible();
  await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveAttribute('aria-valuenow', '90');
});

test('a complete 50-question examination uses real UI grading through the final blow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterSiege(page);
  await page.getByRole('button', { name: /Full Examination · 50/ }).click();
  await confirmAndDraw(page);
  const correctOption = [0, 3, 2, 1];
  for (let index = 0; index < 50; index++) {
    await expect(page.locator('.siege-question .folio-meta')).toContainText(`QUESTION ${index + 1} / 50`);
    await choose(page, correctOption[index % 4]!);
    if (index === 14) {
      await expect(page.locator('.siege-boss-title')).toContainText('CORE EXPOSED');
      await expect(page.getByRole('button', { name: /View examination report/ })).toHaveCount(0);
    }
    if (index < 49) await next(page);
  }
  await page.getByRole('button', { name: /View examination report/ }).click();
  await expect(page.getByRole('heading', { name: 'Crystal Conquest', exact: true })).toBeVisible();
  await expect(page.locator('.siege-report')).toContainText('50 / 50 MARKS EARNED');
  await expect(page.locator('.answer-record.correct')).toHaveCount(50);
  await expect(page.locator('.answer-record.incorrect')).toHaveCount(0);
  await expect(page.locator('.answer-record.unattempted')).toHaveCount(0);
  await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveCount(0);
  await page.screenshot({ path: '.cache/exam-siege/full-50-completed.png' });
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report JSON', exact: true }).click();
  const download = await downloading;
  await download.saveAs('.cache/exam-siege/50-report.json');
  const exported = JSON.parse(await readFile('.cache/exam-siege/50-report.json', 'utf8'));
  expect(exported).toMatchObject({ count: 50, earned: 50, total: 50, correct: 50, incorrect: 0, unattempted: 0, passed: true });
  expect(exported.records).toHaveLength(50);
  await page.evaluate(() => {
    window.addEventListener('beforeprint', () => { document.body.dataset.printRecordCount = `${document.querySelectorAll('.answer-record[open]').length}`; }, { once: true });
  });
  const pdf = await page.pdf({ path: '.cache/exam-siege/50-report.pdf', format: 'A4', printBackground: true, margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' } });
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  await expect(page.locator('body')).toHaveAttribute('data-print-record-count', '50');
  await expect(page.locator('.answer-record[open]')).toHaveCount(0);
});

test('a narrow drawing retains its ratio in the optional keyboard rig and initializes a real 3D titan', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enterSiege(page);
  await page.getByRole('button', { name: /Quick Battle/ }).click();
  await page.getByRole('checkbox', { name: /I confirm every included question/ }).check();
  await page.getByRole('button', { name: /Draw your titan/ }).click();
  await page.locator('.drawing-canvas').scrollIntoViewIfNeeded();
  const bounds = (await page.locator('.drawing-canvas').boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .49, bounds.y + bounds.height * .12);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .51, bounds.y + bounds.height * .88, { steps: 25 });
  await page.mouse.up();
  await page.getByRole('button', { name: /Prepare the creature/ }).click();
  await expect(page.getByRole('heading', { name: 'Bind the living ink.', exact: true })).toBeVisible();
  const actual = await page.locator('.rig-sprite img').evaluate((image: HTMLImageElement) => ({ src: image.src, hash: image.dataset.spriteHash, ratio: image.naturalWidth / image.naturalHeight }));
  const preview = (await page.locator('.rig-sprite').boundingBox())!;
  expect(actual.ratio).toBeLessThan(.25);
  expect(preview.width / preview.height).toBeCloseTo(actual.ratio, 2);
  expect(preview.height).toBeLessThanOrEqual(481);
  await page.getByRole('checkbox', { name: 'Mark optional shoulder and hand anchors', exact: true }).check();
  const shoulder = page.getByRole('slider', { name: 'leftShoulder x', exact: true });
  await shoulder.focus(); await page.keyboard.press('ArrowRight');
  await expect(shoulder).toHaveValue('0.31');
  await expect(page.locator('.rig-anchor')).toHaveCount(4);
  await page.screenshot({ path: '.cache/exam-siege/narrow-rig-preview.png', fullPage: true });
  await page.getByRole('button', { name: /Awaken my creature/ }).click();
  await page.getByRole('button', { name: 'Enter the arena', exact: true }).click();
  const canvas = page.locator('.titan-scene canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'three');
  await expect(canvas).toHaveAttribute('data-sprite-status', 'ready');
  await choose(page, 0);
  await expect(page.getByRole('meter', { name: 'Survival potential' })).toHaveAttribute('aria-valuenow', '100');
  await page.screenshot({ path: '.cache/exam-siege/narrow-titan-3d.png', fullPage: true });
});
