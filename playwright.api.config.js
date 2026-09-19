// The API suite: the Worker's routes and defences, probed over HTTP against
// the live API. No browser, and not part of `npm run smoke`; run it with
// `npm run api` (locally, with .env.local sourced). Kept separate so a
// deploy's smoke run does not depend on it.
//
// No traces, for the same reason as the smoke suite: this repo is public.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'api',
  testMatch: /\.api\.spec\.js$/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 4,
  retries: 0,
  reporter: [['list']],
  use: { trace: 'off' },
});
