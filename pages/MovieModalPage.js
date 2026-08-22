// Page object for the movie details modal (#modalOverlay — see
// openModal()/closeModal() in src/app.js). The overlay is display:none by
// default and only display:flex once `.open` is added, so visible/hidden
// waits track that directly.
class MovieModalPage {
  constructor(page) {
    this.page = page;
    this.overlay = page.locator('#modalOverlay');
    this.title = page.locator('.modal-body h2');
    this.closeButton = page.locator('.modal-close');
  }

  async waitUntilOpen(timeout = 10000) {
    await this.overlay.waitFor({ state: 'visible', timeout });
  }

  async close() {
    await this.closeButton.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }
}

module.exports = { MovieModalPage };
