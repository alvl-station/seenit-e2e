// Page object for the movie details modal (#modalOverlay — see
// openModal()/closeModal() in src/app.js). The overlay is display:none by
// default and only display:flex once `.open` is added, so visible/hidden
// waits track that directly.
class MovieModalPage {
  constructor(page) {
    this.page = page;
    this.overlay = page.locator('#modalOverlay');
    // The title moved OUT of .modal-body: it sits on the title plate over
    // the poster/trailer now (.film-head > .film-title-plate), which is what
    // "card anatomy" changed. A locator left pointing into the body finds
    // nothing at all, so the modal reads as opening empty.
    this.title = page.locator('#modalOverlay .film-title-text h2');
    this.closeButton = page.locator('.modal-close');
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

  /* ---- the awards, as laurel badges under the runtime line ----
   * (seenit-frontend A-5, 2026-09-25): each ceremony between two branches,
   * WINNER or NOMINATION written on the badge, and a tap opens that
   * ceremony's categories in the anchored popover. */
  laurels() { return this.page.locator('#modalOverlay .film-awards .laurel'); }
  /** The row the laurels stand in: it scrolls sideways. */
  awardsRail() { return this.page.locator('#modalOverlay .film-awards-rail'); }
  /** The counts over the niche. */
  awardsCount() { return this.page.locator('#modalOverlay .film-awards-count'); }
  laurelCategory(i) { return this.laurels().nth(i).locator('.laurel-cat'); }
  laurelName(i) { return this.laurels().nth(i).locator('.laurel-name'); }
  laurelKind(i) { return this.laurels().nth(i).locator('.laurel-kind'); }
  /** The words as written, not as CSS capitalises them. */
  async laurelText(i) {
    return {
      name: ((await this.laurelName(i).textContent()) || '').trim(),
      kind: ((await this.laurelKind(i).textContent()) || '').trim(),
    };
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
   * «year · type · genre» on one line and the country on a line of its own
   * (2026-09-16): a co-production's countries broke the shared line. */
  facts() { return this.page.locator('#modalOverlay .film-facts'); }
  factsLine() { return this.page.locator('#modalOverlay .film-facts .film-facts-line:not(.film-country)'); }
  countryLine() { return this.page.locator('#modalOverlay .film-facts .film-country'); }
  /** The country on the record the open card was drawn from ('' when none). */
  async openFilmCountry() {
    return this.page.evaluate(() => String((_modalMovie && _modalMovie.country) || ''));
  }

  /* ---- the card's tabs (2026-09-19) ----
   * Synopsis, people, seasons (series only), details, where to watch — one
   * open at a time. A card without the row (an older release) has every
   * block in sight already, so opening a tab it lacks does nothing. */
  tabButton(id) { return this.page.locator(`#modalOverlay [data-film-tab="${id}"]`); }
  async openTab(id) {
    if (!(await this.tabButton(id).count())) return false;
    await this.tabButton(id).click();
    await this.page.locator(`#modalOverlay [data-film-pane="${id}"]`).waitFor({ state: 'visible' });
    return true;
  }

  /* ---- a series' seasons ----
   * Filled by a request after the card opens, and left hidden when the
   * series has no season data on file. Read-only here: nothing is marked. */
  seasonsBlock() { return this.page.locator('#modalOverlay #filmSeasons'); }
  seasonBlocks() { return this.seasonsBlock().locator('.season-now'); }
  seasonEpisodes() { return this.seasonsBlock().locator('.season-eps'); }
  /** True once the block is shown; false when it stays hidden past `timeout`. */
  async waitForSeasons(timeout = 8000) {
    await this.openTab('seasons');
    return this.seasonsBlock().waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  }
}

module.exports = { MovieModalPage };
