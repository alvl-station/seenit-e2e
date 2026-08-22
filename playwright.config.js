const { defineConfig, devices } = require('@playwright/test');

// Smoke suite runs against a live, already-deployed URL (see
// the seenit-frontend deploy chain) — there's no local dev server to
// start, BASE_URL always points at a real deployment (production by
// default, so this is runnable by hand too: BASE_URL=... npm run test:e2e).
module.exports = defineConfig({
  testDir: '.',
  // Only *.spec.js — tests/redact-secrets.test.js is a node:test suite (run
  // by `npm test`), not a Playwright one, and must not be collected here.
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'https://alvl-station.github.io/seenit/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
