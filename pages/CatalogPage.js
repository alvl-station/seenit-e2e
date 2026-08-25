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
    // Read the DATA, not the rendered badges. Same signal — the snapshot has
    // no enrichment, so its presence still proves Firebase answered — but it
    // no longer assumes the whole catalogue is on screen. The catalogue is
    // drawn in batches of 200 now, and a run failed here when none of the
    // first 200 films happened to carry a badge.
    await this.page.waitForFunction(
      () => typeof MOVIES !== 'undefined'
        && MOVIES.some(m => m && (m.critic_score != null || m.awards_won || m.awards_nominated)),
      null,
      { timeout },
    );
    // ...and then wait for it to STOP arriving.
    //
    // The catalogue comes from D1 in pages of a thousand now, and every page
    // re-sorts and re-groups the grid. The check above is satisfied by the
    // FIRST page, so without this the suite starts work while thirteen more
    // are still landing — and a card's position is not stable until they
    // stop. Scenarios that find a card and then act on it by index were
    // asserting against a different film by the time they got there:
    //
    //   waiting for locator('.card').nth(61).locator('.card-awards')
    //
    // Guarded like the marks wait in support/fixtures.js: a bundle deployed
    // before the beacon existed simply proceeds as it did before, rather
    // than failing every scenario at the fixture.
    await this.page.waitForFunction(() => window.__catalogueLoaded === true, null, { timeout })
      .catch(() => { /* older bundle without the beacon */ });
  }

  async cardCount() {
    return this.cards.count();
  }

  /**
   * Text of the "nothing found" panel, or null when there are results.
   *
   * textContent, NOT innerText — and every text reader in this file follows
   * the same rule now. The redesigned interface uppercases through CSS
   * (text-transform is on some forty rules in src/style.css), and innerText
   * returns what is DRAWN: "НІЧОГО НЕ ЗНАЙДЕНО" for markup that says
   * "Нічого не знайдено". Assertions carry the words the app writes, so a
   * reader has to hand back those words. The mismatch was not theoretical:
   * cardTitleText() read innerText while indexOfCardTitled() compared
   * textContent, so a title remembered in one step could never be found by
   * the next, and three mark scenarios failed on a film that was there.
   */
  async emptyMessageText() {
    const n = await this.emptyMessage.count();
    return n ? (await this.emptyMessage.textContent()).trim() : null;
  }

  /* ---- the slimmed header: the search field and the two bottom sheets ----
   * Search is no longer a layer with a list of its own. The icon grows into
   * a field and the QUERY FILTERS THE PAGE, so a dead end shows up in the
   * grid's own empty panel — there is no second place to look. */
  get searchBox() { return this.page.locator('#topSearch'); }
  get searchEmptyMessage() { return this.emptyMessage; }
  async searchIsOpen() {
    return this.searchBox.evaluate(el => el.classList.contains('open'));
  }
  async openSearchField() {
    if (await this.searchIsOpen()) return;
    await this.page.locator('#searchOpenBtn').click();
    await this.page.locator('#topSearch.open').waitFor();
    await this.settleSearchWidth();
  }
  /**
   * Waits for the field to finish arriving before anyone measures it.
   *
   * The open class lands the instant the icon is tapped; the WIDTH arrives
   * behind it over a .22s transition (and, in a browser that animates
   * nothing, via the app's own 300ms fallback that drops the easing — REQ
   * U-9). A boundingBox() read at the class therefore reads 44px — the
   * icon's width — and reports an open field as an unusable one.
   *
   * Two identical samples rather than a fixed sleep: a field that genuinely
   * never grows settles at 44 and the assertion still fails, which is the
   * failure the scenario exists to catch.
   */
  async settleSearchWidth(timeout = 2000) {
    await this.page.evaluate(() => { window.__seenitSearchW = -1; });
    await this.page.waitForFunction(() => {
      const el = document.getElementById('topSearch');
      if (!el) return false;
      const w = Math.round(el.getBoundingClientRect().width);
      const settled = window.__seenitSearchW === w;
      window.__seenitSearchW = w;
      return settled;
    }, null, { timeout, polling: 100 }).catch(() => { /* best-effort: the assertion judges the width */ });
  }
  /** The same control closes it, and closing CLEARS the query — the grid
   *  never stays silently filtered. That is the app's contract, not ours. */
  async closeSearchField() {
    if (!(await this.searchIsOpen())) return;
    await this.page.locator('#searchOpenBtn').click();
    await this.page.locator('#topSearch:not(.open)').waitFor();
  }
  /** Only inside a collection, and only while the field is open. */
  get searchScopeToggle() { return this.page.locator('#searchScope'); }
  async openMenu() {
    await this.page.locator('#menuBtn').click();
    await this.page.locator('#menuSheet.open').waitFor();
    await this.settleSheet('#menuSheet');
  }
  /**
   * Waits for a sheet to finish sliding in.
   *
   * Same shape as settleSearchWidth, and for the same reason: the open class
   * lands first and the geometry follows. It matters most for the one row
   * that is tapped with force — force skips the actionability checks but not
   * the geometry, so a click aimed at a sheet still on its way up lands
   * outside the viewport, intermittently.
   */
  async settleSheet(selector, timeout = 2000) {
    await this.page.evaluate(() => { window.__seenitSheetY = -1; });
    await this.page.waitForFunction((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const y = Math.round(el.getBoundingClientRect().top);
      const settled = window.__seenitSheetY === y;
      window.__seenitSheetY = y;
      return settled;
    }, selector, { timeout, polling: 100 }).catch(() => { /* best-effort */ });
  }
  async closeMenu() {
    await this.page.locator('#menuBackdrop').click({ position: { x: 10, y: 10 } });
    await this.page.locator('#menuSheet:not(.open)').waitFor();
  }
  async openSettingsDrawer() {
    await this.openMenu();
    await this.page.locator('#settingsBtn').click();
    await this.page.locator('#settingsSheet.open').waitFor();
  }
  async closeSettingsDrawer() {
    await this.page.locator('#settingsCloseBtn').click();
    await this.page.locator('#settingsSheet:not(.open)').waitFor();
    // The menu shut itself the moment the row was tapped — every enabled
    // row does (src/app.js: the sheet closes unless the row is
    // aria-disabled, which is how the delete row stays put to explain
    // itself). So this closes it only if something left it open.
    if (await this.page.locator('#menuSheet.open').count()) await this.closeMenu();
  }
  async openFilterDrawer() {
    await this.page.locator('#filterBtn').click();
    await this.page.locator('#filterSheet.open').waitFor();
  }
  async closeFilterDrawer() {
    await this.page.locator('#filterBackdrop').click({ position: { x: 10, y: 10 } });
    await this.page.locator('#filterSheet:not(.open)').waitFor();
  }

  async search(query) {
    await this.openSearchField();
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

  /* ---- view modes (list / grid-s / grid-m) ----
   * They live in НАЛАШТУВАННЯ now, not in ФІЛЬТР, and the path through the
   * UI has to respect the split that put them there: ФІЛЬТР answers "which
   * films", НАЛАШТУВАННЯ answers "how they are drawn", and a view mode is
   * the second question. Opening НАЛАШТУВАННЯ does not close the menu it
   * was opened from, so both are shut again on the way out. */
  async switchView(v) {
    await this.openSettingsDrawer();
    await this.page.locator(`#viewToggle button[data-v="${v}"]`).click();
    await this.closeSettingsDrawer();
  }
  async currentView() {
    return this.page.evaluate(() => document.body.dataset.view);
  }

  /* ---- per-card geometry, for layout assertions ---- */
  cardPoster(index = 0) { return this.cards.nth(index).locator('.poster'); }
  cardTitle(index = 0) { return this.cards.nth(index).locator('h3'); }
  cardYearText(index = 0) { return this.cards.nth(index).locator('.card-meta-row .year'); }
  cardRatingBadge(index = 0) { return this.cards.nth(index).locator('.rating-badge'); }
  /** The card's award row — two sums («НАГОРОДИ n» / «НОМІНАЦІЇ n»), tappable
   *  for the per-ceremony breakdown. Replaced the poster trophy in the
   *  interface-book redesign: awards are data, so they live in the data
   *  block under the title, never on the poster. */
  cardAwardsRow(index = 0) { return this.cards.nth(index).locator('.card-awards'); }
  cardAwardsWonField(index = 0) { return this.cards.nth(index).locator('.aw--won'); }
  cardAwardsNomField(index = 0) { return this.cards.nth(index).locator('.aw--nom'); }
  /** The critic strip (track + fill + number) — same .critic-badge hook the
   *  old colored badge carried, so the popover contract is unchanged. */
  cardCriticBadge(index = 0) { return this.cards.nth(index).locator('.critic-badge'); }
  get infoPopover() { return this.page.locator('#infoPopover'); }
  /**
   * Index of a card carrying award badges, or -1 when the catalogue has none.
   *
   * awards_won is a list on older records and a per-ceremony registry on
   * newer ones, so both shapes are counted — and an empty one of either shape
   * is not an award.
   */
  async firstCardIndexWithAwards() {
    // The row renders for wins OR nominations now — either earns it.
    //
    // The helper lives INSIDE the predicate on purpose. revealCardWhere
    // serialises this function and rebuilds it with `new Function` inside the
    // page, so anything it closes over here simply does not exist there —
    // a helper defined one line above became `ReferenceError: has is not
    // defined` in the browser.
    //
    // It stayed invisible for as long as the suite only ever met a catalogue
    // whose first screen already showed an award row: the fast path returns
    // before the predicate is ever serialised. Against the live catalogue,
    // where 200 of 13.5k films are drawn at a time and the first 200 may
    // carry no award at all, the slow path runs — and every award scenario
    // failed at once.
    return this.revealCardWhere(
      (m) => {
        const has = v => v && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0);
        return has(m.awards_won) || has(m.awards_nominated);
      },
      '.card-awards',
    );
  }

  /** Index of a card showing the critic strip, or -1. */
  async firstCardIndexWithCriticScore() {
    return this.revealCardWhere(m => m.critic_score != null, '.critic-badge');
  }

  /**
   * Index of a card matching `predicate`, SEARCHING for one if none is drawn.
   *
   * The catalogue renders 200 cards at a time, so "scan what is on screen"
   * silently stopped finding films that exist — an award scenario would skip
   * itself rather than fail, and coverage would quietly drain away as the
   * catalogue grew. This looks in MOVIES instead, and when the match is not
   * currently drawn it types the title into the search box to bring it up.
   *
   * Returns -1 only when no film in the catalogue matches at all.
   */
  async revealCardWhere(predicate, drawnSelector) {
    // Fast path: something already on screen matches, so nothing has to move.
    // Skipped when the film carries no visible mark on its card (providers).
    if (drawnSelector) {
      const drawn = await this.page.evaluate(sel => {
        const cards = [...document.querySelectorAll('.card')];
        return cards.findIndex(c => c.querySelector(sel));
      }, drawnSelector);
      if (drawn !== -1) return drawn;
    }

    // The predicate is serialised and rebuilt inside the page: page.evaluate
    // cannot carry a closure across the boundary.
    const found = await this.page.evaluate(src => {
      // eslint-disable-next-line no-new-func
      const match = new Function(`return (${src})`)();
      if (typeof MOVIES === 'undefined') return null;
      const m = MOVIES.find(x => x && match(x));
      return m ? { title: m.canonical_title_uk, group: m.genre_group || 'Інше' } : null;
    }, predicate.toString());
    if (!found) return -1;

    // The search layer covers the grid instead of filtering it now, so the
    // reveal goes the way a person would: narrow the grid to the film's
    // genre group via the ribbon, then let batches draw until the card is
    // on the page (or nothing is left to draw).
    await this.page.locator(`#genreChips .chip[data-g="${found.group}"]`).click();
    for (let i = 0; i < 80; i++) {
      const idx = await this.page.evaluate(([sel, title]) => {
        const cards = [...document.querySelectorAll('.card')];
        if (sel) return cards.findIndex(c => c.querySelector(sel));
        return cards.findIndex(c => {
          const h = c.querySelector('h3');
          return h && h.textContent.trim() === title;
        });
      }, [drawnSelector, found.title]);
      if (idx !== -1) return idx;
      const sentinel = this.page.locator('#renderSentinel');
      if (!(await sentinel.count())) break;
      await sentinel.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(150);
    }
    return -1;
  }

  /**
   * Index of the first card whose film has providers on file, or -1.
   *
   * Providers are not drawn on the card — only inside the modal — so this
   * reads MOVIES (the app's own loaded catalogue, reachable from the page the
   * same way AWARD_INFO is) and matches back to a card by data-id, rather
   * than opening modals one after another until one happens to have them.
   *
   * -1 is the ORDINARY answer until the provider backfill has run over the
   * catalogue, so callers skip on it rather than fail.
   */
  async firstCardIndexWithProviders() {
    // Providers are drawn only inside the modal, so there is no badge on a
    // card to look for — the film is located in MOVIES and searched up.
    return this.revealCardWhere(
      m => Array.isArray(m.providers) && m.providers.length > 0, null);
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

  /** Arms the dialog to always answer "no", then enters delete mode —
   *  which lives in the menu sheet now. The sheet closes itself after a
   *  row is tapped. */
  async enterDeleteMode() {
    this.page.on('dialog', d => d.dismiss());
    await this.openMenu();
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
    return (await this.cardTitle(index).textContent()).trim();
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

  /* ---- account panel & onboarding guide ---- */
  get accountButton() { return this.page.locator('#accountBtn'); }
  get accountOverlay() { return this.page.locator('#accountOverlay'); }
  get onboardOverlay() { return this.page.locator('#onboardOverlay'); }
  /** "Акаунт" is a row in the menu sheet — the sheet has to be open before
   *  the row is anything a click can reach. */
  async openAccountPanel() {
    await this.openMenu();
    await this.accountButton.click();
  }
  async accountPanelIsOpen() {
    return this.accountOverlay.evaluate(el => el.classList.contains('open'));
  }
  async accountUsername() {
    return (await this.page.locator('#accountBox .acc-name').innerText()).trim();
  }
  async closeAccountPanel() { await this.page.locator('#accCloseBtn').click(); }
  async openGuideFromAccount() { await this.page.locator('#accGuideBtn').click(); }
  async guideIsOpen() {
    return this.onboardOverlay.evaluate(el => el.classList.contains('open'));
  }
  async closeGuide() { await this.page.locator('#onbDoneBtn').click(); }
  async trendingCount() { return this.page.locator('#trendGrid .trend-item').count(); }
  /** Closes the guide if it auto-opened (a first visit on this account). */
  async dismissGuideIfShown() {
    if (await this.guideIsOpen().catch(() => false)) await this.closeGuide();
  }

  /* ---- the recommendations flow ("Добірки") ---- */
  get recsButton() { return this.page.locator('#recsBtn'); }
  get recsOverlay() { return this.page.locator('#recsOverlay'); }
  async openRecs() {
    await this.openMenu();
    await this.recsButton.click();
  }
  async recsIsOpen() { return this.recsOverlay.evaluate(el => el.classList.contains('open')); }
  async closeRecs() { await this.page.locator('#recsCloseBtn').click(); }
  async recsSourceTabs() {
    return (await this.page.locator('#recsBox [data-recs-src]').allTextContents())
      .map(t => t.trim());
  }
  async switchRecsSource(id) { await this.page.locator(`[data-recs-src="${id}"]`).click(); }
  async recsBodyText() { return (await this.page.locator('#recsbody').textContent()).trim(); }
  async recsListChips() {
    return (await this.page.locator('.recs-list-chip').allTextContents()).map(t => t.trim());
  }
  async openRecsList(title) {
    await this.page.locator('.recs-list-chip', { hasText: title }).click();
  }
  async recsGridCount() { return this.page.locator('#recsbody .trend-item').count(); }

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
  // There is no "all genres" chip — every chip here is a real genre. Neutral
  // (no filter) is reached only by deselecting whichever one is active; see
  // noChipHighlighted() below.
  genreChip(index = 0) { return this.page.locator('#genreChips .chip').nth(index); }
  async chipIsActive(chip) {
    return chip.evaluate(el => el.classList.contains('active'));
  }
  async chipBorderColor(chip) {
    return chip.evaluate(el => getComputedStyle(el).borderColor);
  }
  async noChipHighlighted() {
    return (await this.page.locator('#genreChips .chip.active').count()) === 0;
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
  // There is no "Усі" tab — it's the neutral state, reached only by
  // deselecting whichever tab is active; see noTabHighlighted() below.
  recommendTab() { return this.page.locator('#tabs .tab[data-tab="liked"]'); }
  async tabIsActive(tab) {
    return tab.evaluate(el => el.classList.contains('active'));
  }
  async noTabHighlighted() {
    return (await this.page.locator('#tabs .tab[data-tab].active').count()) === 0;
  }
}

module.exports = { CatalogPage };
