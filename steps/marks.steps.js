// Steps for marking a film (features/marks.feature): the score given in the
// film card's meter, «Не дивився», the counts and what the archive lists.
// These WRITE, into the test account's own lists only, and every film a step
// scores is recorded in ctx.marked so the fixture's teardown clears it.
// Thin wrappers; every selector lives in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { modalOf } = require('../support/modal-of');
const { skipWithoutData } = require('../support/skips');
const { When, Then, Given } = createBdd(test);

const countFor = async (catalog, tab) =>
  tab === 'Дивився' ? await catalog.watchedTabCount() : await catalog.likedTabCount();

Then('the {string} tab count matches the films it lists', async ({ catalog }, tab) => {
  // The figure on the account's statistics and the films under it are one count (2026-10-03).
  const list = tab === 'Дивився' ? 'watched' : 'liked';
  const figure = await catalog.archiveFigureCount(list);
  skipWithoutData(figure === 0, `nothing marked as "${tab}" right now`);
  expect(await catalog.archiveListedCount()).toBe(figure);
});
Given('I remember the {string} count', async ({ catalog, ctx }, tab) => {
  ctx.counts = ctx.counts || {};
  ctx.counts[tab] = await countFor(catalog, tab);
});
/* A film is marked by the score given in its card (the meter); see
 * pages/MoviemeterPanel.js for the ladder from number to marks. */
When('I give the first film a score of {string}', async ({ catalog, ctx, page }, score) => {
  ctx.title = await catalog.cardTitleText(0);
  ctx.key = await catalog.cardKey(0);
  expect(ctx.key, 'the first card carries no film key: it cannot be scored').toMatch(/^movie:\d+$/);
  // Recorded BEFORE the score, so a failure from here on is still cleared.
  ctx.marked.push({ key: ctx.key, title: ctx.title });
  await catalog.openCard(0);
  const modal = modalOf(ctx, page);
  await modal.waitUntilOpen();
  await modal.meter.give(score);
});
When('I give that film a score of {string}', async ({ ctx, page }, score) => {
  await modalOf(ctx, page).meter.give(score);
});
When('I open that film\'s card from the shelf', async ({ catalog, ctx, page }) => {
  expect(await catalog.openCardWithKey(ctx.key), `"${ctx.title}" is not on the shelf`).toBe(true);
  await modalOf(ctx, page).waitUntilOpen();
});
When('I say I have not seen it', async ({ catalog, ctx, page }) => {
  await modalOf(ctx, page).meter.clear();
  await catalog.saveMarks();
  ctx.marked = ctx.marked.filter(m => m.key !== ctx.key);
});
Then('the card shows the score {string}', async ({ ctx, page }, score) => {
  await expect.poll(() => modalOf(ctx, page).meter.valueText()).toBe(score);
});
Then('the card shows no score', async ({ ctx, page }) => {
  await expect.poll(() => modalOf(ctx, page).meter.valueText()).toBe('—');
});
Then('the meter lights the {string} badge', async ({ ctx, page }, word) => {
  const want = { 'Рекомендую': 'liked', 'Обовʼязково': 'must' }[word];
  await expect.poll(() => modalOf(ctx, page).meter.litBadge()).toBe(want);
});
Then('that film is shown as watched', async ({ catalog, ctx }) => {
  expect(await catalog.cardWithKeyIsWatched(ctx.key)).toBe(true);
});
When('I reload the catalog', async ({ catalog }) => {
  await catalog.reload();
});
Then('the {string} count is one higher than remembered', async ({ catalog, ctx }, tab) => {
  await expect.poll(() => countFor(catalog, tab)).toBe(((ctx.counts || {})[tab] || 0) + 1);
});
Then('the {string} count is still one higher than remembered', async ({ catalog, ctx }, tab) => {
  await expect.poll(() => countFor(catalog, tab)).toBe(((ctx.counts || {})[tab] || 0) + 1);
});
Then('the {string} count is back to what I remembered', async ({ catalog, ctx }, tab) => {
  await expect.poll(() => countFor(catalog, tab)).toBe((ctx.counts || {})[tab]);
});
Then('that title is listed', async ({ catalog, ctx }) => {
  expect(await catalog.revealCardWithKey(ctx.key), `"${ctx.title}" is not listed`).toBeGreaterThanOrEqual(0);
});
Then('that title is not listed', async ({ catalog, ctx }) => {
  await expect.poll(() => catalog.cardWithKey(ctx.key).count()).toBe(0);
});
