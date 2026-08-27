// Steps over the filter sheet: the year filter and the provider filter.
// Thin wrappers — every selector lives in pages/CatalogPage.js.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { Given, When, Then } = createBdd(test);

When('I open the filter sheet', async ({ catalog }) => {
  await catalog.openFilterDrawer();
});

When('I choose the year option {string}', async ({ catalog }, key) => {
  await catalog.yearOption(key).click();
});

Then('the year option {string} is active', async ({ catalog }, key) => {
  expect(await catalog.yearOptionActive(key)).toBe(true);
});

Then('the year option {string} is inactive', async ({ catalog }, key) => {
  expect(await catalog.yearOptionActive(key)).toBe(false);
});

Then('every visible card\'s year is between {int} and {int}', async ({ catalog }, from, to) => {
  const years = await catalog.visibleCardYears();
  // An empty shelf would pass the range check vacuously while proving only
  // that the filter emptied the screen — which is its own failure.
  expect(years.length, 'the decade filter left nothing to check').toBeGreaterThan(0);
  for (const y of years) {
    expect(y, 'a card outside the chosen decade').toBeGreaterThanOrEqual(from);
    expect(y).toBeLessThanOrEqual(to);
  }
});

Given('I remember how many cards the shelf shows', async ({ catalog, ctx }) => {
  ctx.rememberedCardCount = await catalog.cardCount();
  expect(ctx.rememberedCardCount).toBeGreaterThan(0);
});

Then('the shelf shows the remembered number of cards again', async ({ catalog, ctx }) => {
  expect(await catalog.cardCount()).toBe(ctx.rememberedCardCount);
});

Then('the provider filter, when offered, narrows the shelf without emptying it', async ({ catalog }) => {
  const offered = await catalog.providerFilterOffered();
  test.skip(!offered, 'no provider options yet — the provider pass has not populated the catalogue');
  const before = await catalog.cardCount();
  await catalog.providerOption(0).click();
  const after = await catalog.cardCount();
  // Options are built FROM the catalogue, so the narrowed shelf can never
  // be empty — an empty result would mean the option lied.
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThanOrEqual(before);
  // And a second tap clears it (REQ U-6), restoring the shelf.
  await catalog.providerOption(0).click();
  expect(await catalog.cardCount()).toBe(before);
});
