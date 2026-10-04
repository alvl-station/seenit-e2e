// Page object for the «Нова добірка» window (#colFormSheet), opened by «Нова добірка» in the corner of «Мої».
// Only ever opened and closed here: «Створити» inside the window (#colFormSave) is never pressed, so no
// collection is ever made by the suite.
class NewCollectionPage {
  constructor(page) {
    this.page = page;
    this.sheet = page.locator('#colFormSheet');
    this.nameField = page.locator('#colFormName');
    this.closeButton = page.locator('#colFormClose');
    this.createKey = page.locator('#recsBox [data-recs-new]');
  }

  async open() {
    await this.createKey.click();
    await this.page.locator('#colFormSheet.open').waitFor();
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
    await this.page.locator('#colFormSheet:not(.open)').waitFor({ state: 'attached' });
  }
}

module.exports = { NewCollectionPage };
