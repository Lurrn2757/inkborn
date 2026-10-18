import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= fileURLToPath(new URL('./.cache/playwright', import.meta.url));
const temporaryDirectory = fileURLToPath(new URL('./.cache/tmp/', import.meta.url));
mkdirSync(temporaryDirectory, { recursive: true });
process.env.TMPDIR = temporaryDirectory;
process.env.TMP = temporaryDirectory;
process.env.TEMP = temporaryDirectory;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://127.0.0.1:4173/api/status',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { HOST: '127.0.0.1', PORT: '4173', OPENAI_API_KEY: '' },
  },
});
