// Page object for the add screen (#addMovieOverlay), a page of the strip.
// Only ever opened and closed here: saving a film is forbidden (REQ T-4).
class AddModalPage {
  constructor(page) {
    this.page = page;
    this.tab = page.locator('#tabbarScroll .tabbar-tab[data-tab="add"]');
    this.overlay = page.locator('#addMovieOverlay');
    this.box = page.locator('#addMovieBox');
  }

  async open() {
    await this.tab.click();
    await this.overlay.waitFor({ state: 'visible' });
  }

  readOnlyValues() { return this.page.locator('#addResults .cf-readonly'); }
  editableFields() { return this.page.locator('#addResults input, #addResults textarea, #addResults select'); }
  searchInput() { return this.page.locator('#addTitle'); }
  searchButton() { return this.page.locator('#addSearchBtn'); }
  results() { return this.page.locator('#addResults'); }

  /** The lit tab closes its page. */
  async close() {
    await this.tab.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }
}

module.exports = { AddModalPage };
