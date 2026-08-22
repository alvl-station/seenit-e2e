// Page object for the add-movie modal (#addMovieOverlay — see
// openAddModal()/closeAddModal() in seenit-frontend src/app.js). E2E only
// ever OPENS and CLOSES it (that's pure UI, no writes) — actually saving a
// movie from a test is forbidden by the read-only rule (REQUIREMENTS T-4).
class AddModalPage {
  constructor(page) {
    this.page = page;
    this.openButton = page.locator('#addMovieBtn');
    this.overlay = page.locator('#addMovieOverlay');
    this.box = page.locator('#addMovieOverlay .modal, #addMovieOverlay > div').first();
    this.closeButton = page.locator('#addModalClose');
  }

  async open() {
    await this.openButton.click();
    await this.overlay.waitFor({ state: 'visible' });
  }

  /** Values rendered as reference-only text in the confirm card (REQ A-6). */
  readOnlyValues() { return this.page.locator('#addResults .cf-readonly'); }
  /** Anything still typeable/selectable in the confirm card. */
  editableFields() { return this.page.locator('#addResults input, #addResults textarea, #addResults select'); }
  searchInput() { return this.page.locator('#addTitle'); }
  searchButton() { return this.page.locator('#addSearchBtn'); }
  results() { return this.page.locator('#addResults'); }

  async close() {
    await this.closeButton.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }
}

module.exports = { AddModalPage };
