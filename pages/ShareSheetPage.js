// Page object for the share sheet (seenit-frontend src/app/33b-share-sheet.js, owner's design of 2026-10-07):
// a ready picture of the film or the collection, the format (a post or a story), two switches, the networks and
// three keys. The suite only looks and switches: it never presses a network or a key that hands the picture over.
class ShareSheetPage {
  constructor(page) {
    this.page = page;
    this.sheet = page.locator('#shareSheet');
    this.title = page.locator('#shareTitle');
    this.closeKey = page.locator('#shareClose');
    this.picture = page.locator('#shareSheet [data-share-slot] canvas');
    this.sizeLine = page.locator('#shareSheet [data-share-size]');
    this.noteField = page.locator('#shareSheet [data-share-note]');
    this.networks = page.locator('#shareSheet [data-share-net]');
  }

  /** A format key by its word: the post's or the story's. */
  formatKey(word) { return this.page.locator('#shareSheet [data-share-format]', { hasText: word }); }
  /** A switch by its id: 'logo' (the 3D logo) or 'note' (a comment). */
  switchKey(id) { return this.page.locator(`#shareSheet [data-share-switch="${id}"]`); }

  async waitUntilOpen() { await this.page.locator('#shareSheet.open').waitFor(); }
  async isOpen() { return this.sheet.evaluate(el => el.classList.contains('open')); }
  /** The formats as the sheet offers them: their words, in order. */
  async formatWords() {
    return (await this.page.locator('#shareSheet [data-share-format]').allTextContents()).map(t => t.trim());
  }
  async pressFormat(word) { await this.formatKey(word).click(); }
  async pressSwitch(id) { await this.switchKey(id).click(); }
  async close() {
    await this.closeKey.click();
    await this.page.locator('#shareSheet:not(.open)').waitFor({ state: 'attached' });
  }
}

module.exports = { ShareSheetPage };
