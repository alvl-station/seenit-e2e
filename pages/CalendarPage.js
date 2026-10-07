// Page object for the site's CALENDAR (/calendar, owner's design of 2026-10-07; seenit-frontend src/site/calendar*.js):
// the rail of a week's days with its arrows, the type filter (in cinemas, at home, new episodes), the agenda of
// the shelf's cards day by day, and the film panel every card opens in. The address keeps the week (w=), the
// types (k=) and the open film (f=); the old /week page forwards here and its ?s= is still read.
// The data comes from the Worker's /public/calendar and /public/film, or from /public/home while those are not
// there: every probe here works on either.
const { SitePage } = require('./SitePage');

class CalendarPage extends SitePage {
  constructor(page) {
    super(page);
    this.days = page.locator('#calDays .cal-day');
    this.range = page.locator('#calRange');
    this.cards = page.locator('#calAgenda .cal-card');
    this.openCard = page.locator('#calAgenda .cal-card.sel');
    this.panelTitle = page.locator('#calPanelTitle');
    // The panel's red key to the film in the app, drawn only for a film the catalogue holds.
    this.panelAppLink = page.locator('#calPanelIn a.cal-go');
    this.loading = page.locator('#calAgenda .sp-quiet');
  }

  /** A type key: 'cin' (in cinemas), 'home' (at home) or 'ep' (new episodes). */
  typeKey(type) { return this.page.locator(`#calTypes .cal-type[data-type="${type}"]`); }
  /** The week arrows: 1 the next week, -1 the one before. */
  weekArrow(dir) { return this.page.locator(`#calStick .cal-wk[data-wk="${dir}"]`); }
  /** The agenda's cards of one type. */
  cardOfType(type) { return this.page.locator(`#calAgenda .cal-card[data-type="${type}"]`); }

  /** Waits for the agenda to be drawn from whichever answer came: cards, or the line that says the week is empty. */
  async waitForAgenda(timeout = 15000) {
    await this.page.waitForFunction(() => {
      const box = document.getElementById('calAgenda');
      return !!box && (box.querySelector('.cal-card') || box.querySelector('.cal-none') || /Не вдалося/.test(box.textContent));
    }, null, { timeout });
  }
  /** The Monday the rail starts on. */
  async firstDay() { return this.days.first().getAttribute('data-day'); }
  /** The types each card on the agenda is. */
  async cardTypes() { return this.cards.evaluateAll(els => els.map(el => el.dataset.type)); }
  /** A card as data: its film key, its type and its title. */
  async cardData(card) {
    return card.evaluate(el => ({ key: el.dataset.key, type: el.dataset.type, title: (el.querySelector('h3') || {}).textContent.trim() }));
  }
  /** The address's own search part, decoded: «?w=…&k=…&f=…». */
  async query() { return decodeURIComponent(new URL(this.page.url()).search); }
  /**
   * Presses the agenda's first cards in turn (at most `tries`), each time waiting for the panel to name exactly that
   * film, until the panel offers the key to the app (a film the catalogue holds); that card's data, or null.
   */
  async openFirstFilmTheAppHolds(tries = 6) {
    const n = Math.min(await this.cards.count(), tries);
    for (let i = 0; i < n; i++) {
      const card = this.cards.nth(i);
      const film = await this.cardData(card);
      await card.click();
      // Exact: on a wide screen the panel keeps the previous film for a moment while it fades.
      await this.page.waitForFunction(t => (document.getElementById('calPanelTitle') || {}).textContent === t, film.title, { timeout: 15000 });
      if (await this.panelAppLink.count()) return film;
    }
    return null;
  }
  async pressType(type) { await this.typeKey(type).click(); }
  async pressWeekArrow(dir) { await this.weekArrow(dir).click(); }
}

module.exports = { CalendarPage };
