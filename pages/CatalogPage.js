// Page object for the main catalog view (#search, #main .grid .card — see
// src/app.js's render()/cardHtml()).
class CatalogPage {
  constructor(page) {
    this.page = page;
    this.searchInput = page.locator('#search');
    this.main = page.locator('#main');
    this.cards = page.locator('.card');
    this.emptyMessage = page.locator('.empty-msg');
  }

  // '' (not '/') on purpose: baseURL is a project Pages URL with a path
  // segment (https://host/kino-tracker/) — a leading '/' resolves per
  // WHATWG URL rules against the ORIGIN, dropping that segment entirely
  // and 404ing (confirmed against Deploy App run #1: it landed on
  // https://alvl-station.github.io/, GitHub's "no Pages site here" 404).
  async goto(path = '') {
    await this.page.goto(path);
  }

  // The catalog only ever has content once Firebase's initial 'value' read
  // resolves (see moviesRef.on('value', ...) in src/app.js) — no fixed
  // sleep, just wait for the first real card to show up.
  async waitForCatalogLoaded(timeout = 20000) {
    await this.cards.first().waitFor({ state: 'visible', timeout });
  }

  async cardCount() {
    return this.cards.count();
  }

  async search(query) {
    await this.searchInput.fill(query);
  }

  async openCard(index = 0) {
    await this.cards.nth(index).click();
  }
}

module.exports = { CatalogPage };
