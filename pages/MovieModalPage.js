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

  /** Every row as plain data — one DOM read, no per-row waits. */
  async providers() {
    return this.page.$$eval('#modalOverlay .modal-providers .prov', els => els.map(el => ({
      name: (el.querySelector('.prov-name') || {}).textContent?.trim() || '',
      kind: (el.querySelector('.prov-kind') || {}).textContent?.trim() || '',
      href: el.getAttribute('href'),
      newTab: el.getAttribute('target') === '_blank',
      rel: el.getAttribute('rel') || '',
      hasLogo: !!el.querySelector('.prov-logo'),
    })));
  }

  /* ---- the award row + its inline per-ceremony breakdown ----
   * The pill row is gone (interface-book redesign): the modal shows the
   * same two sums the catalog card does, and a tap unfolds the schedule
   * inline — ceremony names in English, categories in Ukrainian. */
  awardsRow() { return this.page.locator('#modalOverlay .film-awards-row'); }
  breakdown() { return this.page.locator('#modalOverlay .film-awards-breakdown'); }
  ceremonyNames() { return this.page.locator('#modalOverlay .cer-name'); }
  ceremonyCategories() { return this.page.locator('#modalOverlay .cer-cats li'); }
  async openBreakdown() {
    await this.awardsRow().click();
    await this.breakdown().waitFor({ state: 'visible' });
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
}

module.exports = { MovieModalPage };
