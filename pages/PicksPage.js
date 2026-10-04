// The picks page (seenit-frontend, 2026-10-03): a cauldron in three steps.
// Things are thrown into the pot, others are kept out, and a dish is served.
class PicksPage {
  constructor(page) {
    this.page = page;
    this.sheet = page.locator('#picksSheet');
    this.pot = page.locator('#picksPot');
    this.potTitle = page.locator('#picksPotTitle');
    this.chosen = page.locator('#picksChosen [data-pick-drop]');
    this.cooked = page.locator('#picksCooked .pick-chip');
    this.cards = page.locator('#picksBody [data-picks-grid] .card');
    this.dishNote = page.locator('#picksBody .picks-dish-note');
  }
  /** The «Фільми» or «Серіали» switch over the pot: `kind` is 'film' or 'series'. */
  kindSwitch(kind) { return this.page.locator(`#picksTop [data-pick-kind="${kind}"]`); }
  /** A chip in the list that is up (a phone shows one list at a time). */
  chip(label) {
    return this.page.locator('#picksKitchen .pick-list:visible [data-pick-key]').filter({ hasText: label }).first();
  }
  key(act) { return this.page.locator(`#picksActions [data-pick-act="${act}"]`); }
  async step() { return this.sheet.getAttribute('data-step'); }
  /** The first chip of the list that is up: whichever genre this account's taste puts first. */
  async firstChipLabel() {
    return (await this.page.locator('#picksKitchen .pick-list:visible [data-pick-key] .pick-lbl').first().innerText()).trim();
  }
  async tap(label) { await this.chip(label).click(); }
  async chipState(label) {
    return this.chip(label).evaluate(el => (el.classList.contains('btn-on') ? 'in' : el.classList.contains('is-out') ? 'out' : 'none'));
  }
  async press(act) { await this.key(act).click(); }
  /** Waits for the boil to end and the dish to stand. */
  async waitForDish() {
    await this.page.locator('#picksSheet[data-step="dish"]').waitFor({ timeout: 10000 });
  }
}

module.exports = { PicksPage };
