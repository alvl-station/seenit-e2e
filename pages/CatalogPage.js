// Page object for the main screen: the two bars (header words on top, the
// tab strip at the bottom), the shelf of cards, and the pages the bars open.
// The header's own icons are hidden (src/style.css: the doors went to the
// strip), so every page is opened by its tab.
class CatalogPage {
  constructor(page) {
    this.page = page;
    this.main = page.locator('#main');
    this.cards = page.locator('.card');
    this.emptyMessage = page.locator('#main .empty-msg');
  }

  // '' rather than '/': baseURL may carry a path segment.
  async goto(path = '') {
    await this.page.goto(path);
  }

  /** Waits for the live catalogue, then for it to stop arriving. */
  async waitForCatalogLoaded(timeout = 20000) {
    await this.cards.first().waitFor({ state: 'attached', timeout });
    await this.page.waitForFunction(
      () => typeof MOVIES !== 'undefined'
        && MOVIES.some(m => m && (m.critic_score != null || m.awards_won || m.awards_nominated)),
      null,
      { timeout },
    );
    await this.page.waitForFunction(() => window.__catalogueLoaded === true, null, { timeout })
      .catch(() => { /* older bundle without the beacon */ });
  }

  async cardCount() {
    return this.cards.count();
  }
  /** How many films the shelf lists; only the first batches are drawn. */
  async listedCount() {
    return this.page.evaluate(() => visibleMovies().length);
  }

  // textContent, not innerText: the interface uppercases through CSS.
  async emptyMessageText() {
    const n = await this.emptyMessage.count();
    return n ? (await this.emptyMessage.textContent()).trim() : null;
  }

  /* ---- the two bars ---- */
  stripTab(id) { return this.page.locator(`#tabbarScroll .tabbar-tab[data-tab="${id}"]`); }
  headerTab(id) { return this.page.locator(`#topbarTabs .topbar-tab[data-tab="${id}"]`); }
  /** The row a page lends the strip while it is open (marks, switches, Apply). */
  windowTab(text) {
    return this.page.locator('.tabbar-window-row .tabbar-tab--window', { hasText: text });
  }
  windowTabTitled(title) {
    return this.page.locator(`.tabbar-window-row .tabbar-tab--window[title="${title}"]`);
  }
  async stripTabLit(id) {
    return this.stripTab(id).evaluate(el => el.classList.contains('active'));
  }
  async pressStripTab(id) { await this.stripTab(id).click(); }
  async pressHeaderTab(id) { await this.headerTab(id).click(); }
  /** How many tabs the strip is drawing right now (its own or a page's). */
  async stripTabCount() {
    return this.page.locator('#tabbarScroll .tabbar-tab').count();
  }
  /** The sheet the strip used to be arranged in; retired on 2026-09-16. */
  async arrangeSheetCount() {
    return this.page.locator('#tabbarSheet').count();
  }
  /** «Фільми» or «Серіали» in the header: the shelf shows one kind at a time. */
  async showShelf(id) {
    const type = { films: 'фільм', series: 'серіал' }[id];
    await this.pressHeaderTab(id);
    await this.page.waitForFunction(t => state.type === t, type);
    await this.cards.first().waitFor({ state: 'attached' });
  }

  /** Waits for a sheet to finish sliding in before anything measures it. */
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

  /* ---- the shelf's own switches, in the drop on the bar ---- */
  get shelfDrop() { return this.page.locator('#shelfDrop'); }
  async shelfDropIsShown() { return this.shelfDrop.isVisible(); }
  /** Two grids now (the list went on 2026-09-15). */
  async switchView(v) {
    await this.shelfDrop.locator(`[data-v="${v}"]`).click();
    await this.page.waitForFunction(view => document.body.dataset.view === view, v);
  }
  async currentView() {
    return this.page.evaluate(() => document.body.dataset.view);
  }
  get scoresKey() { return this.page.locator('#scoresToggle'); }
  async scoresAreShown() {
    return this.scoresKey.evaluate(el => el.classList.contains('active'));
  }

  /* ---- the filter window ---- */
  async openFilterDrawer() {
    if (await this.page.locator('#filterSheet.open').count()) return;
    await this.pressStripTab('filter');
    await this.page.locator('#filterSheet.open').waitFor();
    await this.settleSheet('#filterSheet');
  }
  async closeFilterDrawer() {
    if (!(await this.page.locator('#filterSheet.open').count())) return;
    await this.pressStripTab('filter');
    await this.page.locator('#filterSheet:not(.open)').waitFor({ state: 'attached' });
  }
  // Choices reach the shelf only on «Застосувати», pressed in the strip.
  async applyFilters() {
    await this.windowTab('Застосувати').click();
    await this.page.locator('#filterSheet:not(.open)').waitFor({ state: 'attached' });
  }
  /* The genre is an option in the filter window; the options are in the
   * document whether the window is open or not. */
  genreOption(index = 0) {
    return this.page.locator('#genreOpts .opt[data-g]:not([data-g="all"])').nth(index);
  }
  async genreOptionCount() {
    return this.page.locator('#genreOpts .opt[data-g]:not([data-g="all"])').count();
  }
  async optionIsActive(opt) {
    return opt.evaluate(el => el.classList.contains('active'));
  }
  async optionBorderColor(opt) {
    let last = null;
    for (let i = 0; i < 20; i++) {
      const now = await opt.evaluate(el => getComputedStyle(el).borderColor);
      if (now === last) return now;
      last = now;
      await this.page.waitForTimeout(120);
    }
    return last;
  }
  async noGenreChosen() {
    return (await this.page.locator('#genreOpts .opt.active[data-g]:not([data-g="all"])').count()) === 0;
  }
  /** Narrows the shelf to one genre group through the window and «Застосувати». */
  async chooseGenreGroup(group) {
    await this.openFilterDrawer();
    await this.page.locator(`#genreOpts .opt[data-g="${group}"]`).click();
    await this.applyFilters();
  }
  yearOption(key) { return this.page.locator(`#yearOpts .opt[data-years="${key}"]`); }
  async yearOptionActive(key) {
    return this.yearOption(key).evaluate(el => el.classList.contains('active'));
  }
  async visibleCardYears() {
    return this.page.locator('.card .card-meta-row .year').evaluateAll(els =>
      els.map(el => Number((/(\d{4})/.exec(el.textContent || '') || [])[1])).filter(Boolean));
  }
  async providerFilterOffered() {
    return (await this.page.locator('#providerFilter .opt').count()) > 0;
  }
  providerOption(index = 0) { return this.page.locator('#providerFilter .opt').nth(index); }

  /* ---- cards ---- */
  async openCard(index = 0) {
    await this.cards.nth(index).click();
  }
  /** Opens the first card fully inside the viewport, without auto-scrolling. */
  async openVisibleCard() {
    const n = await this.cards.count();
    const vh = this.page.viewportSize().height;
    const header = await this.page.locator('header').boundingBox();
    const strip = await this.page.locator('#tabbar').boundingBox();
    const top = header ? header.y + header.height : 0;
    const bottom = strip ? strip.y : vh;
    for (let i = 0; i < n; i++) {
      const box = await this.cards.nth(i).boundingBox();
      if (box && box.y >= top && box.y + box.height <= bottom) {
        await this.cards.nth(i).click();
        return true;
      }
    }
    return false;
  }
  cardPoster(index = 0) { return this.cards.nth(index).locator('.poster'); }
  cardTitle(index = 0) { return this.cards.nth(index).locator('h3'); }
  cardYearText(index = 0) { return this.cards.nth(index).locator('.card-meta-row .year').first(); }
  cardRatingBadge(index = 0) { return this.cards.nth(index).locator('.rating-badge'); }
  cardAwardsRow(index = 0) { return this.cards.nth(index).locator('.card-awards'); }
  cardCriticBadge(index = 0) { return this.cards.nth(index).locator('.critic-badge'); }
  get infoPopover() { return this.page.locator('#infoPopover'); }

  async firstCardIndexWithAwards() {
    // The helper lives inside the predicate: it is serialised into the page.
    return this.revealCardWhere(
      (m) => {
        const has = v => v && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0);
        return has(m.awards_won) || has(m.awards_nominated);
      },
      '.card-awards',
    );
  }
  async firstCardIndexWithCriticScore() {
    return this.revealCardWhere(m => m.critic_score != null, '.critic-badge');
  }
  async firstCardIndexWithProviders() {
    // The rows the card will actually SHOW: the app hides url-less rows and
    // ruled-out services (visibleProviders), so a film whose only rows are
    // those opens with no provider section at all.
    return this.revealCardWhere(m => (typeof visibleProviders === 'function'
      ? visibleProviders(m.providers)
      : (m.providers || []).filter(p => p && p.url)).length > 0, null);
  }
  /**
   * Index of a card matching `predicate`; when none is drawn, narrows the
   * shelf to the film's genre group and lets batches draw until it appears.
   * -1 when no film in the catalogue matches at all.
   */
  async revealCardWhere(predicate, drawnSelector) {
    if (drawnSelector) {
      const drawn = await this.page.evaluate(sel => {
        const cards = [...document.querySelectorAll('.card')];
        return cards.findIndex(c => c.querySelector(sel));
      }, drawnSelector);
      if (drawn !== -1) return drawn;
    }
    // Every matching film, by the id its card carries (data-id), not the
    // first one's title: the first match can sit hundreds of cards deep in
    // its genre, and scrolling batch after batch to reach it ran the
    // "Де подивитись" scenarios past the 30 s test timeout. Any matching
    // card already drawn wins; otherwise the group with the most matches is
    // narrowed to and the first matching card to be drawn wins.
    const found = await this.page.evaluate(src => {
      // eslint-disable-next-line no-new-func
      const match = new Function(`return (${src})`)();
      if (typeof MOVIES === 'undefined') return null;
      const ids = [], groups = {};
      for (const m of MOVIES) {
        if (!m || !match(m)) continue;
        ids.push(String(m.id));
        const g = m.genre_group || 'Інше';
        groups[g] = (groups[g] || 0) + 1;
      }
      if (!ids.length) return null;
      const group = Object.keys(groups).sort((a, b) => groups[b] - groups[a])[0];
      return { ids, group };
    }, predicate.toString());
    if (!found) return -1;
    const drawnMatch = () => this.page.evaluate(([sel, ids]) => {
      const want = new Set(ids);
      const cards = [...document.querySelectorAll('.card')];
      if (sel) return cards.findIndex(c => c.querySelector(sel));
      return cards.findIndex(c => want.has(c.getAttribute('data-id')));
    }, [drawnSelector, found.ids]);
    const already = await drawnMatch();
    if (already !== -1) return already;
    await this.chooseGenreGroup(found.group);
    for (let i = 0; i < 80; i++) {
      const idx = await drawnMatch();
      if (idx !== -1) return idx;
      const sentinel = this.page.locator('#renderSentinel');
      if (!(await sentinel.count())) break;
      await sentinel.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(150);
    }
    return -1;
  }

  /* ---- the bin bar (nothing here ever confirms) ---- */
  get deleteBar() { return this.page.locator('#deleteBar'); }
  get deleteBarCount() { return this.page.locator('#deleteCount'); }
  get deleteConfirmButton() { return this.page.locator('#deleteConfirmBtn'); }
  get deleteCancelButton() { return this.page.locator('#deleteCancelBtn'); }
  async deleteBarIsVisible() { return this.deleteBar.isVisible(); }
  async selectedCount() { return this.page.locator('.card.is-selected').count(); }
  async modalIsOpen() {
    return this.page.locator('#modalOverlay.open').isVisible().catch(() => false);
  }

  /* ---- the archive and its three words ---- */
  async archiveIsOpen() {
    return this.page.locator('#watchedToggle').evaluate(el => el.classList.contains('active'));
  }
  /** «Архів» in the strip: a toggle, so it opens or closes the archive. */
  async tapWatchedToggle() {
    const before = await this.archiveIsOpen();
    await this.pressStripTab('seen');
    await this.page.waitForFunction(was => document.getElementById('watchedToggle').classList.contains('active') !== was, before);
  }
  async openArchive() { if (!(await this.archiveIsOpen())) await this.tapWatchedToggle(); }
  /** One of «Усі», «Рекомендую», «Обовʼязково»: the row the archive lends the strip. */
  markWord(mark) {
    const text = { all: 'Усі', liked: 'Рекомендую', must: 'Обовʼязково' }[mark];
    return this.windowTab(text);
  }
  async tapMarkWord(mark) {
    await this.openArchive();
    await this.markWord(mark).click();
  }
  async markWordActive(mark) {
    return this.page.locator(`.mark-word[data-mark="${mark}"]`).evaluate(el => el.classList.contains('active'));
  }

  /* ---- per-card marks ---- */
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
  // By title, not index: a marked film leaves the default view at once.
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
  async indexOfCardTitled(title) {
    return this.page.evaluate(
      t => [...document.querySelectorAll('.card')].findIndex(c => c.querySelector('h3').textContent.trim() === t),
      title,
    );
  }
  /** The counts live on the account screen now; read the way the app counts them. */
  async markCount(which) {
    const n = await this.page.evaluate(w =>
      countExistingMarks({ watched, liked, must }[w], catalogSource()), which);
    return n ? n : null;
  }
  async watchedTabCount() { return this.markCount('watched'); }
  async likedTabCount() { return this.markCount('liked'); }
  /** How many films the archive should list on this shelf, for a mark. */
  async archiveExpected(which) {
    return this.page.evaluate(w => {
      const onShelf = catalogSource().filter(m => matchesShelfType(m, state.type) && isMarked(watched, m));
      // «Рекомендую» leaves out what is also «Обовʼязково» (filterCatalog).
      return w === 'watched' ? onShelf.length
        : onShelf.filter(m => isMarked(liked, m) && !isMarked(must, m)).length;
    }, which);
  }

  /* ---- account ---- */
  get accountOverlay() { return this.page.locator('#accountOverlay'); }
  get accountEntryPoint() { return this.stripTab('account'); }
  async openAccountPanel() {
    await this.pressStripTab('account');
    await this.page.locator('#accountOverlay.open').waitFor();
  }
  async accountPanelIsOpen() {
    return this.accountOverlay.evaluate(el => el.classList.contains('open'));
  }
  async accountUsername() {
    return (await this.page.locator('#accountBox .acc-name').innerText()).trim();
  }
  /* The account's pages (2026-09-24; the swipe made five on 2026-09-25). Their tabs are the row the
   * window lends the strip; the window's own copy is hidden while it does. */
  async accountPageNames() {
    return (await this.page.locator('.tabbar-window-row .tabbar-tab--window').allTextContents())
      .map(t => t.trim());
  }
  async openAccountPage(name) {
    await this.windowTab(name).click();
  }
  /** Whether the statistics tab is locked, and whether the account has PRO. */
  async statisticsLock() {
    const cell = this.windowTab('Статистика');
    return {
      locked: await cell.evaluate(el => el.classList.contains('is-locked')),
      pro: await this.page.evaluate(() => isPro()),
    };
  }
  get accountStats() { return this.page.locator('#accStats'); }
  /* The swipe's deck, carried into the account's «Свайп» page (2026-09-25). */
  get accountSwipeDeck() { return this.page.locator('#accountBox #swipeDeck'); }
  get watchingPage() { return this.page.locator('#watchingSheet'); }
  /** A word in the header's row, pressed by what it says. */
  async pressHeaderWord(word) {
    await this.page.locator('#topbarTabs .topbar-tab', { hasText: word }).click();
  }
  async headerWords() {
    return (await this.page.locator('#topbarTabs .topbar-tab').allTextContents()).map(t => t.trim());
  }
  get accountServices() { return this.page.locator('#accServices input[data-service]'); }
  get accountAchievements() { return this.page.locator('#accountBox .ach'); }
  get accountAvatar() { return this.page.locator('#accAvatarBtn .acc-avatar'); }
  /** The lit tab closes its page. */
  async closeAccountPanel() {
    await this.pressStripTab('account');
    await this.page.locator('#accountOverlay:not(.open)').waitFor({ state: 'attached' });
  }

  /* ---- the collections page (a header word) ---- */
  get recsOverlay() { return this.page.locator('#recsOverlay'); }
  get recsEntryPoint() { return this.headerTab('recs'); }
  async openRecs() {
    await this.pressHeaderTab('recs');
    await this.page.locator('#recsOverlay.open').waitFor();
  }
  async recsIsOpen() { return this.recsOverlay.evaluate(el => el.classList.contains('open')); }
  async closeRecs() {
    await this.pressHeaderTab('recs');
    await this.page.locator('#recsOverlay:not(.open)').waitFor({ state: 'attached' });
  }
  async recsSourceTabs() {
    return (await this.page.locator('#recsBox [data-recs-src]').allTextContents()).map(t => t.trim());
  }
  async switchRecsSource(id) {
    const label = { top: 'Топ', friends: 'Від друзів', mine: 'Мої', seenit: 'SeenIt' }[id];
    await this.windowTab(label).click();
    await this.page.waitForFunction(src => {
      const el = document.querySelector(`[data-recs-src="${src}"]`);
      return !!el && el.classList.contains('active');
    }, id);
  }
  async recsBodyText() { return (await this.page.locator('#recsbody').textContent()).trim(); }
  async recsCollectionNames() {
    return (await this.page.locator('#recsbody .col-block-name').allTextContents()).map(t => t.trim());
  }
  async openRecsCollection(title) {
    await this.page.locator('#recsbody .col-block-open[data-key]', { hasText: title }).first().click();
  }

  /* ---- page scroll state ---- */
  async scrollTo(y) {
    await this.page.evaluate(v => window.scrollTo(0, v), y);
  }
  async scrollY() {
    return this.page.evaluate(() => window.scrollY);
  }
  async bodyIsScrollLocked() {
    return this.page.evaluate(() => document.body.classList.contains('scroll-locked'));
  }
  async hasHorizontalOverflow() {
    return this.page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
  }

  /* ---- addresses ---- */
  async currentAddress() {
    const u = new URL(this.page.url());
    return '/' + u.pathname.split('/').pop() + u.search;
  }
  async waitForAppReady(timeout = 20000) {
    await this.page.waitForFunction(() => window.__catalogueShowable === true, null, { timeout });
  }
  async diceSheetIsOpen() {
    return this.page.locator('#diceSheet').evaluate(el => el.classList.contains('open'));
  }
}

module.exports = { CatalogPage };
