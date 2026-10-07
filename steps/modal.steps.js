// Steps over MovieModalPage/AddModalPage: opening cards, the awards tab, the
// critic popover, scroll-lock assertions. Selectors live in pages/ only.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { modalOf } = require('../support/modal-of');
const { AddModalPage } = require('../pages/AddModalPage');
const { skipWithoutData } = require('../support/skips');
const { Given, When, Then } = createBdd(test);

// The only names a badge may carry are the curated English ones, and the app
// under test is the one that curates them: AWARD_INFO ships inside the page
// (seenit-frontend src/data/awards.js, concatenated into the bundle).
//
// This used to be a hand-copied list of nine names. The frontend's set grew to
// twenty-two, the copy did not, and "National Board of Review Award" — a name
// the app is entirely right to show — failed the assertion on every run. That
// stuck the live site on an old release, because the deploy pipeline treats a
// red smoke suite as a reason to roll back.
//
// Reading the set from the page keeps the assertion honest without keeping a
// duplicate in step with a list it does not own. A Ukrainian or raw upstream
// name leaking into a pill still fails, which is what the test is actually for.
async function curatedNames(page) {
  const names = await page.evaluate(() => (typeof AWARD_INFO === 'undefined' ? null
    : Object.values(AWARD_INFO).map(a => a && (a.name || a.label)).filter(Boolean)));
  expect(names, 'AWARD_INFO is not reachable on the page — the bundle changed shape')
    .toBeTruthy();
  expect(names.length, 'AWARD_INFO came back empty').toBeGreaterThan(0);
  return names;
}
// Longest first, so "National Board of Review Award" cannot be half-matched by a
// shorter entry that happens to be its prefix.
const pillPattern = names => new RegExp('^(' +
  names.slice().sort((a, b) => b.length - a.length)
       .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
  ')( \\(\\d+\\))?$');

async function assertAnchored(pop, anchor) {
  const covers = !(pop.x + pop.width <= anchor.x || anchor.x + anchor.width <= pop.x ||
                   pop.y + pop.height <= anchor.y || anchor.y + anchor.height <= pop.y);
  expect(covers, 'popover covers its own anchor').toBe(false);
  const gap = pop.y >= anchor.y + anchor.height
    ? pop.y - (anchor.y + anchor.height)
    : anchor.y - (pop.y + pop.height);
  expect(gap, 'popover drifted away from its anchor').toBeLessThan(40);
}

/* ---- open/close ---- */
When('I open the first card', async ({ catalog, ctx, page }) => {
  await catalog.openCard(0);
  await modalOf(ctx, page).waitUntilOpen();
});
When('I open a card visible at the current offset', async ({ catalog, ctx, page }) => {
  // Where the page stands the moment the card opens: what closing it must
  // give back. Read here rather than when the offset was set, because the
  // shelf may still be settling (a late batch, scroll anchoring) in between.
  ctx.scrollBefore = await catalog.scrollY();
  const clicked = await catalog.openVisibleCard();
  test.skip(!clicked, 'no card fully visible at this scroll offset');
  await modalOf(ctx, page).waitUntilOpen();
});
When('I close the modal', async ({ ctx, page }) => {
  await modalOf(ctx, page).close();
});
Then('the modal is open with a non-empty title', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  await modal.waitUntilOpen();
  await expect(modal.title).not.toBeEmpty();
});
Then('the modal is closed', async ({ ctx, page }) => {
  await expect(modalOf(ctx, page).overlay).toBeHidden();
});

/* ---- modal preconditions (Given) ---- */
Given('a movie modal with more than four awards is open', async ({ catalog, ctx, page }) => {
  const i = await catalog.firstCardIndexWithAwardRows(5);
  skipWithoutData(i === -1, 'no film in the catalog has more than four award rows');
  await catalog.openCard(i);
  await modalOf(ctx, page).waitUntilOpen();
});
Given('a movie modal with a critic score is open', async ({ catalog, ctx, page }) => {
  // Find the card by its own critic badge instead of opening modals one by
  // one until we hit a match — one DOM scan, no wasted navigation.
  const i = await catalog.firstCardIndexWithCriticScore();
  skipWithoutData(i === -1, 'no movie with a critic score in the catalog right now');
  await catalog.openCard(i);
  await modalOf(ctx, page).waitUntilOpen();
});

/* ---- the awards: a tab of rows since 2026-10-07 (the laurels and their popover are gone) ---- */
When('I press the awards tile', async ({ ctx, page }) => {
  await modalOf(ctx, page).pressAwardsTile();
});
Then('the awards tab is open', async ({ ctx, page }) => {
  await expect.poll(() => modalOf(ctx, page).openTabId()).toBe('awards');
});
Then('every award row names a curated English ceremony and says its result in Ukrainian, wins first', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  const names = await curatedNames(page);
  const rows = await modal.awardRowTexts();
  expect(rows.length).toBeGreaterThan(0);
  let winsDone = false;
  for (const { name, result, win } of rows) {
    expect(names, `award row "${name}" is not a curated English name (A-1/A-3)`).toContain(name);
    expect(result).toMatch(win ? /^перемога( ×\d+)?$/ : /^номінація( ×\d+)?$/);
    // Wins first: once a nomination appears, no win may follow it.
    if (!win) winsDone = true;
    else expect(winsDone, 'wins come before nominations').toBe(false);
  }
  // A-4: the categories are said in Ukrainian; one left in English is the fallback, not the rule.
  expect(rows.some(r => /[\u0400-\u04FF]/.test(r.category)), 'no award category is in Ukrainian').toBe(true);
});
Then('at most four award rows are shown, and the fold key says how many more', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  const all = await modal.awardRows().count();
  await expect(modal.visibleAwardRows()).toHaveCount(4);
  const more = all - 4;
  await expect(modal.awardsMoreKey()).toHaveText(new RegExp(`^Ще ${more} (номінац|нагород)`));
  await expect(modal.awardsMoreKey()).toHaveAttribute('aria-expanded', 'false');
});
When('I unfold the rest of the awards', async ({ ctx, page }) => {
  await modalOf(ctx, page).pressAwardsMore();
});
Then('every award row is shown, and the key folds them again', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  await expect(modal.visibleAwardRows()).toHaveCount(await modal.awardRows().count());
  await expect(modal.awardsMoreKey()).toHaveText('Згорнути');
  await expect(modal.awardsMoreKey()).toHaveAttribute('aria-expanded', 'true');
});
When('I tap the critic badge', async ({ ctx, page }) => {
  await modalOf(ctx, page).criticBadge().first().click();
});
When('I tap outside the popover', async ({ ctx, page }) => {
  await modalOf(ctx, page).clickOutsidePopover();
});
Then('the popover is visible next to the badge and contains {string}', async ({ ctx, page }, text) => {
  const modal = modalOf(ctx, page);
  await expect(modal.popover()).toBeVisible();
  expect(await modal.popover().innerText()).toContain(text);
  await assertAnchored(await modal.popover().boundingBox(),
                       await modal.criticBadge().first().boundingBox());
});
Then('the popover disappears', async ({ ctx, page }) => {
  await expect.poll(() => modalOf(ctx, page).popoverIsShown()).toBe(false);
});

/* ---- scroll lock ---- */
Then('the page is held by its root, and the body is not pinned', async ({ catalog, ctx }) => {
  expect(await catalog.bodyIsScrollLocked()).toBe(true);
  ctx.scrollHeld = await catalog.scrollY();
  const hold = await catalog.scrollHold();
  expect(hold.rootHeld, 'the root is not overflow hidden under the open card').toBe(true);
  expect(hold.bodyPosition, 'the body is pinned again').not.toBe('fixed');
  expect(hold.bodyOverflowY, 'the body holds its own overflow: it becomes a scroller').not.toBe('hidden');
});
When('I drag the page up with a finger', async ({ catalog }) => {
  await catalog.dragPageUp();
});
Then('the page behind the card has not moved', async ({ catalog, ctx }) => {
  expect(Math.abs(await catalog.scrollY() - ctx.scrollHeld)).toBeLessThanOrEqual(2);
});
Then('the page scrolls again under a finger', async ({ catalog, ctx }) => {
  await catalog.dragPageUp();
  // Up the screen is down the page: the free page moves on past where it was.
  await expect.poll(() => catalog.scrollY()).toBeGreaterThan(ctx.scrollBefore + 50);
});
Then('background scroll is locked', async ({ catalog }) => {
  expect(await catalog.bodyIsScrollLocked()).toBe(true);
});
Then('background scroll is unlocked', async ({ catalog }) => {
  expect(await catalog.bodyIsScrollLocked()).toBe(false);
});
Then('scroll is unlocked and the position is restored', async ({ catalog, ctx }) => {
  expect(await catalog.bodyIsScrollLocked()).toBe(false);
  // scroll-behavior: smooth ANIMATES the restoring scrollTo — poll until it
  // lands; ±2px absorbs mobile-emulation rounding.
  await expect.poll(async () => Math.abs(await catalog.scrollY() - ctx.scrollBefore))
    .toBeLessThanOrEqual(2);
});

/* ---- adding: the search outside the app (open/close ONLY — saving is
 * forbidden, REQ T-4). It was the «Додати» window until 2026-09-29. ---- */
When('I open the add modal', async ({ ctx, page }) => {
  ctx.addModal = new AddModalPage(page);
  await ctx.addModal.open();
});
When('I close the add modal', async ({ ctx }) => {
  await ctx.addModal.close();
});
Then('the add modal is no wider than the screen', async ({ ctx, page }) => {
  const box = await ctx.addModal.overlay.boundingBox();
  expect(box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
});


/* ---- "Де подивитись" ----
 * Read-only, and deliberately never follows a provider link: part of what
 * these assert is that the app cannot spend money, and a CI run clicking
 * through to a storefront would be a poor way to make that argument. */

// The offer kinds the app can render, cheapest-for-the-viewer first. Mirrors
// PROVIDER_KIND_ORDER in src/logic.js; kept here rather than read off the page
// because the ORDER is the assertion — reading it from the thing under test
// would make the scenario agree with any order it happened to produce.
// «Є в каталозі» is GONE from the app (owner's call): a Megogo/sweet.tv
// row proves presence, not price, and now says nothing at all — so the
// empty string IS a defined label, sitting exactly where `unknown` sits in
// PROVIDER_KIND_ORDER.
const KIND_ORDER = ['Передплата', 'Безкоштовно', 'Безкоштовно з рекламою', '', 'Оренда', 'Купівля'];

Given('a movie modal with providers is open', async ({ catalog, ctx, page }) => {
  const i = await catalog.firstCardIndexWithProviders();
  // Not a failure off production: no film has providers until the backfill
  // has run, and a red smoke suite rolls the live site back a release. On
  // production the backfill HAS run, and no providers means the card lost
  // them (support/skips.js).
  skipWithoutData(i === -1, 'no film in the catalog has providers on file yet');
  await catalog.openCard(i);
  await modalOf(ctx, page).waitUntilOpen();
  await modalOf(ctx, page).openTab('watch');
  await modalOf(ctx, page).providerRows().first().waitFor({ timeout: 5000 }).catch(() => {});
  ctx.providers = await modalOf(ctx, page).providers();
  expect(ctx.providers.length, 'the film has providers on file but rendered no rows')
    .toBeGreaterThan(0);
});

Then('every provider row names a service and what the offer is', async ({ ctx }) => {
  for (const p of ctx.providers) {
    expect(p.name, 'a provider row rendered with no name').toBeTruthy();
    expect(KIND_ORDER, `"${p.name}" shows an offer label the app does not define: "${p.kind}"`)
      .toContain(p.kind);
  }
});

Then('providers are ordered from subscription to purchase', async ({ ctx }) => {
  const ranks = ctx.providers.map(p => KIND_ORDER.indexOf(p.kind));
  const sorted = [...ranks].sort((a, b) => a - b);
  expect(ranks, `rows are out of cost order: ${ctx.providers.map(p => `${p.name}/${p.kind}`).join(', ')}`)
    .toEqual(sorted);
});

Then('every provider link opens in a new tab with rel="noopener"', async ({ ctx }) => {
  const links = ctx.providers.filter(p => p.href);
  expect(links.length, 'not one provider row was a link').toBeGreaterThan(0);
  for (const p of links) {
    expect(p.newTab, `"${p.name}" would navigate away from the app`).toBe(true);
    expect(p.rel, `"${p.name}" opens a new tab without rel="noopener"`).toContain('noopener');
  }
});

Then('every provider link points at a film page, never a checkout', async ({ ctx }) => {
  for (const p of ctx.providers.filter(x => x.href)) {
    expect(p.href, `"${p.name}" links somewhere that could start a purchase`)
      .not.toMatch(/checkout|\/buy\b|payment|purchase|subscribe/i);
  }
});

Then('no provider row names {string}', async ({ ctx }, name) => {
  // Display-side exclusion: the record may still carry the row (earlier
  // passes wrote it), but the card must never show it.
  expect(ctx.providers.map(p => p.name), `a card offers "${name}", which this region cannot use`)
    .not.toContain(name);
});

Then('no Megogo row claims a subscription or a price', async ({ ctx }) => {
  for (const p of ctx.providers.filter(x => x.name === 'Megogo')) {
    // The sitemap proves the page exists and nothing about money — and the
    // app now says NOTHING on such rows («Є в каталозі» retired: Megogo
    // sells the same catalogue three ways, so no single word is true).
    expect(p.kind, 'a Megogo row claims an offer the sitemap cannot know')
      .toBe('');
  }
});

/* ---- the poster/trailer slot ---- */
Then('the modal shows either an autoplaying trailer or a poster', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  const frames = await modal.trailerFrame().count();
  const posters = await modal.poster().count();
  expect(frames + posters, 'the modal rendered neither a trailer nor a poster').toBeGreaterThan(0);
  expect(frames && posters, 'the modal rendered BOTH — they share one slot').toBeFalsy();
  if (frames) {
    const src = await modal.trailerFrame().first().getAttribute('src');
    // Muted autoplay is what makes an embed-on-open acceptable; a modal that
    // starts making noise by itself is the regression worth catching.
    expect(src, 'the trailer embed is not a YouTube embed URL').toContain('youtube.com/embed/');
    expect(src, 'the trailer would autoplay with sound').toMatch(/mute=1/);
  }
});

/* ---- the facts under the title: one line since 2026-10-07 ---- */
Then('the card shows the year, type and genre on one line', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  await expect(modal.factsLine()).toHaveCount(1);
  await expect(modal.factsLine()).toBeVisible();
  // The whole line, as the record has it: a film without a genre or a country simply has fewer words.
  expect(await modal.factsWords()).toEqual(await modal.openFilmFacts());
});
Then('the country, when the film has one, ends that line and is named in the details', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  const country = await modal.openFilmCountry();
  if (!country) return;
  const words = await modal.factsWords();
  expect(words[words.length - 1]).toBe(country);
  await modal.openTab('details');
  expect(await modal.detailsCountryText()).toContain(country);
});

/* ---- a series' seasons (read-only: nothing is marked) ---- */
Given('a series card with seasons is open', async ({ catalog, ctx, page }) => {
  const modal = modalOf(ctx, page);
  // Chosen from the catalogue data, the way the award and provider
  // scenarios choose theirs: a series whose record carries season_starts
  // (season number -> first air date) has its episodes mirrored, so its
  // card will draw the seasons. Opening the first five cards and waiting
  // 8 s on each for a block that might never come was 40 s of nothing.
  const i = await catalog.firstCardIndexWithSeasons();
  test.skip(i === -1, 'no series in the catalog has season data on file');
  await catalog.openCard(i);
  await modal.waitUntilOpen();
  expect(await modal.waitForSeasons(), 'the series has seasons on file but the card drew none').toBe(true);
});
Then('the seasons tab counts the seasons in square brackets', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  // An icon key since 2026-10-07: the open one says its word and the count, its full name is the aria-label.
  await expect(modal.tabButton('seasons')).toHaveAttribute('aria-label', /^Сезони \[\d+\]$/);
  // The number is the numbered seasons the tab lists, the specials not among them.
  const label = await modal.tabLabel('seasons');
  expect(Number(/\[(\d+)\]/.exec(label)[1])).toBe(await modal.numberedSeasonBlocks().count());
});
Then('every season is listed by name, shut', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  const n = await modal.seasonBlocks().count();
  expect(n, 'no season drawn').toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(modal.seasonName(i)).not.toBeEmpty();
  expect(await modal.openSeasonCount(), 'a season stands open before anything was pressed').toBe(0);
});
When('I open a season', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  ctx.season = await modal.firstSeasonWithEpisodes();
  skipWithoutData(ctx.season === -1, 'the series has seasons on file but no episodes listed yet');
  await modal.pressSeasonOpener(ctx.season);
});
Then('that season\'s episodes are shown, and only that season\'s', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  await expect(modal.seasonEpisodes(ctx.season)).toBeVisible();
  await expect(modal.seasonEpisodeRows(ctx.season).first()).toBeVisible();
  await expect(modal.seasonOpener(ctx.season)).toHaveAttribute('aria-expanded', 'true');
  expect(await modal.openSeasonCount()).toBe(1);
});
When('I shut that season', async ({ ctx, page }) => {
  await modalOf(ctx, page).pressSeasonOpener(ctx.season);
});
