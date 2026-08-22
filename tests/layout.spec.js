// Area: card layout across view modes.
// Covers: BUGS #2 (list-view row layout, badge stretching), BUGS #11
// (rating-badge wrap on a narrow card). Real-browser only — jsdom does no
// layout. All read-only (REQ T-4).
const { test, expect } = require('../support/fixtures');

function overlaps(a, b) {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x ||
           a.y + a.height <= b.y || b.y + b.height <= a.y);
}

test('list view lays a card out as a horizontal row, not a vertical stack (BUGS #2)', async ({ catalog, page }) => {
  await catalog.switchView('list');
  expect(await catalog.currentView()).toBe('list');

  const poster = await catalog.cardPoster(0).boundingBox();
  const title = await catalog.cardTitle(0).boundingBox();
  expect(poster).toBeTruthy();
  expect(title).toBeTruthy();
  // A row: the title starts to the RIGHT of the poster. In the broken
  // (column) layout the title sat far above/below it instead.
  expect(title.x).toBeGreaterThan(poster.x + poster.width - 1);
  // And the row is compact — a list card is a strip, not a poster block.
  const card = await catalog.cards.first().boundingBox();
  expect(card.height).toBeLessThan(card.width / 2);
});

test('small-grid cards show the compact trophy badge, never full pills that stretch the card (BUGS #2)', async ({ catalog, page }) => {
  const i = await catalog.firstCardIndexWithAwards();
  test.skip(i === -1, 'no movie with awards in the catalog right now');

  await catalog.switchView('grid-s');
  await expect(catalog.cardBadgesCompact(i)).toBeVisible();
  await expect(catalog.cardBadgesFull(i)).toBeHidden();

  // And the badges never make the card wider than its own poster column.
  const card = await catalog.cards.nth(i).boundingBox();
  const compact = await catalog.cardBadgesCompact(i).boundingBox();
  expect(compact.x + compact.width).toBeLessThanOrEqual(card.x + card.width + 1);
});

test.describe('narrow phone viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('rating badge wraps under the type/year line instead of overlapping it (BUGS #11)', async ({ catalog, page }) => {
    await catalog.switchView('grid-s');

    // Check every visible card that has both pieces — the bug showed on
    // whichever card happened to have a long type/year + rating combo.
    const n = Math.min(await catalog.cardCount(), 8);
    let checked = 0;
    for (let i = 0; i < n; i++) {
      if (await catalog.cardRatingBadge(i).count() === 0) continue;
      const year = await catalog.cardYearText(i).boundingBox();
      const rating = await catalog.cardRatingBadge(i).boundingBox();
      if (!year || !rating) continue;
      expect(overlaps(year, rating), `card ${i}: rating badge overlaps the type/year text`).toBe(false);
      checked++;
    }
    test.skip(checked === 0, 'no card with a rating badge visible');
  });
});
