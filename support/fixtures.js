// Playwright fixtures shared by every spec — import `test`/`expect` from
// HERE, never from '@playwright/test' directly:
//
//   const { test, expect } = require('../support/fixtures');
//   test('...', async ({ catalog, page }) => { ... });
//
// The `catalog` fixture hands each test an already-logged-in CatalogPage
// with the catalog loaded, so specs contain zero credential plumbing and
// zero login boilerplate. Read-only rule (seenit-frontend REQUIREMENTS
// T-4) applies to everything built on top: the test account sees the REAL
// shared catalog — look, search, open and close; never toggle or save.
// The base `test` comes from playwright-bdd (its bdd-enabled extension of
// Playwright's), so createBdd() in steps/ accepts our extended version.
const { test: bddBase } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { CatalogPage } = require('../pages/CatalogPage');

const test = bddBase.extend({
  catalog: async ({ page }, use) => {
    const login = new LoginPage(page);
    const catalog = new CatalogPage(page);
    await catalog.goto();
    // Failure screenshots and videos are PUBLISHED (the Allure report is a
    // public Pages site), and the most likely thing to fail is login
    // itself — which would put the test account's username on screen in
    // plain text. -webkit-text-security renders both fields as dots
    // without touching the DOM value, so what's captured is safe while the
    // login behaves exactly as it does for a real user (REQUIREMENTS S-4).
    await page.addStyleTag({
      content: '#loginUser, #loginPass { -webkit-text-security: disc; }',
    }).catch(() => { /* page may already have navigated; masking is best-effort */ });
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
    await use(catalog);
  },
  // Scratch object shared by the steps of ONE scenario (playwright-bdd
  // steps are separate functions, so anything one step finds for the next —
  // a modal instance, a remembered offset — travels through here).
  ctx: async ({}, use) => { await use({}); },
});

module.exports = { test, expect };
