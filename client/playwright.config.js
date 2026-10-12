// End-to-end suite: `npm run test:e2e` (build first with `npm run build`).
//
// By default the suite runs against the production build served by
// `vite preview`, whose spaShellPreview plugin (vite.config.js) routes pages
// the way production nginx does. Set E2E_BASE_URL to run it against a site
// that is already up instead, such as a local nginx in front of the real
// backend (that is also what e2e/backend.spec.js needs; see its header).
import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const external = process.env.E2E_BASE_URL;

if (!external && !existsSync(new URL('./dist/index.html', import.meta.url))) {
  throw new Error('No production build in dist/: run `npm run build` before `npm run test:e2e`.');
}

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Few workers: the homepage's 3D section is rendered in software by headless
  // Chromium, and many pages doing that at once starve each other of CPU.
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: external || `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: external
    ? undefined
    : {
        command: `npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
