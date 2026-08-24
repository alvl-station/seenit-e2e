// Playwright + playwright-bdd. Human-readable scenarios live in
// features/*.feature; step definitions in steps/ are thin wrappers over the
// page objects in pages/. `bddgen` compiles features into runnable specs
// under .features-gen/ (gitignored) — that's what testDir points at, so
// plain `playwright test` never runs without generation (npm run smoke does
// both).
//
// Device profiles are Playwright PROJECTS selected by scenario tags:
// untagged scenarios run on desktop Chrome; @phone-portrait / @phone-
// landscape run in emulated touch viewports (hover:none — which is what
// the sticky-hover scenario exists to exercise).
const { defineConfig, devices } = require('@playwright/test');
const { defineBddConfig } = require('playwright-bdd');
const path = require('path');

// One sign-in per run, reused by every project (see support/auth.setup.js).
const STATE_FILE = path.join(__dirname, '.auth', 'state.json');

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  // support/fixtures.js must be in the steps glob — bddgen needs the file
  // that exports the extended `test` to wire fixtures into generated specs.
  steps: ['steps/**/*.js', 'support/fixtures.js'],
});

module.exports = defineConfig({
  testDir,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // NOT fully parallel, deliberately. Scenarios inside one file run in
  // order; separate files still parallelize across workers. The marks
  // scenarios all mutate the SAME test account's lists, and running them
  // concurrently made their counts race — one scenario's toggle landing
  // between another's "remember" and "compare" reads. Cross-FILE
  // parallelism keeps most of the speed; in-file order restores sanity.
  fullyParallel: false,
  // Two — which is also what Playwright infers from the runner's two cores,
  // set explicitly so the number carries its reasoning.
  //
  // Oversubscribing looked free (the suite mostly waits on a live URL) and
  // was not. At six, per-scenario time went from 1.5-3s to 11-22s while the
  // whole suite only improved 3.4min -> 2.2min: browsers competing for two
  // cores, every scenario left running at the edge of its 30s timeout. The
  // first one over was "a fresh visitor", which opens an ADDITIONAL context
  // and so paid the contention twice — and it failed as though the login
  // screen were broken.
  //
  // That is the trade worth remembering: past the point where workers stop
  // waiting and start competing, the suite buys wall-clock with headroom,
  // and headroom is what stops a slow run from reading as a broken app. A
  // minute of wall-clock is not worth a false alarm on a deploy.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  // 'list' for the live CI log, Allure for the published report (roadmap:
  // a separate Pages site with screenshots and short videos on failure).
  reporter: [
    ['list'],
    ['allure-playwright', { resultsDir: 'allure-results', detail: false }],
  ],
  use: {
    // Smoke suite runs against a live, already-deployed URL — no local dev
    // server; production by default so it's runnable by hand too.
    baseURL: process.env.BASE_URL || 'https://alvl-station.github.io/seenit/',
    // Traces are OFF on purpose, and it costs us nothing: a trace records
    // every action's arguments — including the password passed to fill() —
    // and this repo is public, so traces were already banned from artifacts
    // (REQUIREMENTS S-5). Screenshots and videos are safe to publish
    // because the login fields are visually masked (support/fixtures.js).
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Signs in once and saves the session; everything else depends on it.
    { name: 'setup', testMatch: /auth\.setup\.js$/, testDir: '.' },
    {
      name: 'desktop',
      dependencies: ['setup'],
      grepInvert: /@phone/,
      use: { ...devices['Desktop Chrome'], storageState: STATE_FILE },
    },
    {
      name: 'phone-portrait',
      dependencies: ['setup'],
      grep: /@phone-portrait/,
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, storageState: STATE_FILE },
    },
    {
      name: 'phone-landscape',
      dependencies: ['setup'],
      grep: /@phone-landscape/,
      use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, storageState: STATE_FILE },
    },
  ],
});
