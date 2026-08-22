// Steps over CatalogPage: navigation, search, view modes, chips, tabs and
// card-geometry assertions. Thin wrappers — every selector lives in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { Given, When, Then } = createBdd(test);

function overlaps(a, b) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x ||
           a.y + a.height <= b.y || b.y + b.height <= a.y);
}

/* ---- catalog basics ---- */
Then('the catalog shows at least one movie', async ({ catalog }) => {
  expect(await catalog.cardCount()).toBeGreaterThan(0);
});
When('I search for {string}', async ({ catalog }, query) => {
  await catalog.search(query);
});
Then('I see the empty state {string}', async ({ catalog }, text) => {
  await expect(catalog.emptyMessage).toBeVisible();
  await expect(catalog.emptyMessage).toContainText(text);
});
When('I clear the search', async ({ catalog }) => {
  await catalog.search('');
  await catalog.waitForCatalogLoaded();
});

/* ---- view modes + layout geometry ---- */
When('I switch the view to {string}', async ({ catalog }, view) => {
  await catalog.switchView(view);
  expect(await catalog.currentView()).toBe(view);
});
Then('the card title sits to the right of the poster', async ({ catalog }) => {
  const poster = await catalog.cardPoster(0).boundingBox();
  const title = await catalog.cardTitle(0).boundingBox();
  expect(title.x).toBeGreaterThan(poster.x + poster.width - 1);
});
Then('the card is compact: height under half its width', async ({ catalog }) => {
  const card = await catalog.cards.first().boundingBox();
  expect(card.height).toBeLessThan(card.width / 2);
});
Given('the catalog has a movie with awards', async ({ catalog, ctx }) => {
  ctx.awardCardIndex = await catalog.firstCardIndexWithAwards();
  test.skip(ctx.awardCardIndex === -1, 'no movie with awards in the catalog right now');
});
Then('that card shows the compact award badge and hides the full pills', async ({ catalog, ctx }) => {
  await expect(catalog.cardBadgesCompact(ctx.awardCardIndex)).toBeVisible();
  await expect(catalog.cardBadgesFull(ctx.awardCardIndex)).toBeHidden();
});
Then('the badges stay within the card width', async ({ catalog, ctx }) => {
  const card = await catalog.cards.nth(ctx.awardCardIndex).boundingBox();
  const compact = await catalog.cardBadgesCompact(ctx.awardCardIndex).boundingBox();
  expect(compact.x + compact.width).toBeLessThanOrEqual(card.x + card.width + 1);
});
Then('no rating badge intersects the type and year text', async ({ catalog }) => {
  const n = Math.min(await catalog.cardCount(), 8);
  let checked = 0;
  for (let i = 0; i < n; i++) {
    if (await catalog.cardRatingBadge(i).count() === 0) continue;
    const year = await catalog.cardYearText(i).boundingBox();
    const rating = await catalog.cardRatingBadge(i).boundingBox();
    if (!year || !rating) continue;
    expect(overlaps(year, rating), `card ${i}: rating badge overlaps the type and year text`).toBe(false);
    checked++;
  }
  test.skip(checked === 0, 'no card with a rating badge visible');
});

/* ---- genre chips ---- */
Given('the catalog has more than one genre', async ({ catalog }) => {
  test.skip(await catalog.firstRealGenreChip().count() === 0, 'catalog has fewer than two genres right now');
});
When('I tap the first genre chip', async ({ catalog }) => {
  await catalog.firstRealGenreChip().click();
});
Then('that chip is active', async ({ catalog }) => {
  expect(await catalog.chipIsActive(catalog.firstRealGenreChip())).toBe(true);
});
Then('that chip is inactive', async ({ catalog }) => {
  expect(await catalog.chipIsActive(catalog.firstRealGenreChip())).toBe(false);
});
Then('the "all genres" chip is active', async ({ catalog }) => {
  expect(await catalog.chipIsActive(catalog.genreChip(0))).toBe(true);
});
Given('I remember the border color of the first genre chip', async ({ catalog, ctx }) => {
  ctx.restingBorder = await catalog.chipBorderColor(catalog.firstRealGenreChip());
});
When('I touch-tap the first genre chip', async ({ catalog }) => {
  await catalog.firstRealGenreChip().tap();
});
When('I touch-tap the first genre chip again', async ({ catalog }) => {
  await catalog.firstRealGenreChip().tap();
});
Then('the chip is inactive and its border color matches the remembered one', async ({ catalog, ctx }) => {
  const chip = catalog.firstRealGenreChip();
  expect(await catalog.chipIsActive(chip)).toBe(false);
  expect(await catalog.chipBorderColor(chip)).toBe(ctx.restingBorder);
});

/* ---- tabs ---- */
When('I tap the {string} tab', async ({ catalog }, name) => {
  const tab = name === 'Рекомендую' ? catalog.recommendTab() : catalog.allTab();
  await tab.click();
});
Then('the {string} tab is active', async ({ catalog }, name) => {
  const tab = name === 'Рекомендую' ? catalog.recommendTab() : catalog.allTab();
  expect(await catalog.tabIsActive(tab)).toBe(true);
});
Then('the {string} tab is inactive', async ({ catalog }, name) => {
  const tab = name === 'Рекомендую' ? catalog.recommendTab() : catalog.allTab();
  expect(await catalog.tabIsActive(tab)).toBe(false);
});

/* ---- page scroll state ---- */
Given('I scroll the catalog to offset {int}', async ({ catalog, ctx }, y) => {
  await catalog.scrollTo(y);
  ctx.scrollBefore = await catalog.scrollY();
  expect(ctx.scrollBefore).toBeGreaterThan(0);
});
Then('the page has no sideways scroll', async ({ catalog }) => {
  expect(await catalog.hasHorizontalOverflow()).toBe(false);
});
