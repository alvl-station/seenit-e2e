// Toggle-off and touch-hover behaviour — pure client-side UI state, so all
// read-only against the real catalog (REQUIREMENTS T-4):
//
//   U-6      a filtering control deselects on a second tap, back to neutral
//            (shipped bugs: the "Рекомендую" tab just re-applied itself —
//            BUGS #4 — and the genre chip's earlier sibling bug in #7)
//   BUGS #3  sticky :hover on touch — a tapped-then-deselected chip looked
//            identical to a selected one, because an unguarded :hover rule
//            shared .active's accent color. The fix gates :hover behind
//            @media (hover: hover); on a touch device that media query is
//            false, so no hover styling may stick after a tap.
const { test, expect } = require('@playwright/test');
const { openLoggedInCatalog } = require('./support/session');

test('genre chip deselects on a second tap (REQ U-6)', async ({ page }) => {
  const catalog = await openLoggedInCatalog(page);
  const chip = catalog.firstRealGenreChip();
  test.skip(await chip.count() === 0, 'catalog has fewer than two genres right now');

  await chip.click();
  expect(await catalog.chipIsActive(chip)).toBe(true);
  await chip.click();
  expect(await catalog.chipIsActive(chip)).toBe(false);
  // back to neutral: the "all genres" chip is the active one again
  expect(await catalog.chipIsActive(catalog.genreChip(0))).toBe(true);
});

test('"Рекомендую" tab deselects back to "Усі" on a second tap (REQ U-6, BUGS #4)', async ({ page }) => {
  const catalog = await openLoggedInCatalog(page);
  const tab = catalog.recommendTab();

  await tab.click();
  expect(await catalog.tabIsActive(tab)).toBe(true);
  await tab.click();
  expect(await catalog.tabIsActive(tab)).toBe(false);
  expect(await catalog.tabIsActive(catalog.allTab())).toBe(true);
});

test.describe('touch device', () => {
  // A touch profile spelled out by hand (a devices[] preset carries
  // defaultBrowserType, which test.use() rejects inside a describe):
  // hasTouch + isMobile flips the emulated media to hover:none — exactly
  // the state the @media (hover: hover) gate exists for.
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a tapped-then-deselected genre chip keeps no sticky hover styling (BUGS #3)', async ({ page }) => {
    const catalog = await openLoggedInCatalog(page);
    const chip = catalog.firstRealGenreChip();
    test.skip(await chip.count() === 0, 'catalog has fewer than two genres right now');

    const restingBorder = await catalog.chipBorderColor(chip);

    await chip.tap();
    expect(await catalog.chipIsActive(chip)).toBe(true);
    await chip.tap(); // deselect — this is where the sticky :hover used to linger
    expect(await catalog.chipIsActive(chip)).toBe(false);

    // The deselected chip must look exactly like it did before any touch —
    // the shipped bug left it wearing the accent border, indistinguishable
    // from a selected chip.
    expect(await catalog.chipBorderColor(chip)).toBe(restingBorder);
  });
});
