// The picks page (seenit-frontend, 2026-10-06): an editing bench and a projector in three steps.
// Frames are edited onto a strip, others are cut, and the projector shows the films on a screen.
class PicksPage {
  constructor(page) {
    this.page = page;
    this.sheet = page.locator('#picksSheet');
    this.projector = page.locator('#picksProj');
    this.stripTitle = page.locator('#picksStripTitle');
    this.onStrip = page.locator('#picksStrip [data-pick-drop]');
    this.cutOnStrip = page.locator('#picksStrip .pick-slot-frame.is-cut');
    this.madeFrom = page.locator('#picksFrom .pick-from');
    this.cards = page.locator('#picksBody [data-picks-grid] .card');
    this.dishNote = page.locator('#picksFrom .picks-dish-note');
  }
  /** The «Фільми» or «Серіали» switch in the header: `kind` is 'film' or 'series'. */
  kindSwitch(kind) { return this.page.locator(`#picksTop [data-pick-kind="${kind}"]`); }
  /** A frame in the list that is up (one list at a time). */
  frame(label) {
    return this.page.locator('#picksKitchen .pick-list:visible [data-pick-key]').filter({ hasText: label }).first();
  }
  /** A key of the transport deck, wherever it stands (the library's foot, or under the screen). */
  key(act) { return this.page.locator(`#picksSheet [data-pick-act="${act}"]`); }
  async step() { return this.sheet.getAttribute('data-step'); }
  /** The label of the n-th frame of the list that is up: whichever genre this account's taste puts there. */
  async frameLabel(n = 0) {
    return (await this.page.locator('#picksKitchen .pick-list:visible [data-pick-key] .pick-lbl').nth(n).innerText()).trim();
  }
  async tap(label) { await this.frame(label).click(); }
  async frameState(label) {
    return this.frame(label).evaluate(el => (el.classList.contains('is-in') ? 'in' : el.classList.contains('is-cut') ? 'cut' : 'none'));
  }
  async press(act) { await this.key(act).click(); }
  /** Waits for the strip to wind onto the reel and the show to be on. */
  async waitForShow() {
    await this.page.locator('#picksSheet.is-served[data-step="dish"]').waitFor({ timeout: 10000 });
  }
}

module.exports = { PicksPage };
