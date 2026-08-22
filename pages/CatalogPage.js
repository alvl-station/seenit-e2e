// Page object for the main catalog view (#search, #main .grid .card — see
// src/app.js's render()/cardHtml()).
class CatalogPage {
  constructor(page) {
    this.page = page;
    this.searchInput = page.locator('#search');
    this.main = page.locator('#main');
    this.cards = page.locator('.card');
    this.emptyMessage = page.locator('.empty-msg');
  }

  // '' (not '/') on purpose: baseURL is a project Pages URL with a path
  // segment (https://host/kino-tracker/) — a leading '/' resolves per
  // WHATWG URL rules against the ORIGIN, dropping that segment entirely
  // and 404ing (confirmed against Deploy App run #1: it landed on
  // https://alvl-station.github.io/, GitHub's "no Pages site here" 404).
  async goto(path = '') {
    await this.page.goto(path);
  }

  // The catalog only ever has content once Firebase's initial 'value' read
  // resolves (see moviesRef.on('value', ...) in src/app.js) — no fixed
  // sleep, just wait for the first real card to show up.
  async waitForCatalogLoaded(timeout = 20000) {
    await this.cards.first().waitFor({ state: 'visible', timeout });
  }

  async cardCount() {
    return this.cards.count();
  }

  async search(query) {
    await this.searchInput.fill(query);
  }

  async openCard(index = 0) {
    await this.cards.nth(index).click();
  }

  /* ---- view modes (list / grid-s / grid-m / grid-l) ---- */
  async switchView(v) {
    await this.page.locator(`#viewToggle button[data-v="${v}"]`).click();
  }
  async currentView() {
    return this.page.evaluate(() => document.body.dataset.view);
  }

  /* ---- per-card geometry, for layout assertions ---- */
  cardPoster(index = 0) { return this.cards.nth(index).locator('.poster'); }
  cardTitle(index = 0) { return this.cards.nth(index).locator('h3'); }
  cardYearText(index = 0) { return this.cards.nth(index).locator('.card-meta-row .year'); }
  cardRatingBadge(index = 0) { return this.cards.nth(index).locator('.rating-badge'); }
  /** Full named award pills vs the compact trophy+count fallback (grid-s/list). */
  cardBadgesFull(index = 0) { return this.cards.nth(index).locator('.badges-full'); }
  cardBadgesCompact(index = 0) { return this.cards.nth(index).locator('.badges-compact'); }
  /** Index of the first card that carries award badges, or -1. */
  async firstCardIndexWithAwards() {
    const n = await this.cards.count();
    for (let i = 0; i < Math.min(n, 30); i++) {
      if (await this.cards.nth(i).locator('.badges-full .badge, .badges-compact').count() > 0) return i;
    }
    return -1;
  }

  /* ---- genre chips ---- */
  genreChip(index = 0) { return this.page.locator('#genreChips .chip').nth(index); }
  /** First chip that is NOT the "all genres" one (index 0 is always "Усі жанри"). */
  firstRealGenreChip() { return this.page.locator('#genreChips .chip').nth(1); }
  async chipIsActive(chip) {
    return chip.evaluate(el => el.classList.contains('active'));
  }
  async chipBorderColor(chip) {
    return chip.evaluate(el => getComputedStyle(el).borderColor);
  }

  /* ---- page scroll state (the scroll-lock pattern, CONVENTIONS.md) ---- */
  async scrollTo(y) {
    await this.page.evaluate(v => window.scrollTo(0, v), y);
  }
  async scrollY() {
    return this.page.evaluate(() => window.scrollY);
  }
  async bodyIsScrollLocked() {
    return this.page.evaluate(() => document.body.classList.contains('scroll-locked'));
  }
  /** The page must never scroll sideways, whatever the viewport. */
  async hasHorizontalOverflow() {
    return this.page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
  }

  /* ---- tabs ---- */
  recommendTab() { return this.page.locator('#tabs .tab[data-tab="liked"]'); }
  allTab() { return this.page.locator('#tabs .tab[data-tab="all"]'); }
  async tabIsActive(tab) {
    return tab.evaluate(el => el.classList.contains('active'));
  }
}

module.exports = { CatalogPage };
