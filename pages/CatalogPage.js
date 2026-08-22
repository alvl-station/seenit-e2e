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

  /**
   * Waits for the LIVE Firebase catalog, not the first paint.
   *
   * src/movies-data.js is a build-time snapshot rendered instantly so the
   * page is never blank; it carries no awards and no critic scores at all.
   * Waiting only for "a card is visible" therefore returns during that
   * placeholder render — which silently skipped five scenarios once login
   * got fast enough (a saved session) to beat the Firebase read. Enrichment
   * fields only ever come from Firebase, so their appearance IS the signal
   * that the real data landed.
   */
  async waitForCatalogLoaded(timeout = 20000) {
    await this.cards.first().waitFor({ state: 'visible', timeout });
    await this.page.waitForFunction(
      () => !!document.querySelector('.badge--critic, .badges-full .badge, .badges-compact'),
      null,
      { timeout },
    );
  }

  async cardCount() {
    return this.cards.count();
  }

  /** Text of the "nothing found" panel, or null when there are results. */
  async emptyMessageText() {
    const n = await this.emptyMessage.count();
    return n ? (await this.emptyMessage.innerText()).trim() : null;
  }

  async search(query) {
    await this.searchInput.fill(query);
  }

  async openCard(index = 0) {
    await this.cards.nth(index).click();
  }

  /**
   * Opens the first card already fully inside the CURRENT viewport, without
   * letting Playwright auto-scroll to reach one — for tests that assert the
   * scroll position survives an open/close cycle, where an implicit scroll
   * before the click would silently move the goalposts.
   */
  async openVisibleCard() {
    const n = await this.cards.count();
    const vh = this.page.viewportSize().height;
    for (let i = 0; i < n; i++) {
      const box = await this.cards.nth(i).boundingBox();
      if (box && box.y >= 0 && box.y + box.height <= vh) {
        await this.cards.nth(i).click({ position: { x: 10, y: 10 } });
        return true;
      }
    }
    return false;
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
  /**
   * Index of the first card carrying award badges, or -1. Scans EVERY card
   * in one page.evaluate rather than N locator round-trips — and scanning
   * all of them matters: the saved UI settings restored with the session
   * can change the sort order, so "the first 30" is not a stable window
   * (three award scenarios silently skipped when it was).
   */
  async firstCardIndexWithAwards() {
    return this.page.evaluate(() => {
      const cards = [...document.querySelectorAll('.card')];
      return cards.findIndex(c => c.querySelector('.badges-full .badge, .badges-compact'));
    });
  }

  /** Index of the first card showing a critic-score badge, or -1. */
  async firstCardIndexWithCriticScore() {
    return this.page.evaluate(() => {
      const cards = [...document.querySelectorAll('.card')];
      return cards.findIndex(c => c.querySelector('.badge--critic'));
    });
  }

  /* ---- delete mode ----
   * READ-ONLY, deliberately. kino/movies is a single global catalog shared by
   * every login (there is no per-user data — see CLAUDE.md), so a confirmed
   * delete from CI would destroy the owner's real films. These helpers can
   * enter the mode, select and cancel; nothing here confirms, and the
   * confirm dialog is auto-dismissed as a second line of defence.
   */
  get deleteModeButton() { return this.page.locator('#deleteModeBtn'); }
  get deleteBar() { return this.page.locator('#deleteBar'); }
  get deleteBarCount() { return this.page.locator('#deleteCount'); }
  get deleteConfirmButton() { return this.page.locator('#deleteConfirmBtn'); }
  get deleteCancelButton() { return this.page.locator('#deleteCancelBtn'); }

  /** Arms the dialog to always answer "no", then enters delete mode. */
  async enterDeleteMode() {
    this.page.on('dialog', d => d.dismiss());
    await this.deleteModeButton.click();
  }
  async leaveDeleteMode() { await this.deleteCancelButton.click(); }
  async deleteModeIsOn() {
    return (await this.deleteModeButton.getAttribute('aria-pressed')) === 'true';
  }
  async deleteBarIsVisible() { return this.deleteBar.isVisible(); }
  async selectForDelete(index = 0) { await this.cards.nth(index).click(); }
  async selectedCount() { return this.page.locator('.card.is-selected').count(); }
  async deleteConfirmIsEnabled() { return this.deleteConfirmButton.isEnabled(); }
  async deleteBarText() { return (await this.deleteBarCount.innerText()).trim(); }
  async modalIsOpen() {
    return this.page.locator('#modalOverlay.open').isVisible().catch(() => false);
  }

  get watchedToggle() { return this.page.locator('#watchedToggle'); }
  async tapWatchedToggle() { await this.watchedToggle.click(); }

  /* ---- per-card watched/liked toggles ----
   * Safe to USE now, and that is new. These lists used to be global nodes
   * shared by every login, so a test that toggled one changed the owner's
   * real data — which is why the whole suite was read-only. Marks now hang
   * off the signed-in uid, so CI toggles its own account's list and nobody
   * else's. kino/movies is still shared, so adding and deleting films stays
   * forbidden here.
   */
  cardWatchedToggle(index = 0) { return this.cards.nth(index).locator('[data-act="watch"]'); }
  cardLikedToggle(index = 0) { return this.cards.nth(index).locator('[data-act="like"]'); }
  async toggleWatchedOnCard(index = 0) { await this.cardWatchedToggle(index).click(); }
  async toggleLikedOnCard(index = 0) { await this.cardLikedToggle(index).click(); }
  async cardIsWatched(index = 0) {
    return this.cards.nth(index).evaluate(el => el.classList.contains('is-watched'));
  }
  async cardTitleText(index = 0) {
    return (await this.cardTitle(index).innerText()).trim();
  }
  /**
   * Toggling BY TITLE, not by index — and that is the point, not a
   * nicety. The default view hides watched titles, so the moment a film is
   * marked it leaves the grid and every later index points at a different
   * film. A cleanup step working by index would unmark the wrong one and
   * leave the original marked, quietly accumulating state in the account.
   */
  cardTitled(title) {
    return this.cards.filter({ has: this.page.locator('h3', { hasText: title }) }).first();
  }
  async toggleWatchedOnCardTitled(title) {
    await this.cardTitled(title).locator('[data-act="watch"]').click();
  }
  async toggleLikedOnCardTitled(title) {
    await this.cardTitled(title).locator('[data-act="like"]').click();
  }
  async cardTitledIsWatched(title) {
    return this.cardTitled(title).evaluate(el => el.classList.contains('is-watched'));
  }

  /** Index of the visible card with this title, or -1. */
  async indexOfCardTitled(title) {
    return this.page.evaluate(
      t => [...document.querySelectorAll('.card')].findIndex(c => c.querySelector('h3').textContent.trim() === t),
      title,
    );
  }

  /* ---- tab counts ---- */
  /** The N inside "Дивився (N)", or null when the chip shows no number. */
  async watchedTabCount() { return this._tabCount('#nWatched'); }
  async likedTabCount() { return this._tabCount('#nLiked'); }
  async _tabCount(sel) {
    const text = (await this.page.locator(sel).innerText()).trim();
    const m = /\((\d+)\)/.exec(text);
    return m ? Number(m[1]) : null;
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
