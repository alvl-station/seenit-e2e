// Page object for the movie details modal (#modalOverlay — see
// openModal()/closeModal() in src/app.js). The overlay is display:none by
// default and only display:flex once `.open` is added, so visible/hidden
// waits track that directly.
const { MoviemeterPanel } = require('./MoviemeterPanel');

class MovieModalPage {
  constructor(page) {
    this.page = page;
    this.overlay = page.locator('#modalOverlay');
    // The film card of 2026-10-07 (design/seenit-film-card-spec.md): the title heads the left column's block.
    this.title = page.locator('#modalBox .fc-ttl h2');
    this.closeButton = page.locator('.modal-close');
    // The score under the tabs: how a film is marked since 2026-09-20.
    this.meter = new MoviemeterPanel(page, '#modalOverlay');
  }

  async waitUntilOpen(timeout = 10000) {
    await this.overlay.waitFor({ state: 'visible', timeout });
  }

  async close() {
    await this.closeButton.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }

  /* ---- the poster/trailer slot ----
   * A modal shows exactly one of these: the autoplaying muted embed when the
   * film has a trailer_url on file, the static poster when it does not. */
  trailerFrame() { return this.page.locator('#modalOverlay .modal-trailer iframe'); }
  poster() { return this.page.locator('#modalOverlay .modal-poster'); }

  /* ---- "Де подивитись" ----
   * Absent entirely for a film with no providers on file, which is the normal
   * state until the backfill has run over the catalogue. */
  providersSection() { return this.page.locator('#modalOverlay .modal-providers'); }
  providerRows() { return this.page.locator('#modalOverlay .modal-providers .prov'); }

  /** Every row as plain data. A row is a chip: the name is its text, the offer its data-kind. */
  async providers() {
    return this.page.$$eval('#modalOverlay .modal-providers .prov', els => els.map(el => ({
      name: (el.textContent || '').trim(),
      kind: el.getAttribute('data-kind') || '',
      href: el.getAttribute('href'),
      newTab: el.getAttribute('target') === '_blank',
      rel: el.getAttribute('rel') || '',
      label: el.getAttribute('aria-label') || '',
    })));
  }

  /* ---- the awards: a tab of rows since 2026-10-07 ----
   * The awards tile among the score tiles opens the awards tab; each row names the ceremony in English,
   * the category under it and the result in Ukrainian, wins first; past four rows the rest fold behind a key that counts them. */
  awardsTile() { return this.page.locator('#modalBox .fc-tile--awards'); }
  awardRows() { return this.page.locator('#modalBox [data-film-pane="awards"] .fc-award'); }
  /** The rows in sight: the folded ones stand in the markup but are not shown. */
  visibleAwardRows() { return this.awardRows().filter({ visible: true }); }
  awardsMoreKey() { return this.page.locator('#modalBox [data-aw-more]'); }
  /** Every row as written (not as CSS capitalises it): the ceremony, the category, the result. */
  async awardRowTexts() {
    return this.awardRows().evaluateAll(rows => rows.map(r => ({
      name: ((r.querySelector('b') || {}).textContent || '').trim(),
      category: ((r.querySelector('small') || {}).textContent || '').trim(),
      result: ((r.querySelector('em') || {}).textContent || '').trim(),
      win: r.classList.contains('is-win'),
    })));
  }
  async pressAwardsTile() { await this.awardsTile().click(); }
  async pressAwardsMore() { await this.awardsMoreKey().click(); }
  /** Which tab is open: the key whose aria-selected is true. */
  async openTabId() {
    return this.page.locator('#modalBox [data-film-tab][aria-selected="true"]').getAttribute('data-film-tab');
  }
  /** The sound control on the title plate — present only with a trailer. */
  soundButton() { return this.page.locator('#modalOverlay .film-sound'); }
  criticBadge() { return this.page.locator('#modalOverlay .critic-badge'); }
  popover() { return this.page.locator('#infoPopover'); }
  async popoverIsShown() {
    return this.page.evaluate(() => {
      const el = document.getElementById('infoPopover');
      return !!el && el.classList.contains('show');
    });
  }
  /** Click a neutral spot (the title) — an open popover must dismiss. */
  async clickOutsidePopover() {
    await this.title.click();
  }

  /* ---- the facts under the title ----
   * One grey line since 2026-10-07: year · kind · genre · country, the dots drawn apart from the words. */
  factsLine() { return this.page.locator('#modalBox .fc-facts'); }
  /** The facts line's words, without the dots between them. */
  async factsWords() {
    return this.factsLine().evaluate(el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean));
  }
  /** The details tab's cell that names the country, as text ('' when the card draws none). */
  async detailsCountryText() {
    return this.page.locator('#modalBox [data-film-pane="details"] .film-detail')
      .evaluateAll(cells => {
        const cell = cells.find(c => /^Країна/.test(((c.querySelector('.lbl') || {}).textContent || '').trim()));
        return cell ? ((cell.querySelector('.fc-det-txt') || {}).textContent || '').trim() : '';
      });
  }
  /** The country on the record the open card was drawn from ('' when none). */
  async openFilmCountry() {
    return this.page.evaluate(() => String((_modalMovie && _modalMovie.country) || ''));
  }
  /** The record's own year, type, genre and country, as the facts line should say them. */
  async openFilmFacts() {
    return this.page.evaluate(() => [_modalMovie.year, _modalMovie.type, _modalMovie.genre, _modalMovie.country]
      .filter(Boolean).map(v => String(v).trim()));
  }

  /* ---- the card's tabs (2026-09-19; icon keys since 2026-10-07) ----
   * Synopsis, people, awards, seasons (series only), related, details, where
   * to watch — one open at a time. A card without the row (an older release) has every
   * block in sight already, so opening a tab it lacks does nothing. */
  tabButton(id) { return this.page.locator(`#modalOverlay [data-film-tab="${id}"]`); }
  /** A tab is an icon key since 2026-10-07: its full name, count included, is its aria-label. */
  async tabLabel(id) { return this.tabButton(id).getAttribute('aria-label'); }
  async openTab(id) {
    if (!(await this.tabButton(id).count())) return false;
    await this.tabButton(id).click();
    await this.page.locator(`#modalOverlay [data-film-pane="${id}"]`).waitFor({ state: 'visible' });
    return true;
  }

  /* ---- a series' seasons ----
   * On a tab of their own (its name counts them in square brackets), filled by a request after the card
   * opens and left hidden when the series has no season data on file. Every
   * season is a row that names itself and comes SHUT (owner's ask,
   * 2026-09-21): its caret opens the episodes. Read-only here: the caret
   * only unfolds; the season's eye and the episodes are never pressed. */
  seasonsBlock() { return this.page.locator('#modalOverlay #filmSeasons'); }
  seasonBlocks() { return this.seasonsBlock().locator('.season-now'); }
  /** The numbered seasons, the specials (season 0) not among them. */
  numberedSeasonBlocks() { return this.seasonsBlock().locator('.season-now:not([data-season="0"])'); }
  seasonOpener(i) { return this.seasonBlocks().nth(i).locator('[data-season-open]'); }
  seasonName(i) { return this.seasonBlocks().nth(i).locator('.season-name'); }
  seasonEpisodes(i) { return this.seasonBlocks().nth(i).locator('.season-eps'); }
  seasonEpisodeRows(i) { return this.seasonEpisodes(i).locator('.season-ep'); }
  /** How many seasons stand open, their episodes in sight. */
  async openSeasonCount() {
    return this.seasonsBlock().locator('.season-eps:not([hidden])').count();
  }
  /** Index of the first season that has episodes to show, or -1. */
  async firstSeasonWithEpisodes() {
    return this.seasonBlocks().evaluateAll(els => els.findIndex(el => el.querySelector('.season-eps')));
  }
  async pressSeasonOpener(i) { await this.seasonOpener(i).click(); }
  /** True once the block is shown; false when it stays hidden past `timeout`. */
  async waitForSeasons(timeout = 8000) {
    await this.openTab('seasons');
    return this.seasonsBlock().waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  }
}

module.exports = { MovieModalPage };
