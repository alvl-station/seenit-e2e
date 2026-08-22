// Area: toggle-off behaviour and touch-hover media gating.
// Covers: REQ U-6 (second tap deselects back to neutral — BUGS #4 and the
// chip half of #7), BUGS #3 (sticky :hover on touch, via an emulated
// hover:none context). All read-only (REQ T-4).
const { test, expect } = require('../support/fixtures');

test('genre chip deselects on a second tap (REQ U-6)', async ({ catalog, page }) => {
  const chip = catalog.firstRealGenreChip();
  test.skip(await chip.count() === 0, 'catalog has fewer than two genres right now');

  await chip.click();
  expect(await catalog.chipIsActive(chip)).toBe(true);
  await chip.click();
  expect(await catalog.chipIsActive(chip)).toBe(false);
  // back to neutral: the "all genres" chip is the active one again
  expect(await catalog.chipIsActive(catalog.genreChip(0))).toBe(true);
});

test('"Рекомендую" tab deselects back to "Усі" on a second tap (REQ U-6, BUGS #4)', async ({ catalog, page }) => {
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

  test('a tapped-then-deselected genre chip keeps no sticky hover styling (BUGS #3)', async ({ catalog, page }) => {
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
