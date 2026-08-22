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
    const catalog = new CatalogPage(page);
    // Already authenticated: the 'setup' project signed in once and saved
    // the session (support/auth.setup.js), so this just opens the catalog.
    await catalog.goto();
    // Failure screenshots and videos are PUBLISHED (the Allure report is a
    // public Pages site). Masking the login inputs costs nothing and covers
    // the case where the saved session expired and the overlay reappears —
    // -webkit-text-security renders them as dots without touching the DOM
    // value, so login still behaves normally (REQUIREMENTS S-4).
    await page.addStyleTag({
      content: '#loginUser, #loginPass { -webkit-text-security: disc; }',
    }).catch(() => { /* best-effort */ });
    // #loginOverlay is visible on load by DESIGN and only hides once
    // Firebase's onAuthStateChanged fires with the restored user — an
    // instant check races that and always sees the overlay. Wait for it to
    // go, and only then call it an auth problem.
    const login = new LoginPage(page);
    try {
      await login.waitUntilHidden(20000);
    } catch (err) {
      throw new Error('Not authenticated — the setup project should have signed in. Session expired, TEST_USER is wrong, or Firebase is throttling the account.');
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
