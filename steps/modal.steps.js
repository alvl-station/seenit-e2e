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

/* ---- popover ---- */
When('I tap the first tappable award pill', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  test.skip(await modal.tappableAwardPills().count() === 0, 'no tappable pills on this movie');
  await modal.tappableAwardPills().first().click();
});
When('I tap the critic badge', async ({ ctx, page }) => {
  await modalOf(ctx, page).criticBadge().first().click();
});
When('I tap outside the popover', async ({ ctx, page }) => {
  await modalOf(ctx, page).clickOutsidePopover();
});
Then('every award pill is labeled with a curated English name', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  const re = pillPattern(await curatedNames(page));
  const n = await modal.awardPills().count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const text = (await modal.awardPills().nth(i).innerText()).trim();
    expect(text, `pill ${i} text "${text}" is not a curated English name`).toMatch(re);
    expect(text, `pill ${i} text "${text}" contains Cyrillic — award names stay English`)
      .not.toMatch(/[\u0400-\u04FF]/);
  }
});
Then('the popover is visible next to the pill and does not cover it', async ({ ctx, page }) => {
  const modal = modalOf(ctx, page);
  await expect(modal.popover()).toBeVisible();
  await assertAnchored(await modal.popover().boundingBox(),
                       await modal.tappableAwardPills().first().boundingBox());
  const viewport = page.viewportSize();
  const pop = await modal.popover().boundingBox();
  expect(pop.y).toBeGreaterThanOrEqual(0);
  expect(pop.y + pop.height).toBeLessThanOrEqual(viewport.height + 1);
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

Then('every award pill icon is vertically centred within its pill', async ({ ctx, page }) => {
  const offsets = await modalOf(ctx, page).awardPillIconOffsets();
  expect(offsets.length, 'no award pill icons found').toBeGreaterThan(0);
  for (const { label, offset } of offsets) {
    // 1px of slack for sub-pixel rounding; the baseline bug produced
    // several px of lift, so this is nowhere near a flaky threshold.
    expect(Math.abs(offset), `"${label}" icon is off-centre by ${offset.toFixed(2)}px`)
      .toBeLessThanOrEqual(1);
  }
});
