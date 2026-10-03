// Steps over CatalogPage: the bars, search, views, the filter window's
// options, the archive in the account, marks, the account and the
// collections page. Thin wrappers; every selector lives in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { NewCollectionPage } = require('../pages/NewCollectionPage');
const { baseUrl } = require('../support/base-url');
const { skipWithoutData } = require('../support/skips');
const { Given, When, Then } = createBdd(test);

function overlaps(a, b) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x ||
           a.y + a.height <= b.y || b.y + b.height <= a.y);
}

/* ---- the build stamp ---- */
Then('the served page carries the deployed build stamp', async ({ catalog }) => {
  const expected = process.env.DEPLOY_STAMP;
  test.skip(!expected, 'no DEPLOY_STAMP in the environment: a run by hand, or a deploy that predates the stamp');
  // The ref and sha of the build the workflow was told about, both printed
  // on a mismatch: neither is secret, and the pair says which release the
  // CDN handed the browser instead.
  await expect.poll(() => catalog.buildStamp(), {
    message: `the page under test is not build ${expected}`,
    timeout: 10_000,
  }).toBe(expected);
});

/* ---- catalog basics ---- */
Then('the catalog shows at least one movie', async ({ catalog }) => {
  expect(await catalog.cardCount()).toBeGreaterThan(0);
});
Then('the catalogue has stopped arriving', async ({ page }) => {
  expect(await page.evaluate(() => window.__catalogueLoaded)).toBe(true);
  // Two reads half a second apart that agree, polled until they do: a
  // batch still landing fails the read and the next pair is tried, instead
  // of one fixed sleep that was either too short or dead time.
  let last = -1;
  await expect(async () => {
    const now = await page.evaluate(() => MOVIES.length);
    const stable = now === last;
    last = now;
    expect(stable, `the catalogue is still arriving (${now} films)`).toBe(true);
  }).toPass({ intervals: [500], timeout: 10_000 });
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
  skipWithoutData(ctx.awardCardIndex === -1, 'no movie with awards in the catalog right now');
});
Then('that card shows the award row with no ceremony names', async ({ catalog, ctx }) => {
  const row = catalog.cardAwardsRow(ctx.awardCardIndex);
  await expect(row).toBeVisible();
  // Two labels since 2026-09-25: the cup counts wins, the ring beside it
  // nominations. Each is a bare number; the ceremonies stay behind the tap.
  const labels = catalog.cardAwardLabels(ctx.awardCardIndex);
  const n = await labels.count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(2);
  for (let i = 0; i < n; i++) {
    expect((await labels.nth(i).innerText()).trim()).toMatch(/^\d+$/);
    expect(await labels.nth(i).getAttribute('title')).toMatch(/^(Нагороди|Номінації)$/);
  }
});
When("I tap that card's award row", async ({ catalog, ctx }) => {
  await catalog.cardAwardLabels(ctx.awardCardIndex).first().click();
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

/* ---- the archive: the account's statistics and its figures ---- */
const ARCHIVE_LIST = { 'Усі': 'watched', 'Переглянуто': 'watched', 'Рекомендую': 'liked', 'Обовʼязково': 'must', 'Фільмів': 'films', 'Серіалів': 'series' };
When('I isolate the catalog to watched films', async ({ catalog }) => {
  await catalog.openArchive('watched');
});
When('I narrow the archive to {string}', async ({ catalog }, word) => {
  await catalog.openArchive(ARCHIVE_LIST[word]);
});
When('I press the {string} figure', async ({ catalog }, word) => {
  await catalog.archiveFigure(ARCHIVE_LIST[word]).click();
});
Then('the {string} figure is lit, and its films stand under it', async ({ catalog }, word) => {
  const list = ARCHIVE_LIST[word];
  await expect.poll(() => catalog.archiveFigureActive(list)).toBe(true);
  await expect(catalog.archiveList).toHaveAttribute('data-list', list);
});
Then('the {string} figure is not lit', async ({ catalog }, word) => {
  await expect.poll(() => catalog.archiveFigureActive(ARCHIVE_LIST[word])).toBe(false);
});
Then('the strip offers no archive tab', async ({ catalog }) => {
  // The strip must be drawn first, or the check would pass on an empty bar.
  await expect.poll(() => catalog.stripTabCount()).toBeGreaterThan(0);
  await expect(catalog.stripTab('seen')).toHaveCount(0);
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
  // Booleans only: a failed `expect(name)` prints the value in `Received:`,
  // and that line lands in the published report and the public log. The
  // name is the test account's username.
  const name = await catalog.accountUsername();
  expect(name.length > 0, 'the account panel shows no name').toBe(true);
  expect(name.includes('@'), 'the account panel shows the e-mail form of the name').toBe(false);
});
Then('the account panel entry point is visible', async ({ catalog }) => {
  await expect(catalog.accountEntryPoint).toBeVisible();
});
Then('the account panel shows my picture in a circle', async ({ catalog }) => {
  await expect(catalog.accountAvatar).toBeVisible();
});
Then('the account\'s pages are: {string}', async ({ catalog }, names) => {
  expect(await catalog.accountPageNames()).toEqual(names.split(',').map(s => s.trim()));
});
Then('the header\'s words are: {string}', async ({ catalog }, names) => {
  expect(await catalog.headerWords()).toEqual(names.split(',').map(s => s.trim()));
});
When('I press the header word {string}', async ({ catalog }, word) => {
  await catalog.pressHeaderWord(word);
});
Then('the watching page is open', async ({ catalog }) => {
  await expect(catalog.watchingPage).toHaveClass(/\bopen\b/);
  // Either the series under way or the line that says what the page is for.
  await expect(catalog.watchingPage.locator('[data-watching-grid] .card, .empty-hint').first()).toBeVisible();
});
Then('the watching page is closed', async ({ catalog }) => {
  await expect(catalog.watchingPage).not.toHaveClass(/\bopen\b/);
});
Then('the swipe deck stands in the account with one film on it', async ({ catalog }) => {
  await expect(catalog.accountSwipeDeck).toBeVisible();
  await expect.poll(() => catalog.accountSwipeDeck.locator('.card').count()).toBe(1);
});
Then('the statistics page is open to everybody, and its pages past the first are PRO\'s', async ({ catalog }) => {
  await catalog.openAccountPage('Статистика');
  await expect(catalog.accountStats).toBeVisible();
  await expect(catalog.archiveFigure('watched')).toBeVisible();
  const { locked, pro } = await catalog.statisticsLock();
  expect(locked).toBe(!pro);
});
When('I open the account\'s {string} page', async ({ catalog }, name) => {
  await catalog.openAccountPage(name);
});
When('I open the profile editor', async ({ catalog }) => {
  await catalog.openProfileEditor();
});
Then('the profile head shows four numbers', async ({ catalog }) => {
  await expect(catalog.profileHead).toBeVisible();
  await expect(catalog.profileNumbers).toHaveCount(4);
  // Each is a figure over a word, and the figure is a number.
  const figures = await catalog.profileFigures();
  for (const f of figures) expect(f, 'a figure that is not a number').toMatch(/^\d+$/);
});
Then('the strip lends the account no row', async ({ catalog }) => {
  await expect(catalog.stripWindowRow).toBeHidden();
  await expect(catalog.stripSubRow).toBeHidden();
});
Then('the services are listed', async ({ catalog }) => {
  await expect.poll(() => catalog.accountServices.count()).toBeGreaterThan(0);
});
Then('the achievements are listed', async ({ catalog }) => {
  await expect.poll(() => catalog.accountAchievements.count()).toBeGreaterThan(0);
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
        await page.goto(baseUrl() + 'login', { waitUntil: 'domcontentloaded' });
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
Then('the recommendation sources are: {string}', async ({ catalog }, list) => {
  expect(await catalog.recsSourceTabs()).toEqual(list.split(', '));
});
Then("the friends' two lists stand in the account, as a switch on the page", async ({ catalog }) => {
  await expect(catalog.accountFriends).toBeVisible();
  await expect.poll(() => catalog.friendsLists()).toEqual(['Підписки', 'Підписники']);
});
Then('the trash lists what was removed or says it is empty', async ({ catalog }) => {
  await expect(catalog.trashList).toBeVisible();
  expect((await catalog.recsBodyText()).length, 'an empty panel reads as broken').toBeGreaterThan(0);
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

Then("the header's words are out", async ({ catalog }) => {
  await expect(catalog.headerWordsOut).toHaveCount(1);
  await expect(catalog.headerHandle).toHaveAttribute('aria-expanded', 'true');
});
Then("the header's words are tucked in", async ({ catalog }) => {
  await expect(catalog.headerWordsTucked).toHaveCount(1);
  await expect(catalog.headerHandle).toHaveAttribute('aria-expanded', 'false');
});
When("I press the header's handle", async ({ catalog }) => {
  await catalog.pressHeaderHandle();
});
When('I scroll the shelf down', async ({ catalog }) => {
  await catalog.scrollTo(600);
});
