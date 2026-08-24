// Page object for the movie details modal (#modalOverlay — see
// openModal()/closeModal() in src/app.js). The overlay is display:none by
// default and only display:flex once `.open` is added, so visible/hidden
// waits track that directly.
class MovieModalPage {
  constructor(page) {
    this.page = page;
    this.overlay = page.locator('#modalOverlay');
    this.title = page.locator('.modal-body h2');
    this.closeButton = page.locator('.modal-close');
  }

  async waitUntilOpen(timeout = 10000) {
    await this.overlay.waitFor({ state: 'visible', timeout });
  }

  async close() {
    await this.closeButton.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }

  /* ---- the poster/trailer slot ----
   * A modal shows exactly one of these: the autoplaying muted embed when the
   * film has a trailer_url on file, the static poster when it does not. */
  trailerFrame() { return this.page.locator('#modalOverlay .modal-trailer iframe'); }
  poster() { return this.page.locator('#modalOverlay .modal-poster'); }

  /* ---- "Де подивитись" ----
   * Absent entirely for a film with no providers on file, which is the normal
   * state until the backfill has run over the catalogue. */
  providersSection() { return this.page.locator('#modalOverlay .modal-providers'); }
  providerRows() { return this.page.locator('#modalOverlay .modal-providers .prov'); }

  /** Every row as plain data — one DOM read, no per-row waits. */
  async providers() {
    return this.page.$$eval('#modalOverlay .modal-providers .prov', els => els.map(el => ({
      name: (el.querySelector('.prov-name') || {}).textContent?.trim() || '',
      kind: (el.querySelector('.prov-kind') || {}).textContent?.trim() || '',
      href: el.getAttribute('href'),
      newTab: el.getAttribute('target') === '_blank',
      rel: el.getAttribute('rel') || '',
      hasLogo: !!el.querySelector('.prov-logo'),
    })));
  }

  /* ---- award pills + the anchored info popover ---- */
  awardPills() { return this.page.locator('#modalOverlay .award-pill'); }
  /** Only the tappable ones (a group with nothing to reveal gets no affordance). */
  tappableAwardPills() { return this.page.locator('#modalOverlay .award-pill.award-badge'); }
  criticBadge() { return this.page.locator('#modalOverlay .critic-badge'); }
  popover() { return this.page.locator('#infoPopover'); }
  async popoverIsShown() {
    return this.page.evaluate(() => {
      const el = document.getElementById('infoPopover');
      return !!el && el.classList.contains('show');
    });
  }
  /**
   * For each award pill: how far its icon's vertical centre sits from the
   * pill's own centre, in px. 0 means perfectly centred; a positive or
   * negative number means the icon rides low or high. An inline <svg>
   * defaults to sitting on the text baseline, which is what made icons
   * look raised above their label (BUGS #13).
   */
  async awardPillIconOffsets() {
    return this.page.$$eval('#modalOverlay .award-pill', els => els.map(el => {
      const svg = el.querySelector('svg');
      if (!svg) return null;
      const p = el.getBoundingClientRect();
      const s = svg.getBoundingClientRect();
      return { label: el.textContent.trim(), offset: (s.top + s.height / 2) - (p.top + p.height / 2) };
    }).filter(Boolean));
  }

  /** Click a neutral spot (the title) — an open popover must dismiss. */
  async clickOutsidePopover() {
    await this.title.click();
  }
}

module.exports = { MovieModalPage };
