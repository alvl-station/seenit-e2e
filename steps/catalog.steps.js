// Steps over CatalogPage: the bars, search, views, the filter window's
// options, the archive and its words, marks, the account and the
// collections page. Thin wrappers; every selector lives in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { NewCollectionPage } = require('../pages/NewCollectionPage');
const { Given, When, Then } = createBdd(test);

function overlaps(a, b) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x ||
           a.y + a.height <= b.y || b.y + b.height <= a.y);
}

/* ---- catalog basics ---- */
Then('the catalog shows at least one movie', async ({ catalog }) => {
  expect(await catalog.cardCount()).toBeGreaterThan(0);
});
Then('the catalogue has stopped arriving', async ({ page }) => {
  expect(await page.evaluate(() => window.__catalogueLoaded)).toBe(true);
  const before = await page.evaluate(() => MOVIES.length);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => MOVIES.length);
  expect(after).toBe(before);
});
Then('I see the empty state {string}', async ({ catalog }, text) => {
  await expect(catalog.emptyMessage).toBeVisible();
  await expect(catalog.emptyMessage).toContainText(text);
});

/* ---- views and layout geometry ---- */
When('I switch the view to {string}', async ({ catalog }, view) => {
  await catalog.switchView(view);
  expect(await catalog.currentView()).toBe(view);
});
Given('I remember the width of the first poster', async ({ catalog, ctx }) => {
  const box = await catalog.cardPoster(0).boundingBox();
  expect(box).not.toBeNull();
  ctx.posterWidth = box.width;
});
Then('the first poster is narrower than remembered', async ({ catalog, ctx }) => {
  const box = await catalog.cardPoster(0).boundingBox();
  expect(box.width).toBeLessThan(ctx.posterWidth);
});
Given('the catalog has a movie with awards', async ({ catalog, ctx }) => {
  ctx.awardCardIndex = await catalog.firstCardIndexWithAwards();
  test.skip(ctx.awardCardIndex === -1, 'no movie with awards in the catalog right now');
});
Then('that card shows the award row with no ceremony names', async ({ catalog, ctx }) => {
  const row = catalog.cardAwardsRow(ctx.awardCardIndex);
  await expect(row).toBeVisible();
  // The tile shows a trophy and one sum; the ceremonies stay behind the tap.
  const text = (await row.innerText()).trim();
  expect(text).toMatch(/^\d+$/);
  expect(await row.getAttribute('title')).toMatch(/Нагороди/);
});
When("I tap that card's award row", async ({ catalog, ctx }) => {
  await catalog.cardAwardsRow(ctx.awardCardIndex).click();
});
Then('the award breakdown popover is shown', async ({ catalog }) => {
  await expect(catalog.infoPopover).toBeVisible();
  const text = (await catalog.infoPopover.innerText()).trim();
  expect(text.length).toBeGreaterThan(0);
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

Then('the shelf drop is shown with three keys', async ({ catalog, page }) => {
  await expect(catalog.shelfDrop).toBeVisible();
  expect(await page.locator('#shelfDrop .shelf-drop-key').count()).toBe(3);
  // Centred on the screen, which is what makes it read as the shelf's own.
  const box = await catalog.shelfDrop.boundingBox();
  const width = page.viewportSize().width;
  expect(Math.abs((box.x + box.width / 2) - width / 2)).toBeLessThan(2);
});
Then('the shelf drop is gone', async ({ catalog }) => {
  await expect(catalog.shelfDrop).toBeHidden();
});

/* ---- the genre options in the filter window ---- */
Given('the catalog has more than one genre', async ({ catalog }) => {
  test.skip(await catalog.genreOptionCount() < 2, 'catalog has fewer than two genres right now');
});
When('I tap the first genre option', async ({ catalog }) => {
  await catalog.openFilterDrawer();
  await catalog.genreOption(0).click();
});
Then('that option is active', async ({ catalog }) => {
  expect(await catalog.optionIsActive(catalog.genreOption(0))).toBe(true);
});
Then('that option is inactive', async ({ catalog }) => {
  expect(await catalog.optionIsActive(catalog.genreOption(0))).toBe(false);
});
Then('no genre option is chosen', async ({ catalog }) => {
  expect(await catalog.noGenreChosen()).toBe(true);
});
Given('I remember the border color of the first genre option', async ({ catalog, ctx }) => {
  await catalog.openFilterDrawer();
  ctx.restingBorder = await catalog.optionBorderColor(catalog.genreOption(0));
});
When('I touch-tap the first genre option', async ({ catalog }) => {
  await catalog.openFilterDrawer();
  await catalog.genreOption(0).tap();
});
When('I touch-tap the first genre option again', async ({ catalog }) => {
  await catalog.genreOption(0).tap();
});
Then('the option is inactive and its border color matches the remembered one', async ({ catalog, ctx }) => {
  const opt = catalog.genreOption(0);
  expect(await catalog.optionIsActive(opt)).toBe(false);
  expect(await catalog.optionBorderColor(opt)).toBe(ctx.restingBorder);
});

/* ---- the archive and its words ---- */
When('I isolate the catalog to watched films', async ({ catalog }) => {
  await catalog.openArchive();
});
When('I narrow the archive to {string}', async ({ catalog }, word) => {
  const mark = { 'Усі': 'all', 'Рекомендую': 'liked', 'Обовʼязково': 'must' }[word];
  await catalog.tapMarkWord(mark);
  await expect.poll(() => catalog.markWordActive(mark)).toBe(true);
});
When('I tap the {string} word', async ({ catalog }, word) => {
  const mark = { 'Усі': 'all', 'Рекомендую': 'liked', 'Обовʼязково': 'must' }[word];
  await catalog.tapMarkWord(mark);
});
Then('the {string} word is active', async ({ catalog }, word) => {
  const mark = { 'Усі': 'all', 'Рекомендую': 'liked', 'Обовʼязково': 'must' }[word];
  await expect.poll(() => catalog.markWordActive(mark)).toBe(true);
});
Then('the {string} word is inactive', async ({ catalog }, word) => {
  const mark = { 'Усі': 'all', 'Рекомендую': 'liked', 'Обовʼязково': 'must' }[word];
  await expect.poll(() => catalog.markWordActive(mark)).toBe(false);
});
Then('the archive shows everything', async ({ catalog }) => {
  await expect.poll(() => catalog.markWordActive('all')).toBe(true);
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

/* ---- deleting is nowhere near the shelf ---- */
Then('the strip offers no way to delete films', async ({ catalog }) => {
  expect(await catalog.stripTab('delete').count()).toBe(0);
});
Then('the delete bar is hidden', async ({ catalog }) => {
  expect(await catalog.deleteBarIsVisible()).toBe(false);
});
Then('no card is selected for deletion', async ({ catalog }) => {
  expect(await catalog.selectedCount()).toBe(0);
});
Then('the movie modal is not open', async ({ catalog }) => {
  expect(await catalog.modalIsOpen()).toBe(false);
});

/* ---- marks (these write, into the test account's own lists) ---- */
const countFor = async (catalog, tab) =>
  tab === 'Дивився' ? await catalog.watchedTabCount() : await catalog.likedTabCount();

Then('the {string} tab count matches the films it lists', async ({ catalog }, tab) => {
  // The shelf is films or series, so the archive lists the mark's films of this shelf.
  const count = await countFor(catalog, tab);
  test.skip(count === null, `nothing marked as "${tab}" right now`);
  const expected = await catalog.archiveExpected(tab === 'Дивився' ? 'watched' : 'liked');
  expect(expected).toBeGreaterThan(0);
  await expect.poll(() => catalog.listedCount()).toBe(expected);
});
Given('I remember the {string} count', async ({ catalog, ctx }, tab) => {
  ctx.counts = ctx.counts || {};
  ctx.counts[tab] = await countFor(catalog, tab);
});
Given('I remember the title of the first card', async ({ catalog, ctx }) => {
  ctx.title = await catalog.cardTitleText(0);
});
When('I toggle {string} on the first card', async ({ catalog, ctx }, which) => {
  ctx.title = await catalog.cardTitleText(0);
  ctx.marked.push({ title: ctx.title, which });
  if (which === 'переглянуто') await catalog.toggleWatchedOnCard(0);
  else await catalog.toggleLikedOnCard(0);
});
When('I toggle {string} on that film', async ({ catalog, ctx }, which) => {
  ctx.marked = (ctx.marked || []).filter(m => !(m.title === ctx.title && m.which === which));
  if (which === 'переглянуто') await catalog.toggleWatchedOnCardTitled(ctx.title);
  else await catalog.toggleLikedOnCardTitled(ctx.title);
});
Then('that film is shown as watched', async ({ catalog, ctx }) => {
  expect(await catalog.cardTitledIsWatched(ctx.title)).toBe(true);
});
When('I reload the catalog', async ({ catalog, page }) => {
  await page.reload();
  await catalog.waitForCatalogLoaded();
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
  await expect.poll(() => catalog.indexOfCardTitled(ctx.title)).toBeGreaterThanOrEqual(0);
});

/* ---- account ---- */
When('I open the account panel', async ({ catalog }) => {
  await catalog.openAccountPanel();
});
When('I close the account panel', async ({ catalog }) => {
  await catalog.closeAccountPanel();
});
Then('the account panel is open', async ({ catalog }) => {
  expect(await catalog.accountPanelIsOpen()).toBe(true);
});
Then('the account panel is closed', async ({ catalog }) => {
  expect(await catalog.accountPanelIsOpen()).toBe(false);
});
Then('the account panel shows the signed-in username', async ({ catalog }) => {
  const name = await catalog.accountUsername();
  expect(name.length).toBeGreaterThan(0);
  expect(name).not.toContain('@');
});
Then('the account panel entry point is visible', async ({ catalog }) => {
  await expect(catalog.accountEntryPoint).toBeVisible();
});
Then('the account panel offers a password change', async ({ page }) => {
  const toggle = page.locator('#accPassToggle');
  await expect(toggle).toBeVisible();
  await expect(page.locator('#accPassForm')).toBeHidden();
  await toggle.click();
  await expect(page.locator('#accPassForm')).toBeVisible();
});

Then('a fresh visitor sees the password form and the Google button', async ({ browser }) => {
  test.info().setTimeout(120_000);
  // A new, empty context: the shared one carries the saved session.
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  const pageProblems = [];
  page.on('pageerror', err => pageProblems.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') pageProblems.push(`console.error: ${msg.text().slice(0, 200)}`);
  });
  try {
    // Retried: a run minutes after a deploy can meet a cold edge.
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        // The root sends a fresh visitor to the landing; the form is at /login.
        await page.goto((process.env.BASE_URL || 'https://seenit-app.pages.dev/') + 'login', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        await page.waitForTimeout(8000);
      }
    }
    if (lastErr) {
      const state = await page.evaluate(() => ({
        overlay: (document.getElementById('loginOverlay') || {}).className,
        firebaseLoaded: typeof window.firebase !== 'undefined',
        splashHidden: (document.getElementById('bootSplash') || {}).hidden,
      })).catch(() => 'page unreachable');
      throw new Error(`the login screen never showed. Page state: ${JSON.stringify(state)}; `
        + `problems: ${pageProblems.slice(0, 5).join(' | ') || 'none reported'}\n${lastErr.message}`);
    }
    await expect(page.locator('#googleBtn')).toBeVisible();
    await expect(page.locator('#registerToggle')).toBeVisible();
  } finally {
    await ctx.close();
  }
});

/* ---- the collections page ---- */
When('I open the recommendations flow', async ({ catalog }) => {
  await catalog.openRecs();
});
When('I close the recommendations flow', async ({ catalog }) => {
  await catalog.closeRecs();
});
Then('the recommendations flow is open', async ({ catalog }) => {
  expect(await catalog.recsIsOpen()).toBe(true);
});
Then('the recommendations flow is closed', async ({ catalog }) => {
  expect(await catalog.recsIsOpen()).toBe(false);
});
Then('the recommendation sources are {string}, {string}, {string} and {string}', async ({ catalog }, a, b, c, d) => {
  expect(await catalog.recsSourceTabs()).toEqual([a, b, c, d]);
});
When('I switch the recommendations source to {string}', async ({ catalog }, id) => {
  await catalog.switchRecsSource(id);
});
Then('the friends source lists people or says where to find them', async ({ catalog }) => {
  const body = await catalog.recsBodyText();
  expect(body.length, 'an empty panel reads as broken').toBeGreaterThan(0);
  expect(body).not.toMatch(/в планах|поки не можна/,
    'the feature shipped — the placeholder must not outlive it');
});
Then('at least {int} collections are listed', async ({ catalog, page }, n) => {
  await page.locator('#recsbody .col-block-name').first().waitFor({ timeout: 10000 });
  expect((await catalog.recsCollectionNames()).length).toBeGreaterThanOrEqual(n);
});
When('I open the first listed collection', async ({ catalog, ctx }) => {
  const names = await catalog.recsCollectionNames();
  expect(names.length).toBeGreaterThan(0);
  ctx.collectionName = names[0];
  await catalog.openRecsCollection(names[0]);
});
Then("the state plate reads that collection's name", async ({ page, ctx }) => {
  const plate = page.locator('#collectionPlate');
  await expect(plate).toBeVisible();
  await expect(plate).toContainText(ctx.collectionName);
});
When('I close the state plate', async ({ page }) => {
  await page.locator('#collectionPlateClose').click();
});
Then('the state plate is gone', async ({ page }) => {
  await expect(page.locator('#collectionPlate')).toBeHidden();
});
Then('the catalog shows between {int} and {int} films', async ({ catalog, page }, lo, hi) => {
  await page.locator('#main .card').first().waitFor({ state: 'attached', timeout: 10000 });
  const n = await catalog.listedCount();
  expect(n).toBeGreaterThanOrEqual(lo);
  expect(n).toBeLessThanOrEqual(hi);
});
Then('the recommendations entry point is visible', async ({ catalog }) => {
  await expect(catalog.recsEntryPoint).toBeVisible();
});

/* ---- the strip is not arranged any more ---- */
Then('the strip offers no arrange tab', async ({ catalog }) => {
  // Only meaningful once the strip is drawn at all.
  await expect.poll(() => catalog.stripTabCount()).toBeGreaterThan(0);
  expect(await catalog.stripTab('arrange').count(), 'the «Меню» tab came back').toBe(0);
});
Then('the arrange sheet does not exist', async ({ catalog }) => {
  expect(await catalog.arrangeSheetCount()).toBe(0);
});

/* ---- «Нова добірка» (opened and closed only — never created) ---- */
When('I press «Створити» on the collections page', async ({ ctx, page }) => {
  ctx.newCollection = new NewCollectionPage(page);
  await ctx.newCollection.open();
});
Then('the new collection name field is visible and nothing covers it', async ({ ctx }) => {
  await expect(ctx.newCollection.nameField).toBeVisible();
  // Polled: the window slides in, and its centre moves until it lands.
  await expect.poll(() => ctx.newCollection.nameFieldIsOnTop(), {
    message: 'a tap on the name field lands on something drawn over it — the window opened behind the page',
  }).toBe(true);
});
When('I close the new collection window', async ({ ctx }) => {
  await ctx.newCollection.close();
});
Then('the new collection window is closed', async ({ ctx }) => {
  expect(await ctx.newCollection.isOpen()).toBe(false);
});

/* ---- the two shelves ---- */
When('I switch the shelf to {string}', async ({ catalog }, id) => {
  await catalog.showShelf(id);
});
