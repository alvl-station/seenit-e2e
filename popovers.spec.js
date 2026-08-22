// The award/critic popover rules from seenit-frontend's REQUIREMENTS.md,
// checked against the real deployed page (BUGS #2's popup-drift half, plus
// the award-naming rules that survive whatever stale data the catalog holds):
//
//   A-1/A-3  badges only ever show a curated ceremony name, in English —
//            structural, so it holds even for rows backfilled before the
//            language rules (the name never comes from stored text)
//   U-4      an explanation appears anchored NEXT to the tapped element,
//            never covering it, never at the bottom of the screen
//   U-5      a pill is only tappable when a tap reveals something
//
// All read-only: open a modal, tap badges, measure. Never toggles or writes.
const { test, expect } = require('@playwright/test');
const { openLoggedInCatalog } = require('./support/session');
const { MovieModalPage } = require('./pages/MovieModalPage');

// The ONLY names a badge may carry — AWARD_INFO's curated English set
// (seenit-frontend src/data/awards.js). An unrecognized ceremony must be
// dropped entirely, so any other text here is a regression.
const CURATED = ['Oscar', 'Golden Globe', 'BAFTA', 'Cannes', 'Venice', 'Berlinale', 'Emmy', 'SAG', 'Saturn'];
const PILL_RE = new RegExp(`^(${CURATED.join('|')})( \\(\\d+\\))?$`);

async function openModalWithAwards(page) {
  const catalog = await openLoggedInCatalog(page);
  const i = await catalog.firstCardIndexWithAwards();
  if (i === -1) return null;
  await catalog.openCard(i);
  const modal = new MovieModalPage(page);
  await modal.waitUntilOpen();
  return modal;
}

test('award pills carry only curated English ceremony names (REQ A-1, A-3)', async ({ page }) => {
  const modal = await openModalWithAwards(page);
  test.skip(!modal, 'no movie with awards in the catalog right now');
  const n = await modal.awardPills().count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const text = (await modal.awardPills().nth(i).innerText()).trim();
    expect(text, `pill ${i} text "${text}" is not a curated English name`).toMatch(PILL_RE);
  }
});

test('tapping an award pill opens the popover adjacent to it — no overlap, no bottom-of-screen drift (REQ U-4, BUGS #2)', async ({ page }) => {
  const modal = await openModalWithAwards(page);
  test.skip(!modal, 'no movie with awards in the catalog right now');
  const pills = modal.tappableAwardPills();
  test.skip(await pills.count() === 0, 'no tappable pills on this movie');

  await pills.first().click();
  await expect(modal.popover()).toBeVisible();

  const pop = await modal.popover().boundingBox();
  const anchor = await pills.first().boundingBox();
  const viewport = page.viewportSize();

  // Never covers what was tapped...
  const overlap = !(pop.x + pop.width <= anchor.x || anchor.x + anchor.width <= pop.x ||
                    pop.y + pop.height <= anchor.y || anchor.y + anchor.height <= pop.y);
  expect(overlap, 'popover covers its own anchor').toBe(false);
  // ...sits adjacent (within a badge-height-ish gap above or below)...
  const gap = pop.y >= anchor.y + anchor.height
    ? pop.y - (anchor.y + anchor.height)
    : anchor.y - (pop.y + pop.height);
  expect(gap, 'popover drifted away from its anchor').toBeLessThan(40);
  // ...and stays fully inside the viewport.
  expect(pop.y).toBeGreaterThanOrEqual(0);
  expect(pop.y + pop.height).toBeLessThanOrEqual(viewport.height + 1);
});

test('an open popover dismisses on a tap anywhere outside it', async ({ page }) => {
  const modal = await openModalWithAwards(page);
  test.skip(!modal, 'no movie with awards in the catalog right now');
  const pills = modal.tappableAwardPills();
  test.skip(await pills.count() === 0, 'no tappable pills on this movie');

  await pills.first().click();
  await expect(modal.popover()).toBeVisible();
  await modal.clickOutsidePopover();
  await expect.poll(() => modal.popoverIsShown()).toBe(false);
});

test('the critic-score badge explains itself in an anchored popover, not a bottom toast (REQ U-4)', async ({ page }) => {
  const catalog = await openLoggedInCatalog(page);
  // find any card whose modal has a critic badge
  const n = Math.min(await catalog.cardCount(), 8);
  const modal = new MovieModalPage(page);
  let found = false;
  for (let i = 0; i < n; i++) {
    await catalog.openCard(i);
    await modal.waitUntilOpen();
    if (await modal.criticBadge().count() > 0) { found = true; break; }
    await modal.close();
  }
  test.skip(!found, 'no movie with a critic score in the first 8 cards');

  await modal.criticBadge().first().click();
  await expect(modal.popover()).toBeVisible();
  expect(await modal.popover().innerText()).toContain('%');
  const pop = await modal.popover().boundingBox();
  const anchor = await modal.criticBadge().first().boundingBox();
  const gap = Math.abs((pop.y >= anchor.y ? pop.y - (anchor.y + anchor.height) : anchor.y - (pop.y + pop.height)));
  expect(gap, 'critic popover is not anchored to the badge').toBeLessThan(40);
});
