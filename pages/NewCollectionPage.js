// Page object for the «Нова добірка» window (#newColSheet), opened by
// «Створити» on the collections page. Only ever opened and closed here:
// «Створити» inside the window (#createColBtn) is never pressed, so no
// collection is ever made by the suite.
class NewCollectionPage {
  constructor(page) {
    this.page = page;
    this.sheet = page.locator('#newColSheet');
    this.nameField = page.locator('#newColName');
    this.closeButton = page.locator('#newColCloseBtn');
    // «Створити» is mirrored into the strip while the collections page is
    // open; the strip's copy is the one a finger can reach.
    this.createTab = page.locator('.tabbar-window-row .tabbar-tab--window', { hasText: 'Створити' });
  }

  async open() {
    await this.createTab.click();
    await this.page.locator('#newColSheet.open').waitFor();
  }

  async isOpen() {
    return this.sheet.evaluate(el => el.classList.contains('open'));
  }

  /**
   * True when the name field is the element a tap at its own centre lands
   * on — i.e. nothing (the collections page, say) is drawn over it.
   */
  async nameFieldIsOnTop() {
    return this.nameField.evaluate(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit === el;
    });
  }

  async close() {
    await this.closeButton.click();
    await this.page.locator('#newColSheet:not(.open)').waitFor({ state: 'attached' });
  }
}

module.exports = { NewCollectionPage };
