// Steps over SearchPage: the search is a page of its own now.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { SearchPage } = require('../pages/SearchPage');
const { When, Then } = createBdd(test);

// Every step asks for `catalog`: that fixture is what opens the app and
// signs in, and it only runs for a scenario whose steps name it.
function searchOf(ctx, page) {
  if (!ctx.search) ctx.search = new SearchPage(page);
  return ctx.search;
}

When('I search for {string}', async ({ ctx, page, catalog: _ }, query) => {
  await searchOf(ctx, page).search(query);
});
When('I open the search page', async ({ ctx, page, catalog: _ }) => {
  await searchOf(ctx, page).open();
});
When('I close the search page', async ({ ctx, page, catalog }) => {
  await searchOf(ctx, page).close();
  await catalog.waitForCatalogLoaded();
});
Then('the search page is open and asks for a query', async ({ ctx, page, catalog: _ }) => {
  const s = searchOf(ctx, page);
  expect(await s.isOpen()).toBe(true);
  expect(await s.bodyText()).toContain('актор або режисер');
});
Then('the search page is closed', async ({ ctx, page, catalog: _ }) => {
  expect(await searchOf(ctx, page).isOpen()).toBe(false);
});
Then('the search page says nothing was found', async ({ ctx, page, catalog: _ }) => {
  const s = searchOf(ctx, page);
  const text = await s.emptyText();
  expect(text, 'an empty result must show a message, not a blank page').toBeTruthy();
  expect(text).toContain('Нічого не знайдено');
  expect(await s.cards.count()).toBe(0);
});
Then('the search page shows films and series', async ({ ctx, page, catalog: _ }) => {
  const s = searchOf(ctx, page);
  expect(await s.resultKinds()).toEqual(['movie', 'tv']);
  await expect(s.count).toContainText('фільмів');
  await expect(s.count).toContainText('серіалів');
});
/* ---- where to look (2026-09-29) ---- */
Then('the strip offers the three places to look', async ({ ctx, page, catalog: _ }) => {
  await expect(searchOf(ctx, page).modeCells())
    .toHaveText(['У застосунку', 'Поза застосунком', 'Скріншот']);
});
When('I look outside the app', async ({ ctx, page, catalog: _ }) => {
  await searchOf(ctx, page).lookIn('Поза застосунком', 'web');
});
When('I look in a screenshot', async ({ ctx, page, catalog: _ }) => {
  await searchOf(ctx, page).lookIn('Скріншот', 'shot');
});
When('I look in the app', async ({ ctx, page, catalog: _ }) => {
  await searchOf(ctx, page).lookIn('У застосунку', 'app');
});
Then('the search looks outside the app for {string}', async ({ ctx, page, catalog: _ }, query) => {
  const s = searchOf(ctx, page);
  await expect(s.input).toHaveValue(query);
  // Read-only: the answers are TMDb's, and only their arrival is asserted -
  // a candidate is never opened, so nothing can be saved (REQ T-4).
  await expect(page.locator('#addResults .candidate-item').first()).toBeVisible({ timeout: 20000 });
});
Then('a screenshot can be chosen', async ({ page, catalog: _ }) => {
  await expect(page.locator('#searchPageBody #addFile')).toBeAttached();
});
Then('the search page shows results for {string}', async ({ ctx, page, catalog: _ }, query) => {
  const s = searchOf(ctx, page);
  await expect(s.input).toHaveValue(query);
  await expect(s.cards.first()).toBeVisible();
});

When('I remember the search results', async ({ ctx, page, catalog: _ }) => {
  ctx.searchResults = (await searchOf(ctx, page).resultKeys()).sort();
});
Then('the search page shows the same results', async ({ ctx, page, catalog: _ }) => {
  expect((await searchOf(ctx, page).resultKeys()).sort()).toEqual(ctx.searchResults);
});
