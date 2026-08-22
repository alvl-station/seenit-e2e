// Basic smoke coverage, run against the just-deployed live site (see
// the seenit-frontend deploy chain: deploy.yml dispatches run-smoke here) as the gate before a
// release is tagged. This is deliberately NOT exhaustive — CLAUDE.md's
// convention going forward is that each PR adding a user-facing feature
// extends this suite: one test for the new feature, plus strengthening
// coverage of one existing feature already here.
//
// The app has no per-user data (kino/watched, kino/liked are global refs,
// not scoped by uid — see src/app.js) — every login sees and can mutate the
// SAME real catalog. So these tests are read-only on purpose: log in,
// look, search, open/close a modal. Never toggle "переглянуто"/"рекомендую"
// or add/delete a movie here, that would corrupt real data through CI.
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { CatalogPage } = require('./pages/CatalogPage');
const { MovieModalPage } = require('./pages/MovieModalPage');

test.beforeEach(async ({ page }) => {
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
});

test('logs in and loads the catalog', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.waitForCatalogLoaded();
  expect(await catalog.cardCount()).toBeGreaterThan(0);
});

test('search narrows the catalog down and clearing it restores the list', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.waitForCatalogLoaded();

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

test('opening a card shows the movie modal, closing it hides it again', async ({ page }) => {
  const catalog = new CatalogPage(page);
  const modal = new MovieModalPage(page);
  await catalog.waitForCatalogLoaded();

  await catalog.openCard(0);
  await modal.waitUntilOpen();
  await expect(modal.title).not.toBeEmpty();

  await modal.close();
});
