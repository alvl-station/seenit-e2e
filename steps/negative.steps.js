// Steps for the dead-end paths: an empty search, a TMDb miss, and the
// read-only confirm card. The assertions deliberately check the TEXT a
// person reads — "no cards are visible" would pass against a blank page,
// which is exactly the failure these guard against.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { AddModalPage } = require('../pages/AddModalPage');
const { Given, When, Then } = createBdd(test);

// The facts fetched from TMDb / OMDb / Wikidata, in render order.
//
// Жанр joined them (owner's call): it decides which section of the catalogue
// a film lands in, and a hand-picked one put the same film in different
// places depending on who added it. It is shown, not offered — so it left
// the owned list below and leads this one.
const FETCHED_FACT_LABELS = ['Жанр', 'Рік', 'Рейтинг', 'Відсоток критиків',
  'Акторський склад', 'Нагороди — перемоги', 'Нагороди — номінації'];
// Everything a person genuinely owns and must keep control of.
const OWNED_FIELD_IDS = ['cfDesc', 'cfRecByNew', 'cfRecBySelect',
  'cfTitleEn', 'cfTitleUk', 'cfType'];

function addModalOf(ctx, page) {
  if (!ctx.addModal) ctx.addModal = new AddModalPage(page);
  return ctx.addModal;
}

/* ---- catalog dead ends ---- */
Then('the empty state explains that nothing was found', async ({ catalog }) => {
  const text = await catalog.emptyMessageText();
  expect(text, 'an empty result must show a message, not a blank page').toBeTruthy();
  expect(text).toContain('Нічого не знайдено');
});
Then('no movie cards are shown', async ({ catalog }) => {
  expect(await catalog.cardCount()).toBe(0);
});
Then('no empty state is shown', async ({ catalog }) => {
  expect(await catalog.emptyMessageText()).toBeNull();
});

/* ---- add modal dead end ---- */
When('I search there for {string}', async ({ ctx, page }, query) => {
  const add = addModalOf(ctx, page);
  await add.searchInput().fill(query);
  await add.searchButton().click();
});
Then('the add modal reports that nothing was found', async ({ ctx, page }) => {
  const results = addModalOf(ctx, page).results();
  await expect(results).toContainText(/Нічого не знайдено|не знайдено/i, { timeout: 20000 });
});

/* ---- read-only confirm card ---- */
// Takes `catalog` even though it never touches it: playwright-bdd builds the
// test's fixture list from the steps' signatures, so a scenario whose steps
// all use only `page` never runs the fixture that logs in and NAVIGATES —
// the run then times out on a blank about:blank. Depending on it explicitly
// is what puts a loaded page under this step.
When('I open the add modal and preview a fetched movie', async ({ catalog, ctx, page }) => {
  await addModalOf(ctx, page).open();
  // Render the confirm card directly with a fully-fetched movie: going
  // through the TMDb search would depend on a live third-party result, and
  // this scenario is about how fetched data is PRESENTED, not fetched.
  await page.evaluate(() => {
    renderConfirmCard({
      id: 'e2e-preview-2023', canonical_title_uk: 'Демо', canonical_title_en: 'Demo',
      year: 2023, type: 'фільм', genre: 'драма', genre_group: 'Драми',
      rating: 'IMDb 8.2', critic_score: 93, description_uk: 'Опис.',
      cast: ['Cillian Murphy', 'Emily Blunt'],
      awards_won: ['Academy Award за найкращий фільм'],
      awards_nominated: ['BAFTA за найкращий сценарій'],
    });
  });
  await expect(page.locator('#addResults .cf-readonly').first()).toBeVisible();
});
Then('exactly the fetched facts are shown as read-only text', async ({ ctx, page }) => {
  const labels = await page.$$eval('#addResults .cf-readonly', els => els.map(el => {
    let prev = el.previousElementSibling;
    while (prev && !prev.classList.contains('cf-label')) prev = prev.previousElementSibling;
    return prev ? prev.textContent.trim() : '(no label)';
  }));
  expect(labels).toEqual(FETCHED_FACT_LABELS);
});
Then('only the fields a person owns remain editable', async ({ ctx, page }) => {
  const ids = (await page.$$eval('#addResults input, #addResults textarea, #addResults select',
    els => els.map(el => el.id))).sort();
  // Asserted both ways on purpose: an extra id means something became
  // editable that must not be; a missing one means an owned field got
  // locked down by accident.
  expect(ids).toEqual(OWNED_FIELD_IDS);
});
Then('the source facts sit under the «З джерела» line', async ({ page }) => {
  // The book's form (A-6): the labeled divider is the explanation now —
  // everything under «З джерела · не редагується» is plain text, and every
  // read-only fact renders below it.
  const divider = page.locator('#addResults .src-divider');
  await expect(divider).toBeVisible();
  await expect(divider).toContainText('З джерела');
  const above = await page.$$eval('#addResults .src-divider', els => {
    const d = els[0];
    return [...document.querySelectorAll('#addResults .cf-readonly')]
      .filter(ro => !(d.compareDocumentPosition(ro) & 4)).length;
  });
  expect(above, 'a source fact rendered above the divider').toBe(0);
});
