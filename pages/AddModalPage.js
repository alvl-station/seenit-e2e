// Adding a film: the search page looking OUTSIDE the app (seenit-frontend,
// 2026-09-29). «Додати» was a window of its own opened by a strip tab; it
// moved into the search page as the «Поза застосунком» place to look, which
// comes down into the strip as a window row like every page's tabs.
// Only ever opened and closed here: saving a film is forbidden (REQ T-4).
class AddModalPage {
  constructor(page) {
    this.page = page;
    this.tab = page.locator('#tabbarScroll .tabbar-tab[data-tab="search"]');
    this.outside = page.locator('#tabbarWindowRow .tabbar-tab--window', { hasText: 'Поза застосунком' });
    // The surface a person sees: the search page itself.
    this.overlay = page.locator('#searchSheet');
    this.box = page.locator('#searchSheet');
  }

  async open() {
    await this.tab.click();
    await this.page.locator('#searchSheet.open').waitFor();
    await this.outside.click();
    await this.page.locator('#searchModes [data-search-mode="web"].active').waitFor({ state: 'attached' });
  }

  readOnlyValues() { return this.page.locator('#addResults .cf-readonly'); }
  editableFields() { return this.page.locator('#addResults input, #addResults textarea, #addResults select'); }
  searchInput() { return this.page.locator('#searchPageInput'); }
  results() { return this.page.locator('#addResults'); }

  /** Types a title and asks at once (Enter), as a person would. */
  async search(query) {
    await this.searchInput().fill(query);
    await this.searchInput().press('Enter');
  }

  /** The lit tab closes its page. */
  async close() {
    await this.tab.click();
    await this.page.locator('#searchSheet:not(.open)').waitFor({ state: 'attached' });
  }
}

module.exports = { AddModalPage };
