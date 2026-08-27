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
Then('the catalogue has stopped arriving', async ({ page }) => {
  // Every index-based scenario silently depends on this, so it is worth one
  // scenario asserting it outright rather than only discovering it as a
  // flake. The catalogue comes from D1 in pages, and each page re-sorts and
  // re-groups the grid — a card's POSITION means nothing until it stops.
  expect(await page.evaluate(() => window.__catalogueLoaded)).toBe(true);
  // And the beacon is checked against the thing it claims: the film count
  // must not move while nobody is doing anything.
  const before = await page.evaluate(() => MOVIES.length);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => MOVIES.length);
  expect(after).toBe(before);
});
When('I search for {string}', async ({ catalog }, query) => {
  await catalog.search(query);
});
Then('I see the empty state {string}', async ({ catalog }, text) => {
  // The query filters the PAGE, so a search that finds nothing lands in the
  // grid's own empty panel — the layer that used to hold its own dead end
  // is gone.
  await expect(catalog.emptyMessage).toBeVisible();
  await expect(catalog.emptyMessage).toContainText(text);
});
When('I open the search field', async ({ catalog }) => {
  await catalog.openSearchField();
});
When('I close the search field', async ({ catalog }) => {
  await catalog.closeSearchField();
});
Then('the search field is wider than its icon', async ({ catalog, page }) => {
  const box = await catalog.searchBox.boundingBox();
  const icon = await page.locator('#searchOpenBtn').boundingBox();
  expect(box.width, 'an open field that stayed icon-width is an unusable search')
    .toBeGreaterThan(icon.width * 1.5);
});
Then('the search field is closed', async ({ catalog }) => {
  expect(await catalog.searchIsOpen()).toBe(false);
});
Then('no second list of results appears', async ({ page }) => {
  // The layer and its own results list are gone; the page IS the result.
  expect(await page.locator('#searchLayer, #searchResults').count()).toBe(0);
});
When('I clear the search', async ({ catalog }) => {
  // Closing the field IS the clear: the app wipes the query on the way out.
  await catalog.closeSearchField();
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
Then('that card shows the award row with no ceremony names', async ({ catalog, ctx }) => {
  const row = catalog.cardAwardsRow(ctx.awardCardIndex);
  await expect(row).toBeVisible();
  const text = (await row.innerText()).trim();
  // Two sums only — a ceremony name on the card would violate REQ A-5.
  expect(text).toMatch(/НАГОРОДИ\s*\d+|НОМІНАЦІЇ\s*\d+/);
  expect(text).not.toMatch(/Oscar|BAFTA|Golden Globe|Emmy|Cannes/i);
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

/* ---- genre chips ---- */
Given('the catalog has more than one genre', async ({ catalog }) => {
  test.skip(await catalog.genreChip(0).count() === 0, 'catalog has fewer than two genres right now');
});
When('I tap the first genre chip', async ({ catalog }) => {
  await catalog.genreChip(0).click();
});
Then('that chip is active', async ({ catalog }) => {
  expect(await catalog.chipIsActive(catalog.genreChip(0))).toBe(true);
});
Then('that chip is inactive', async ({ catalog }) => {
  expect(await catalog.chipIsActive(catalog.genreChip(0))).toBe(false);
});
Then('no genre chip is highlighted', async ({ catalog }) => {
  expect(await catalog.noChipHighlighted()).toBe(true);
});
Given('I remember the border color of the first genre chip', async ({ catalog, ctx }) => {
  ctx.restingBorder = await catalog.chipBorderColor(catalog.genreChip(0));
});
When('I touch-tap the first genre chip', async ({ catalog }) => {
  await catalog.genreChip(0).tap();
});
When('I touch-tap the first genre chip again', async ({ catalog }) => {
  await catalog.genreChip(0).tap();
});
Then('the chip is inactive and its border color matches the remembered one', async ({ catalog, ctx }) => {
  const chip = catalog.genreChip(0);
  expect(await catalog.chipIsActive(chip)).toBe(false);
  expect(await catalog.chipBorderColor(chip)).toBe(ctx.restingBorder);
});

/* ---- tabs ---- */
// "Рекомендую" is the only tab a scenario ever taps or asserts by name — "Усі"
// has no button of its own; it's what you get by deselecting it (see
// "no catalog tab is highlighted" below).
When('I tap the {string} tab', async ({ catalog }, _name) => {
  await catalog.recommendTab().click();
});
Then('the {string} tab is active', async ({ catalog }, _name) => {
  expect(await catalog.tabIsActive(catalog.recommendTab())).toBe(true);
});
Then('the {string} tab is inactive', async ({ catalog }, _name) => {
  expect(await catalog.tabIsActive(catalog.recommendTab())).toBe(false);
});
Then('no catalog tab is highlighted', async ({ catalog }) => {
  expect(await catalog.noTabHighlighted()).toBe(true);
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

/* ---- delete mode ----
 * READ-ONLY by construction: there is no step here that confirms a deletion,
 * and enterDeleteMode() arms the dialog to answer "no" first. kino/movies is
 * one global catalog shared by every login, so a confirmed delete from CI
 * would remove the owner's real films.
 */
When('I enter delete mode', async ({ catalog }) => {
  await catalog.enterDeleteMode();
  expect(await catalog.deleteModeIsOn()).toBe(true);
});
When('I cancel delete mode', async ({ catalog }) => {
  await catalog.leaveDeleteMode();
});
When('I select the first card for deletion', async ({ catalog }) => {
  await catalog.selectForDelete(0);
});
Then('the delete bar is visible', async ({ catalog }) => {
  expect(await catalog.deleteBarIsVisible()).toBe(true);
});
Then('the delete bar is hidden', async ({ catalog }) => {
  expect(await catalog.deleteBarIsVisible()).toBe(false);
});
Then('no card is selected for deletion', async ({ catalog }) => {
  expect(await catalog.selectedCount()).toBe(0);
});
Then('{int} card is selected for deletion', async ({ catalog }, n) => {
  expect(await catalog.selectedCount()).toBe(n);
});
Then('the delete button is enabled', async ({ catalog }) => {
  expect(await catalog.deleteConfirmIsEnabled()).toBe(true);
});
Then('the delete button is disabled', async ({ catalog }) => {
  expect(await catalog.deleteConfirmIsEnabled()).toBe(false);
});
Then('the delete bar says {string}', async ({ catalog }, text) => {
  expect(await catalog.deleteBarText()).toContain(text);
});
Then('the movie modal is not open', async ({ catalog }) => {
  expect(await catalog.modalIsOpen()).toBe(false);
});

/* ---- tab counts ----
 * Strengthens the existing toggles coverage: those scenarios checked that a
 * tab activates and deactivates, never that the number beside it is true.
 * The number was the part that was wrong in production — "Дивився (4)" over
 * a list of three, because a mark outlived the film it pointed at.
 */
Then('the {string} tab count matches the films it lists', async ({ catalog }, tab) => {
  // The production bug in one assertion: the chip read "Дивився (4)" while
  // the list under it held three films, because a mark outlived the movie it
  // pointed at. Whatever the number claims, the list has to contain that
  // many — the tab is already isolated to its own films at this point.
  const count = tab === 'Дивився' ? await catalog.watchedTabCount() : await catalog.likedTabCount();
  test.skip(count === null, `nothing marked as "${tab}" right now`);
  expect(await catalog.cardCount()).toBe(count);
});
When('I isolate the catalog to watched films', async ({ catalog }) => {
  await catalog.tapWatchedToggle();
});

Then('the delete bar controls are inside the screen', async ({ catalog, page }) => {
  // Not just "no page overflow": a control can sit past the right edge while
  // the page itself stays put, which is invisible to an overflow check and
  // untappable to a person.
  const width = page.viewportSize().width;
  for (const [name, locator] of [
    ['count', catalog.deleteBarCount],
    ['delete', catalog.deleteConfirmButton],
    ['cancel', catalog.deleteCancelButton],
  ]) {
    const box = await locator.boundingBox();
    expect(box, `${name} has no box — it is not rendered`).not.toBeNull();
    expect(box.x, `${name} starts off-screen`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${name} extends past the ${width}px screen`)
      .toBeLessThanOrEqual(width + 1);
  }
});

/* ---- marking films (the first steps here that WRITE) ----
 * Safe only because marks are per-account now: CI writes into its own uid's
 * subtree and the database rules refuse anything else. Every scenario using
 * these puts the mark back, so a run leaves the account as it found it.
 */
Given('I remember the {string} count', async ({ catalog, ctx }, tab) => {
  // Keyed by tab: the heart-turns-the-eye-on scenario remembers BOTH
  // counts at once, so one shared slot would forget the first.
  ctx.counts = ctx.counts || {};
  ctx.counts[tab] = tab === 'Дивився'
    ? await catalog.watchedTabCount()
    : await catalog.likedTabCount();
});
Given('I remember the title of the first card', async ({ catalog, ctx }) => {
  ctx.title = await catalog.cardTitleText(0);
});
When('I toggle {string} on the first card', async ({ catalog, ctx }, which) => {
  // Remember which film it was: marking it sinks it to the end of its
  // section, so "the first card" can be a different film from here on and
  // only the title identifies it again.
  ctx.title = await catalog.cardTitleText(0);
  // Recorded so the fixture teardown can undo it even if this scenario
  // fails before reaching its own cleanup step.
  ctx.marked.push({ title: ctx.title, which });
  if (which === 'переглянуто') await catalog.toggleWatchedOnCard(0);
  else await catalog.toggleLikedOnCard(0);
});
When('I toggle {string} on that film', async ({ catalog, ctx }, which) => {
  // This IS the cleanup in a passing run, so drop it from the teardown list.
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

const countFor = async (catalog, tab) =>
  tab === 'Дивився' ? await catalog.watchedTabCount() : await catalog.likedTabCount();

Then('the {string} count is one higher than remembered', async ({ catalog, ctx }, tab) => {
  // null means the chip showed no number at all, which is what "zero marks"
  // looks like — so the step after the first mark expects 1, not null + 1.
  await expect
    .poll(() => countFor(catalog, tab))
    .toBe(((ctx.counts || {})[tab] || 0) + 1);
});
Then('the {string} count is still one higher than remembered', async ({ catalog, ctx }, tab) => {
  await expect
    .poll(() => countFor(catalog, tab))
    .toBe(((ctx.counts || {})[tab] || 0) + 1);
});
Then('the {string} count is back to what I remembered', async ({ catalog, ctx }, tab) => {
  await expect.poll(() => countFor(catalog, tab)).toBe((ctx.counts || {})[tab]);
});
Then('that title is listed', async ({ catalog, ctx }) => {
  await expect.poll(() => catalog.indexOfCardTitled(ctx.title)).toBeGreaterThanOrEqual(0);
});

When('I open the menu', async ({ catalog }) => {
  await catalog.openMenu();
});
Then('the menu has no delete row', async ({ catalog }) => {
  // The greyed-out row with its explanatory popover is GONE (owner's call):
  // deletion lives under an owned collection's plate now. The previous
  // scenarios waited 30s for a row that no longer exists.
  expect(await catalog.deleteModeButton.count()).toBe(0);
});

/* ---- account panel & onboarding guide ---- */
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
  // The literal username is a secret (it is half of TEST_USER), so the
  // assertion is shape, not value: non-empty and not the technical email.
  const name = await catalog.accountUsername();
  expect(name.length).toBeGreaterThan(0);
  expect(name).not.toContain('@');
});
When('I open the guide from the account panel', async ({ catalog }) => {
  await catalog.openGuideFromAccount();
});
Then('the onboarding guide is open', async ({ catalog }) => {
  expect(await catalog.guideIsOpen()).toBe(true);
});
Then('the onboarding guide is closed', async ({ catalog }) => {
  expect(await catalog.guideIsOpen()).toBe(false);
});
Then('the starter top-20 shows between 1 and 20 films', async ({ catalog, page }) => {
  // The list is data-driven and rebuilt daily, so the exact films are not
  // assertable — but an empty grid right after the update job has run
  // means the pipe from kino/trending to the page is broken.
  await page.locator('#trendGrid .trend-item').first().waitFor({ timeout: 10000 });
  const n = await catalog.trendingCount();
  expect(n).toBeGreaterThanOrEqual(1);
  expect(n).toBeLessThanOrEqual(20);
});
When('I close the onboarding guide', async ({ catalog }) => {
  await catalog.closeGuide();
});
Then('the account panel entry point is visible', async ({ catalog }) => {
  // The entry point moved into the menu sheet with the slimmed header.
  await catalog.openMenu();
  await expect(catalog.accountButton).toBeVisible();
  await catalog.closeMenu();
});

Then('the account panel offers a password change', async ({ page }) => {
  // Folded shut now, on purpose: two fields, a policy line and a button
  // standing open made the panel look like a form you had to fill in. So
  // "offers" is the heading you can press — and pressing it must produce the
  // real form, which is the half worth asserting.
  const toggle = page.locator('#accPassToggle');
  await expect(toggle).toBeVisible();
  await expect(page.locator('#accPassForm')).toBeHidden();
  await toggle.click();
  await expect(page.locator('#accPassForm')).toBeVisible();
});

Then('a fresh visitor sees the password form and the Google button', async ({ browser }) => {
  // The retry budget below (4 × ~18s of goto + wait + pause) never fit the
  // default 30s test timeout: the first CDN miss burned the whole test and
  // the retries this step exists for never ran. The budget gets a timeout
  // to fit inside instead.
  test.info().setTimeout(120_000);
  // A NEW context on purpose: the shared one carries the saved session, so
  // it never sees the login screen at all.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // Diagnostics, because this scenario fails ONLY on runners (locally the
  // form shows in half a second) and its failure page is never captured —
  // Playwright snapshots the fixture's page, not this private context. If
  // the login screen stays hidden again, the error will at least say what
  // the page itself saw: script errors, whether Firebase loaded, and what
  // state the overlay was left in.
  const pageProblems = [];
  page.on('pageerror', err => pageProblems.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') pageProblems.push(`console.error: ${msg.text().slice(0, 200)}`);
  });
  try {
    // Retried on purpose: this runs minutes after a deploy, in a context
    // with no cache, and GitHub Pages' CDN can still be propagating — the
    // edge briefly serves a 404 or the previous build. The shared context
    // never sees that (its edge was warmed during setup), so only THIS
    // scenario kept flaking on freshly deployed runs.
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await page.goto(process.env.BASE_URL || 'https://alvl-station.github.io/seenit/', { waitUntil: 'domcontentloaded' });
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

/* ---- the recommendations flow ---- */
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
Then('the recommendation sources are {string}, {string} and {string}', async ({ catalog }, a, b, c) => {
  expect(await catalog.recsSourceTabs()).toEqual([a, b, c]);
});
When('I switch the recommendations source to {string}', async ({ catalog }, id) => {
  await catalog.switchRecsSource(id);
});
Then('the recommendations body points at where a person is found', async ({ catalog }) => {
  // Following a person EXISTS now, so the old «це в планах» is gone. The tab
  // is a doorway: either the people already followed, or — with none yet —
  // the search that finds one. Whichever it shows, it must name the way in.
  const body = await catalog.recsBodyText();
  expect(body).toMatch(/підпис/i);
  expect(body).not.toMatch(/в планах|поки не можна/,
    'the feature shipped — the placeholder must not outlive it');
});
Then('at least {int} collection chips are shown', async ({ catalog, page }, n) => {
  await page.locator('.recs-list-chip').first().waitFor({ timeout: 10000 });
  expect((await catalog.recsListChips()).length).toBeGreaterThanOrEqual(n);
});
When('I open the collection {string}', async ({ catalog }, title) => {
  await catalog.openRecsList(title);
});
Then('the state plate reads {string}', async ({ page }, name) => {
  const plate = page.locator('#collectionPlate');
  await expect(plate).toBeVisible();
  await expect(plate).toContainText(name);
});
When('I close the state plate', async ({ page }) => {
  await page.locator('#collectionPlateClose').click();
});
Then('the state plate is gone', async ({ page }) => {
  await expect(page.locator('#collectionPlate')).toBeHidden();
});
Then('the catalog shows between {int} and {int} films', async ({ catalog, page }, lo, hi) => {
  await page.locator('#main .card').first().waitFor({ timeout: 10000 });
  const n = await catalog.cardCount();
  expect(n).toBeGreaterThanOrEqual(lo);
  expect(n).toBeLessThanOrEqual(hi);
});
Then('the recommendations entry point is visible', async ({ catalog }) => {
  await catalog.openMenu();
  await expect(catalog.recsButton).toBeVisible();
  await catalog.closeMenu();
});

Then("both toggles sit below that card's poster", async ({ catalog, ctx }) => {
  const poster = await catalog.cardPoster(ctx.awardCardIndex).boundingBox();
  for (const locator of [catalog.cardWatchedToggle(ctx.awardCardIndex), catalog.cardLikedToggle(ctx.awardCardIndex)]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    // In the data block means BELOW the poster's bottom edge — the poster
    // itself carries nothing in the redesign.
    expect(box.y, 'a toggle must not sit on the poster').toBeGreaterThanOrEqual(poster.y + poster.height - 1);
  }
});
