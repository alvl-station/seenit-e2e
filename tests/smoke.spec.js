// Area: core smoke — login, search, movie modal.
// The original 3-test gate the deploy chain runs first; everything else in
// tests/ grew from BUGS.md/REQUIREMENTS.md on top of it. Read-only (T-4).
const { test, expect } = require('../support/fixtures');
const { MovieModalPage } = require('../pages/MovieModalPage');

test('logs in and loads the catalog', async ({ catalog }) => {
  expect(await catalog.cardCount()).toBeGreaterThan(0);
});

test('search narrows the catalog down and clearing it restores the list', async ({ catalog }) => {
  // matches() (src/logic.js) does fuzzy substring matching where a real
  // catalog word contained *inside* the query also counts as a hit, and
  // that includes single-digit/short-number words (title suffixes like
  // "99", "1917", "№9" split out as their own haystack word). A first
  // attempt using real Ukrainian words false-positived on a title
  // literally containing "фільм"; a second attempt ending in "999" then
  // false-positived on "Бійка в блоці 99" (Brawl in Cell Block 99) purely
  // because "999".includes("99") — confirmed locally against the real
  // deployed catalog both times. No digits at all, and a consonant
  // cluster no real word/cast name is a substring of either direction,
  // is what actually can't false-positive (verified locally against
  // several digit-suffixed titles: "Бійка в блоці 99", "1917", "Район №9").
  await catalog.search('qzxjkvbqzxjkvbqzxjkvb');
  await expect(catalog.emptyMessage).toBeVisible();
  await expect(catalog.emptyMessage).toContainText('Нічого не знайдено');

  await catalog.search('');
  await catalog.waitForCatalogLoaded();
  expect(await catalog.cardCount()).toBeGreaterThan(0);
});

test('opening a card shows the movie modal, closing it hides it again', async ({ catalog, page }) => {
  const modal = new MovieModalPage(page);
  await catalog.openCard(0);
  await modal.waitUntilOpen();
  await expect(modal.title).not.toBeEmpty();
  await modal.close();
});
