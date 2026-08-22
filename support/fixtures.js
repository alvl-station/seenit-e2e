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
const base = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { CatalogPage } = require('../pages/CatalogPage');

const test = base.test.extend({
  catalog: async ({ page }, use) => {
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
    await use(catalog);
  },
});

module.exports = { test, expect: base.expect };
