// The search page (seenit-frontend, 2026-09-24): a page of its own, opened
// by the strip's «Пошук», films and series together.
class SearchPage {
  constructor(page) {
    this.page = page;
    this.sheet = page.locator('#searchSheet');
    this.input = page.locator('#searchPageInput');
    this.body = page.locator('#searchPageBody');
    this.cards = page.locator('#searchPageBody [data-search-grid] .card');
    this.emptyMessage = page.locator('#searchPageBody .empty-msg');
    this.count = page.locator('#searchPageBody .search-page-count');
  }
  tab() { return this.page.locator('#tabbarScroll .tabbar-tab[data-tab="search"]'); }
  async isOpen() { return this.sheet.evaluate(el => el.classList.contains('open')); }
  async open() {
    if (await this.isOpen()) return;
    await this.tab().click();
    await this.page.locator('#searchSheet.open').waitFor();
  }
  /** A lit tab closes its page. */
  async close() {
    if (!(await this.isOpen())) return;
    await this.tab().click();
    await this.page.locator('#searchSheet:not(.open)').waitFor({ state: 'attached' });
  }
  /** Types the query and waits for the page to answer it. */
  async search(query) {
    await this.open();
    await this.input.fill(query);
    await this.input.press('Enter');
    await this.page.waitForFunction(() => {
      const b = document.getElementById('searchPageBody');
      return b && !!b.firstElementChild;
    });
  }
  async resultKeys() {
    return this.cards.evaluateAll(els => els.map(e => e.dataset.key));
  }
  async resultKinds() {
    const keys = await this.resultKeys();
    return [...new Set(keys.map(k => String(k).split(':')[0]))].sort();
  }
  async emptyText() {
    return (await this.emptyMessage.count()) ? (await this.emptyMessage.textContent()).trim() : null;
  }
  async bodyText() { return (await this.body.textContent()).trim(); }
}

module.exports = { SearchPage };
