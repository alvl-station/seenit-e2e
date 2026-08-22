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

  async close() {
    await this.closeButton.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }
}

module.exports = { AddModalPage };
