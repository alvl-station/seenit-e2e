// Shared login-once-per-test setup, so every spec file starts from the same
// authenticated catalog without duplicating the credential plumbing.
// Read-only rule (seenit-frontend REQUIREMENTS T-4) applies to everything
// built on top of this: the test account sees the REAL shared catalog.
const { LoginPage } = require('../pages/LoginPage');
const { CatalogPage } = require('../pages/CatalogPage');

async function openLoggedInCatalog(page) {
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
  return catalog;
}

module.exports = { openLoggedInCatalog };
