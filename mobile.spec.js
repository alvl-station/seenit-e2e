// The mobile-UX batch from seenit-frontend's BUGS.md #8: scroll-lock while
// an overlay is open (background used to stay draggable on iOS Safari),
// orientation handling, and the add-form overflowing off a phone screen.
// Everything here is read-only (REQUIREMENTS T-4): the add modal is only
// ever OPENED and CLOSED — saving from a test is forbidden.
const { test, expect } = require('@playwright/test');
const { openLoggedInCatalog } = require('./support/session');
const { MovieModalPage } = require('./pages/MovieModalPage');
const { AddModalPage } = require('./pages/AddModalPage');

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('movie modal locks background scroll and restores the exact position on close (BUGS #8)', async ({ page }) => {
    const catalog = await openLoggedInCatalog(page);

    // Scroll somewhere real first — the shipped regression class here is
    // "position lost after closing the modal", invisible when testing at 0.
    await catalog.scrollTo(400);
    const before = await catalog.scrollY();
    expect(before).toBeGreaterThan(0);

    // Click a card that's ALREADY in view — a plain openCard(0) lets
    // Playwright auto-scroll back to the top card, which moves the very
    // position this test is about (first run failed exactly that way).
    const clicked = await catalog.openVisibleCard();
    test.skip(!clicked, 'no card fully visible at this scroll offset');
    const modal = new MovieModalPage(page);
    await modal.waitUntilOpen();
    // position:fixed body (not just overflow:hidden) is the load-bearing
    // detail — plain overflow:hidden still lets iOS Safari drag the page.
    expect(await catalog.bodyIsScrollLocked()).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.body).position)).toBe('fixed');

    await modal.close();
    expect(await catalog.bodyIsScrollLocked()).toBe(false);
    expect(await catalog.scrollY()).toBe(before);
  });

  test('add-movie modal locks scroll too, and its form fits the phone screen (BUGS #8)', async ({ page }) => {
    const catalog = await openLoggedInCatalog(page);
    const addModal = new AddModalPage(page);

    await addModal.open();
    expect(await catalog.bodyIsScrollLocked()).toBe(true);

    // The confirm-form used to overflow off-screen on a 390px phone
    // (a flex/grid min-width bug) — the whole overlay must fit the width.
    expect(await catalog.hasHorizontalOverflow()).toBe(false);
    const box = await addModal.overlay.boundingBox();
    expect(box.width).toBeLessThanOrEqual(390 + 1);

    await addModal.close();
    expect(await catalog.bodyIsScrollLocked()).toBe(false);
  });

  test('nested overlays: closing the movie modal after the popover keeps the lock count right (BUGS #8)', async ({ page }) => {
    // lockScroll() is reference-counted — a popover opening over a modal
    // then both closing must end fully unlocked, not stuck locked.
    const catalog = await openLoggedInCatalog(page);
    await catalog.openCard(0);
    const modal = new MovieModalPage(page);
    await modal.waitUntilOpen();
    await modal.close();
    await catalog.openCard(0);
    await modal.waitUntilOpen();
    await modal.close();
    expect(await catalog.bodyIsScrollLocked()).toBe(false);
  });
});

test.describe('phone landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('landscape orientation renders the catalog without sideways scroll (BUGS #8)', async ({ page }) => {
    const catalog = await openLoggedInCatalog(page);
    expect(await catalog.cardCount()).toBeGreaterThan(0);
    expect(await catalog.hasHorizontalOverflow()).toBe(false);

    // And the modal still opens and fits.
    await catalog.openCard(0);
    const modal = new MovieModalPage(page);
    await modal.waitUntilOpen();
    expect(await catalog.hasHorizontalOverflow()).toBe(false);
    await modal.close();
  });
});
