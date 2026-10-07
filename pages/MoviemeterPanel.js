// Component object for the moviemeter (seenit-frontend src/app/08-moviemeter.js):
// a film from 1.0 to 10.0, set on a tape under a needle and saved with
// «Оцінити». It is how a person marks a film since 2026-09-20 — the eye and
// the heart left the shelf's cards — and the marks follow from the number
// (src/logic/moviemeter.js, the owner's ladder):
//
//   1.0-5.9  watched
//   6.0-7.9  watched + liked («Рекомендую»)
//   8.0-10   watched + liked + must («Обовʼязково»)
//
// The remove-score key takes the number AND the marks off. The meter stands in the
// film card and, alone, in the rate window, so it is a component the page
// objects hold, scoped by the root it lives in.
//
// The tape is driven by its keyboard (Home, Shift+→ a whole point, → a
// tenth): the same handler a thumb's scroll lands in, and the only way to
// reach an exact tenth without measuring pixels.
const { expect } = require('@playwright/test');

class MoviemeterPanel {
  constructor(page, root) {
    this.page = page;
    this.box = page.locator(`${root} [data-mm]`);
    this.track = this.box.locator('[data-mm-track]');
    this.value = this.box.locator('[data-mm-value]');
    this.saveButton = this.box.locator('[data-mm-save]');
    this.unseeButton = this.box.locator('[data-mm-unsee]');
    this.likedBadge = this.box.locator('[data-mm-like]');
    this.mustBadge = this.box.locator('[data-mm-must]');
  }

  /** The number under the needle, as the card prints it ('—' when none). */
  async valueText() {
    return ((await this.value.textContent()) || '').trim();
  }

  /** Brings the tape to `score` (one decimal), without saving it. */
  async dial(score) {
    const tenths = Math.round(Number(score) * 10);
    if (!(tenths >= 10 && tenths <= 100)) throw new Error(`no such score on the meter: ${score}`);
    await this.track.press('Home');
    for (let i = 10; i + 10 <= tenths; i += 10) await this.track.press('Shift+ArrowRight');
    for (let i = 0; i < tenths % 10; i++) await this.track.press('ArrowRight');
    await expect(this.value).toHaveText((tenths / 10).toFixed(1));
  }

  /** Dials `score` and presses «Оцінити»; resolves once the server took it. */
  async give(score) {
    await this.dial(score);
    const saved = this.page.waitForResponse(res => res.request().method() === 'PUT'
      && res.url().includes('/library/scores/'));
    await this.saveButton.click();
    const res = await saved;
    if (!res.ok()) throw new Error(`the score was not saved: HTTP ${res.status()}`);
    // What the server kept, not what the tape shows: a card re-drawn under
    // the finger saves the number its fresh tape rests on instead.
    const body = await res.json().catch(() => null);
    expect(body && Number(body.score), 'the server kept another score than the one dialled').toBe(Number(score));
  }

  /** The remove-score key: the number and the marks go; resolves once the number is off. */
  async clear() {
    const cleared = this.page.waitForResponse(res => res.request().method() === 'DELETE'
      && res.url().includes('/library/scores/'));
    await this.unseeButton.click();
    const res = await cleared;
    if (!res.ok()) throw new Error(`the score was not taken off: HTTP ${res.status()}`);
  }

  /** Which badge beside the number is lit: 'liked', 'must' or null. */
  async litBadge() {
    if (await this.mustBadge.isVisible()) return 'must';
    if (await this.likedBadge.isVisible()) return 'liked';
    return null;
  }
}

module.exports = { MoviemeterPanel };
