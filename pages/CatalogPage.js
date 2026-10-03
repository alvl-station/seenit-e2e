// Page object for the main screen: the two bars (header words on top, the
// tab strip at the bottom), the shelf of cards, and the pages the bars open.
// The header's own icons are hidden (src/style.css: the doors went to the
// strip), so every page is opened by its tab.
const { expect } = require('@playwright/test');

class CatalogPage {
  constructor(page) {
    this.page = page;
    this.main = page.locator('#main');
    // The SHELF's cards. Rails, the franchise row and search results wear
    // the same `.card` since 2026-09-30 (seenit-frontend #543), so a bare
    // `.card` would count a collection rail as the shelf.
    this.cards = page.locator('#main .card');
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
    // The boot mark lifts once the first screen's posters are drawn
    // (finishBoot in 02-auth.js), and until it does it stands over the
    // shelf: a tap on a card lands on the splash, and the header has not
    // taken its height yet.
    await this.page.waitForFunction(() => {
      const splash = document.getElementById('bootSplash');
      return !splash || splash.hidden || splash.classList.contains('out');
    }, null, { timeout });
  }
  /**
   * Resolves once the account's own answer (/library/me) has landed. It
   * re-draws a film card that is open at that moment (loadMe in
   * 06-overlays.js), and the meter in it starts over at 5.5, dropping a
   * number dialled and not yet saved — seen on the live app as a 5.0 that
   * went in as 5.5. Start it BEFORE the page loads, await it after.
   */
  accountAnswered(timeout = 20000) {
    return this.page.waitForResponse(res => res.request().method() === 'GET'
      && new URL(res.url()).pathname.endsWith('/library/me'), { timeout })
      .then(res => res.finished())
      // The answer is applied a task after its body lands.
      .then(() => this.page.evaluate(() => new Promise(done => setTimeout(done, 50))))
      .catch(() => { /* no answer: nothing will re-draw the card either */ });
  }
  /** The page loaded again, and waited for until it has stopped arriving. */
  async reload() {
    const account = this.accountAnswered();
    await this.page.reload();
    await this.waitForCatalogLoaded();
    await this.waitForMarksLoaded();
    await account;
  }
  /** The app opened afresh at the shelf, waited for the same way. */
  async open(path = '') {
    const account = this.accountAnswered();
    await this.goto(path);
    await this.waitForCatalogLoaded();
    await this.waitForMarksLoaded();
    await account;
  }
  /**
   * Marks arrive on their own listener, later than the catalog. Without this
   * wait a first "remember the count" read races them — it remembers null
   * against a chip that fills in a moment later.
   */
  async waitForMarksLoaded(timeout = 10000) {
    await this.page.waitForFunction(() => (window.__marksLoadedCount || 0) >= 2, null, { timeout })
      .catch(() => { /* older bundle without the beacon: proceed as before */ });
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
  /** The option's border colour once its transition has settled. */
  async optionBorderColor(opt) {
    let last = null;
    // Two reads that agree, polled: the colour is mid-transition until they do.
    await expect(async () => {
      const now = await opt.evaluate(el => getComputedStyle(el).borderColor);
      const settled = now === last;
      last = now;
      expect(settled).toBe(true);
    }).toPass({ intervals: [120], timeout: 3000 }).catch(() => { /* best-effort: the last read stands */ });
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
    return this.cards.locator('.card-meta-row .year').evaluateAll(els =>
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
        await this.pressAt(box);
        return true;
      }
    }
    return false;
  }
  /** A touch device: what the phone projects emulate (hover: none). */
  async isTouch() {
    return this.page.evaluate(() => matchMedia('(hover: none)').matches);
  }
  /**
   * A tap (a click without touch) at the middle of a box, where it stands.
   * Not locator.click(): its actionability scroll obeys the root's
   * scroll-behavior: smooth and was seen gliding the page 231px before the
   * card opened — the very position a lock scenario then measures.
   */
  async pressAt(box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    if (await this.isTouch()) await this.page.touchscreen.tap(x, y);
    else await this.page.mouse.click(x, y);
  }
  cardPoster(index = 0) { return this.cards.nth(index).locator('.poster'); }
  cardTitle(index = 0) { return this.cards.nth(index).locator('h3'); }
  cardYearText(index = 0) { return this.cards.nth(index).locator('.card-meta-row .year').first(); }
  cardRatingBadge(index = 0) { return this.cards.nth(index).locator('.rating-badge'); }
  cardAwardsRow(index = 0) { return this.cards.nth(index).locator('.card-awards'); }
  /* The two labels inside the row since 2026-09-25: the cup (wins) and,
     to its right, the silver ring (nominations). Either may be absent. */
  cardAwardLabels(index = 0) { return this.cardAwardsRow(index).locator('.card-award-won, .card-award-nom'); }
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
        const cards = [...document.querySelectorAll('#main .card')];
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
      const cards = [...document.querySelectorAll('#main .card')];
      if (sel) return cards.findIndex(c => c.querySelector(sel));
      return cards.findIndex(c => want.has(c.getAttribute('data-id')));
    }, [drawnSelector, found.ids]);
    const already = await drawnMatch();
    if (already !== -1) return already;
    await this.chooseGenreGroup(found.group);
    // Pull the sentinel into view and re-check, polled until a matching
    // card is drawn or the shelf has no more batches to draw.
    let idx = -1;
    await expect(async () => {
      idx = await drawnMatch();
      if (idx !== -1) return;
      const sentinel = this.page.locator('#renderSentinel');
      if (!(await sentinel.count())) return; // nothing left to draw
      await sentinel.scrollIntoViewIfNeeded();
      throw new Error('no matching card drawn yet');
    }).toPass({ intervals: [150], timeout: 12_000 }).catch(() => { /* ran out of time: -1 */ });
    return idx;
  }
  /** A series whose episodes are mirrored: its record carries season_starts. */
  async firstCardIndexWithSeasons() {
    return this.revealCardWhere(m => (m.kind === 'tv' || String(m.film_key || '').startsWith('tv:'))
      && m.season_starts && Object.keys(m.season_starts).length > 0, null);
  }

  /* ---- the build stamp ---- */
  /** `<meta name="seenit-build">`, stamped by the deploy; null on a page without one. */
  async buildStamp() {
    return this.page.evaluate(() => {
      const meta = document.querySelector('meta[name="seenit-build"]');
      return meta ? meta.getAttribute('content') : null;
    });
  }

  /* ---- the bin bar (nothing here ever confirms) ---- */
  get deleteBar() { return this.page.locator('#deleteBar'); }
  get deleteBarCount() { return this.page.locator('#deleteCount'); }
  get deleteConfirmButton() { return this.page.locator('#deleteConfirmBtn'); }
  get deleteCancelButton() { return this.page.locator('#deleteCancelBtn'); }
  async deleteBarIsVisible() { return this.deleteBar.isVisible(); }
  async selectedCount() { return this.page.locator('#main .card.is-selected').count(); }
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
  /** The archive with nothing narrowed: «Усі» lit. */
  async openWholeArchive() {
    await this.openArchive();
    if (await this.markWordActive('all')) return;
    await this.tapMarkWord('all');
    await expect.poll(() => this.markWordActive('all')).toBe(true);
  }
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

  /* ---- one film on the shelf, by its key ----
   * A film is followed by its key (data-key, «movie:603»), not its place: a
   * scored film leaves the default shelf at once, and the archive orders by
   * its own rules. The marks themselves are given in the film card's meter
   * (MovieModalPage.meter) — the shelf's cards carry no toggles since
   * 2026-09-20. */
  async cardTitleText(index = 0) {
    return (await this.cardTitle(index).textContent()).trim();
  }
  async cardKey(index = 0) {
    return this.cards.nth(index).getAttribute('data-key');
  }
  cardWithKey(key) { return this.page.locator(`#main .card[data-key="${key}"]`); }
  /**
   * Lets the shelf draw batches until the film's card is drawn; its index,
   * or -1 when the shelf runs out (or time does) without it.
   */
  async revealCardWithKey(key, timeout = 12_000) {
    const index = () => this.page.evaluate(
      k => [...document.querySelectorAll('#main .card')].findIndex(c => c.getAttribute('data-key') === k), key);
    let idx = -1;
    await expect(async () => {
      idx = await index();
      if (idx !== -1) return;
      const sentinel = this.page.locator('#renderSentinel');
      if (!(await sentinel.count())) return; // nothing left to draw
      await sentinel.scrollIntoViewIfNeeded();
      throw new Error('the card is not drawn yet');
    }).toPass({ intervals: [150], timeout }).catch(() => { /* ran out of time: -1 */ });
    return idx;
  }
  /** Opens the film's card from the shelf; false when the shelf does not list it. */
  async openCardWithKey(key) {
    if (await this.revealCardWithKey(key) === -1) return false;
    await this.cardWithKey(key).click();
    return true;
  }
  async cardWithKeyIsWatched(key) {
    return this.cardWithKey(key).evaluate(el => el.classList.contains('is-watched'));
  }
  /** Whether the account still holds anything on the film: a mark or a score. */
  async filmIsMarked(key) {
    return this.page.evaluate(k => watched.has(k) || liked.has(k) || must.has(k)
      || (typeof scores === 'object' && scores !== null && scores[k] != null), key);
  }
  /**
   * Sends the marks the app is holding. «Не дивився» queues its marks in a
   * batch that leaves after five idle minutes or when the page is hidden
   * (flushMarks in 10-marks-and-events.js); a scenario that ends sooner
   * would leave them on the device and the mark on the server. This is the
   * flush leaving the page performs, done now: flushMarks answers true once
   * nothing is held any more, and is asked again until it does.
   */
  async saveMarks() {
    await expect.poll(() => this.page.evaluate(() => flushMarks()),
      { message: 'the marks batch did not leave the device', intervals: [500, 1000, 2000] }).toBe(true);
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
  /* The account's pages are icon tabs on the page itself since 2026-10-03
   * (owner's design): a drawing each, the word in aria-label, nothing lent
   * to the strip. «Мої дані» opens from the head's edit button. */
  get accountTabs() { return this.page.locator('#accTabs .acc-tab'); }
  accountTab(name) { return this.page.locator(`#accTabs .acc-tab[aria-label="${name}"]`); }
  async accountPageNames() {
    return this.accountTabs.evaluateAll(els => els.map(el => el.getAttribute('aria-label')));
  }
  async openAccountPage(name) {
    const tab = this.accountTab(name);
    // A locked tab is aria-disabled, which Playwright will not press unforced; the press is what the lock refuses.
    const locked = await tab.evaluate(el => el.getAttribute('aria-disabled') === 'true');
    await tab.click({ force: locked });
  }
  get profileHead() { return this.page.locator('#accHead'); }
  get profileNumbers() { return this.page.locator('#accHead .acc-num'); }
  /** The four figures on the head, as text. */
  async profileFigures() { return this.page.locator('#accHead .acc-num b').allTextContents(); }
  /* The two rows a page can lend the bar: the account lends neither. */
  get stripWindowRow() { return this.page.locator('#tabbarWindowRow'); }
  get stripSubRow() { return this.page.locator('#tabbarSubRow'); }
  async openProfileEditor() {
    await this.page.locator('#accEditBtn').click();
    await this.page.locator('#accDisplayForm').waitFor();
  }
  /** Whether the statistics tab is locked, and whether the account has PRO. */
  async statisticsLock() {
    const cell = this.accountTab('Статистика');
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
  /* The tabs pane under the header: out, or tucked in behind it. A row that
   * the handle opened stays out while the shelf scrolls. */
  get headerHandle() { return this.page.locator('#tabsToggle'); }
  get headerWordsOut() { return this.page.locator('header:not(.tabs-tucked) #topbarTabs'); }
  get headerWordsTucked() { return this.page.locator('header.tabs-tucked #topbarTabs'); }
  async pressHeaderHandle() { await this.headerHandle.click(); }

  async pressHeaderWord(word) {
    await this.page.locator('#topbarTabs .topbar-tab', { hasText: word }).click();
  }
  async headerWords() {
    return (await this.page.locator('#topbarTabs .topbar-tab').allTextContents()).map(t => t.trim());
  }
  get accountServices() { return this.page.locator('#accServices input[data-service]'); }
  get accountAchievements() { return this.page.locator('#accountBox .ach'); }
  get accountAvatar() { return this.page.locator('#accAvatarBtn .acc-avatar'); }
  /* «Друзі» is a page of the account since 2026-10-02: its box stands in the
   * account's pane; its two lists are a switch on the page (2026-10-03). */
  get accountFriends() { return this.page.locator('#accountBox #friendsBox'); }
  async friendsLists() {
    return (await this.page.locator('#friendsBox [data-friends-tab]').allTextContents()).map(t => t.trim().replace(/\s*\(\d+\)$/, ''));
  }
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
    const label = { top: 'Топ', friends: 'Від друзів', mine: 'Мої', seenit: 'SeenIt', trash: 'Кошик' }[id];
    await this.windowTab(label).click();
    await this.page.waitForFunction(src => {
      const el = document.querySelector(`[data-recs-src="${src}"]`);
      return !!el && el.classList.contains('active');
    }, id);
  }
  async recsBodyText() { return (await this.page.locator('#recsbody').textContent()).trim(); }
  /* The trash is a pane of the collections page since 2026-10-02. */
  get trashList() { return this.page.locator('#recsbody #trashList'); }
  async recsCollectionNames() {
    return (await this.page.locator('#recsbody .col-block-name').allTextContents()).map(t => t.trim());
  }
  async openRecsCollection(title) {
    await this.page.locator('#recsbody .col-block-open[data-key]', { hasText: title }).first().click();
  }

  /* ---- page scroll state ---- */
  /** Instantly: the root's scroll-behavior: smooth would otherwise still be travelling when read. */
  async scrollTo(y) {
    await this.page.evaluate(v => window.scrollTo({ top: v, left: 0, behavior: 'instant' }), y);
  }
  async scrollY() {
    return this.page.evaluate(() => window.scrollY);
  }
  /** The app's own word for «something holds the page»: on the body and the root. */
  async bodyIsScrollLocked() {
    return this.page.evaluate(() => document.body.classList.contains('scroll-locked'));
  }
  /**
   * How the lock holds the page (PR #526, 2026-09-27): the ROOT is held with
   * overflow hidden and the body stays in the flow — never pinned with
   * position: fixed, which laid the home-screen app out short, and never
   * overflow-hidden itself, which made the body a scroller of its own and
   * took the sticky header off the top.
   */
  async scrollHold() {
    return this.page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      return {
        rootHeld: document.documentElement.classList.contains('scroll-locked')
          && root.overflowY === 'hidden',
        bodyPosition: body.position,
        bodyOverflowY: body.overflowY,
      };
    });
  }
  /**
   * Tries to scroll the page the way a person does: a finger dragged up the
   * tab strip (the wheel over it where there is no touch). Real input on
   * purpose — the lock is overflow hidden, which stops a person and never a
   * script's scrollTo.
   *
   * The strip, because it is the part of the page that stays on screen under
   * an open card, and a drag on it reaches the document: measured on the
   * live app, the same drag moved an unheld page by 300px and a held one by
   * none. A drag on the card itself proves nothing — the card scrolls its
   * own content and contains the rest (overscroll-behavior: contain), held
   * root or not.
   */
  async dragPageUp(distance = 300) {
    /* The bar steps away under an open card and slides back after it
     * (seenit-frontend, 2026-10-03). Under a card the finger goes where the
     * bar was, the bottom of the screen; otherwise on the settled bar. */
    let x;
    let y;
    if (await this.page.evaluate(() => document.body.classList.contains('film-open'))) {
      const vp = this.page.viewportSize();
      x = Math.round(vp.width / 2);
      y = vp.height - 40;
    } else {
      await this.page.waitForFunction(() => getComputedStyle(document.getElementById('tabbar')).transform === 'none');
      const strip = await this.page.locator('#tabbar').boundingBox();
      x = Math.round(strip.x + strip.width / 2);
      y = Math.round(strip.y + strip.height / 2);
    }
    if (await this.isTouch()) {
      const cdp = await this.page.context().newCDPSession(this.page);
      await cdp.send('Input.synthesizeScrollGesture', {
        x, y, yDistance: -distance, gestureSourceType: 'touch', speed: 1200,
      });
      await cdp.detach();
    } else {
      await this.page.mouse.move(x, y);
      await this.page.mouse.wheel(0, distance);
    }
    // Let any momentum land before the position is read.
    await this.page.waitForTimeout(300);
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
