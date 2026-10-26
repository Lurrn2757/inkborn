import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 180_000 });

async function paperImage(page: Page): Promise<Buffer> {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 700;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000000'; context.font = '44px Arial';
    ['1. Calculate 2 + 3. [2 marks]', 'A) 5', 'B) 6', '', '2. Calculate 4 + 4. [3 marks]', 'A) 7', 'B) 8'].forEach((line, index) => context.fillText(line, 70, 90 + index * 75));
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  return Buffer.from(data, 'base64');
}

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Exam Siege', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prepare the examination.', exact: true })).toBeVisible();
}

test('a fresh printed PNG is recognized locally and remains an ungraded draft without a key', async ({ page }) => {
  const postRequests: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') postRequests.push(request.url()); });
  await start(page);
  await page.getByLabel('Upload examination files').setInputFiles({ name: 'fresh-printed-paper.png', mimeType: 'image/png', buffer: await paperImage(page) });
  await expect(page.getByRole('heading', { name: 'Review the paper.', exact: true })).toBeVisible({ timeout: 110_000 });
  await expect(page.getByLabel('Question text', { exact: true })).toHaveValue(/Calculate 2 \+ 3/);
  await expect(page.locator('main')).toContainText('2 questions');
  await expect(page.locator('main')).toContainText('5 maximum marks');
  await page.getByText(/extraction review warnings/).click();
  await expect(page.locator('main')).toContainText('Image OCR is provisional');
  await expect(page.getByRole('button', { name: /Draw your titan/ })).toBeDisabled();
  expect(postRequests).toEqual([]);
  await page.screenshot({ path: '.cache/exam-siege/image-ocr-review.png', fullPage: true });
});

test('unavailable recognition assets produce an honest recoverable OCR error', async ({ page }) => {
  await page.route(/https:\/\/cdn\.jsdelivr\.net\/npm\/(?:tesseract\.js-core|@tesseract\.js-data)/, route => route.abort('failed'));
  await start(page);
  await page.getByLabel('Upload examination files').setInputFiles({ name: 'offline-paper.png', mimeType: 'image/png', buffer: await paperImage(page) });
  await expect(page.getByRole('alert')).toContainText(/recognition assets could not load|recognition failed|timed out/i, { timeout: 110_000 });
  await expect(page.getByLabel('Upload examination files')).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Prepare the examination.', exact: true })).toBeVisible();
});
