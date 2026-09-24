// Steps over MovieModalPage/AddModalPage: opening cards, award/critic
// popovers, scroll-lock assertions. Selectors live in pages/ only.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { MovieModalPage } = require('../pages/MovieModalPage');
const { AddModalPage } = require('../pages/AddModalPage');
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

function modalOf(ctx, page) {
  if (!ctx.modal) ctx.modal = new MovieModalPage(page);
  return ctx.modal;
}
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
Given('a movie modal with awards is open', async ({ catalog, ctx, page }) => {
  const i = await catalog.firstCardIndexWithAwards();
  test.skip(i === -1, 'no movie with awards in the catalog right now');
  await catalog.openCard(i);
  await modalOf(ctx, page).waitUntilOpen();
});
Given('a movie modal with a critic score is open', async ({ catalog, ctx, page }) => {
  // Find the card by its own critic badge instead of opening modals one by
  // one until we hit a match — one DOM scan, no wasted navigation.
  const i = await catalog.firstCardIndexWithCriticScore();
  test.skip(i === -1, 'no movie with a critic score in the catalog right now');
  await catalog.openCard(i);
  await modalOf(ctx, page).waitUntilOpen();
});

/* ---- the awards as laurels + their popover ---- */
Then('every laurel names a curated English ceremony and says WINNER or NOMINATION', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  const names = await curatedNames(page);
  const n = await modal.laurels().count();
  expect(n).toBeGreaterThan(0);
  let wonDone = false;
  for (let i = 0; i < n; i++) {
    const { name, kind } = await modal.laurelText(i);
    expect(names, `laurel "${name}" is not a curated English name (A-1/A-3)`).toContain(name);
    expect(kind).toMatch(/^(WINNER|NOMINATION)( ×\d+)?$/);
    // Wins first: once a nomination appears, no win may follow it.
    if (kind.startsWith('NOMINATION')) wonDone = true;
    else expect(wonDone, 'wins come before nominations').toBe(false);
  }
  // Nothing on a laurel is translated: its category is English.
  await expect(modal.awardsRail()).not.toContainText(/[\u0400-\u04FF]/);
  // The counts stand over the niche, and add up to what the laurels carry.
  await expect(modal.awardsCount()).toBeVisible();
});
When('I tap the first laurel', async ({ ctx, page }) => {
  await modalOf(ctx, page).laurels().first().click();
});
Then('the popover names that ceremony and says it in Ukrainian', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  await expect.poll(() => modal.popoverIsShown()).toBe(true);
  const text = ((await modal.popover().textContent()) || '').trim();
  const { name } = await modal.laurelText(0);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // «Oscar · перемога», «Oscar · номінація ×2»: the ceremony and the result.
  expect(lines[0].startsWith(`${name} · `), `popover opens with the ceremony: ${lines[0]}`).toBe(true);
  expect(lines[0]).toMatch(/· (перемога|номінація)( ×\d+)?$/);
  // And the rest of it is Ukrainian: the category, what the ceremony is.
  expect(lines.slice(1).some(l => /[\u0400-\u04FF]/.test(l))).toBe(true);
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
Then('background scroll is locked via position fixed', async ({ catalog, page }) => {
  expect(await catalog.bodyIsScrollLocked()).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).position)).toBe('fixed');
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

/* ---- add modal (open/close ONLY — saving is forbidden, REQ T-4) ---- */
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
  // Not a failure: no film has providers until the backfill has run, and a
  // red smoke suite rolls the live site back a release.
  test.skip(i === -1, 'no film in the catalog has providers on file yet');
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

/* ---- the facts under the title ---- */
Then('the card shows the year, type and genre on one line', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  await expect(modal.facts()).toBeVisible();
  await expect(modal.factsLine()).toHaveCount(1);
  await expect(modal.factsLine()).toContainText('·');
});
Then('the country, when the film has one, stands on a line of its own', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  const country = await modal.openFilmCountry();
  if (!country) {
    await expect(modal.countryLine()).toHaveCount(0);
    return;
  }
  await expect(modal.countryLine()).toHaveCount(1);
  await expect(modal.countryLine()).toHaveText(country);
  await expect(modal.factsLine(), 'the country is back on the shared line').not.toContainText(country);
});

/* ---- a series' seasons (read-only: nothing is marked) ---- */
Given('a series card with seasons is open', async ({ catalog, ctx, page }) => {
  const modal = modalOf(ctx, page);
  // Not every series has season data on file; try the first few.
  const tries = Math.min(await catalog.cardCount(), 5);
  for (let i = 0; i < tries; i++) {
    await catalog.openCard(i);
    await modal.waitUntilOpen();
    if (await modal.waitForSeasons()) return;
    await modal.close();
  }
  test.skip(true, `none of the first ${tries} series has season data on file`);
});
Then('the seasons tab counts the seasons in square brackets', async ({ ctx, page }) => {
  await expect(modalOf(ctx, page).tabButton('seasons')).toHaveText(/^Сезони \[\d+\]$/);
});
Then('every season is shown with its episodes, without pressing anything', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  const blocks = modal.seasonBlocks();
  expect(await blocks.count(), 'no season drawn').toBeGreaterThan(0);
  await expect(modal.seasonEpisodes().first()).toBeVisible();
  // Nothing to open or choose: every season is laid out already.
  await expect(modal.seasonsBlock().locator('.season-drop, [aria-haspopup]')).toHaveCount(0);
});
