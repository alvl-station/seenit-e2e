// Steps over the addresses (seenit-frontend ROUTES.md). Thin wrappers; the
// selectors live in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { LoginPage } = require('../pages/LoginPage');
const { CatalogPage } = require('../pages/CatalogPage');
const { When, Then } = createBdd(test);

const BASE = () => process.env.BASE_URL || 'https://seenit-app.pages.dev/';
const POLL = { timeout: 10000 };

When('I open the address {string}', async ({ catalog }, name) => {
  await catalog.goto(name);
  await catalog.waitForAppReady();
});
When("I press the browser's back", async ({ page }) => {
  await page.goBack();
});
Then('the address is {string}', async ({ catalog }, address) => {
  await expect.poll(() => catalog.currentAddress(), POLL).toBe(address);
});
Then('the account page is showing', async ({ catalog }) => {
  await expect.poll(() => catalog.accountPanelIsOpen(), POLL).toBe(true);
});
Then('the account page is closed', async ({ catalog }) => {
  await expect.poll(() => catalog.accountPanelIsOpen(), POLL).toBe(false);
});
Then('the collections page is showing', async ({ catalog }) => {
  await expect.poll(() => catalog.recsIsOpen(), POLL).toBe(true);
});
Then("the die's page is open", async ({ catalog }) => {
  await expect.poll(() => catalog.diceSheetIsOpen(), POLL).toBe(true);
});

// A new context: the shared one carries the saved session.
Then('a fresh visitor at {string} is sent to {string}', async ({ browser }, name, address) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE() + name, { waitUntil: 'domcontentloaded' });
    await expect(new LoginPage(page).overlay).toBeVisible({ timeout: 20000 });
    await expect.poll(() => new CatalogPage(page).currentAddress(), POLL).toBe(address);
  } finally {
    await ctx.close();
  }
});
