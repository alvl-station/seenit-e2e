// Steps over MovieModalPage/AddModalPage: opening cards, award/critic
// popovers, scroll-lock assertions. Selectors live in pages/ only.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { MovieModalPage } = require('../pages/MovieModalPage');
const { AddModalPage } = require('../pages/AddModalPage');
const { Given, When, Then } = createBdd(test);

// The ONLY names a badge may carry — AWARD_INFO's curated English set
// (seenit-frontend src/data/awards.js).
const CURATED = ['Oscar', 'Golden Globe', 'BAFTA', 'Cannes', 'Venice', 'Berlinale', 'Emmy', 'SAG', 'Saturn'];
const PILL_RE = new RegExp(`^(${CURATED.join('|')})( \\(\\d+\\))?$`);

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
  const n = await modal.awardPills().count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const text = (await modal.awardPills().nth(i).innerText()).trim();
    expect(text, `pill ${i} text "${text}" is not a curated English name`).toMatch(PILL_RE);
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
