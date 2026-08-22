// Logs in ONCE per run and saves the authenticated session to disk; every
// scenario then starts already signed in.
//
// Why this exists: the `catalog` fixture used to log in per scenario. At 3
// tests that was invisible; at 17 across three device projects (plus CI
// retries) it became ~20 sign-ins per run, and a burst of runs got the
// account throttled by Firebase — which the app reports as "wrong
// username or password", so it looks like broken credentials. One login
// per run removes the whole class of problem.
//
// Firebase keeps its session in IndexedDB (not localStorage), so the state
// is saved with `indexedDB: true` — supported since Playwright 1.51.
const { test: setup, expect } = require('@playwright/test');
const path = require('path');
const { LoginPage } = require('../pages/LoginPage');
const { CatalogPage } = require('../pages/CatalogPage');

const STATE_FILE = path.join(__dirname, '..', '.auth', 'state.json');

setup('authenticate once', async ({ page, context }) => {
  const login = new LoginPage(page);
  const catalog = new CatalogPage(page);
  await catalog.goto();
  if (await login.isShown()) {
    const username = process.env.SMOKE_TEST_USERNAME;
    const password = process.env.SMOKE_TEST_PASSWORD;
    if (!username || !password) {
      throw new Error('SMOKE_TEST_USERNAME/SMOKE_TEST_PASSWORD env vars are not set.');
    }
    await login.login(username, password);
    await login.waitUntilHidden();
  }
  await catalog.waitForCatalogLoaded();
  await context.storageState({ path: STATE_FILE, indexedDB: true });
});

module.exports = { STATE_FILE };
