// The AI picks page (seenit-frontend, 2026-10-16): the orb (a canvas) over a chat with two modes, picks and
// by description, each keeping its own log. The header's row carries its word, "AI" alone on a phone.
class AiPicksPage {
  constructor(page) {
    this.page = page;
    this.sheet = page.locator('#aiSheet');
    this.orb = page.locator('#aiStage canvas[data-orb]');
    // The dots of an AI still typing stand in the log as a message of their own; they are not one.
    this.messages = page.locator('#aiLog .ai-msg:not(:has(.ai-typing))');
    this.typing = page.locator('#aiLog .ai-typing');
    this.mine = page.locator('#aiLog .ai-msg--me');
    this.chips = page.locator('#aiLog .ai-chip');
    this.soon = page.locator('#aiLog .ai-soon');
    this.input = page.locator('#aiInput');
    this.send = page.locator('#aiSend');
    this.headerWord = page.locator('#topbarTabs .topbar-tab[data-tab="ai"]');
  }
  modeKey(mode) { return this.page.locator(`[data-ai-mode="${mode}"]`); }
  async mode() { return this.sheet.getAttribute('data-mode'); }
  async isOpen() { return this.sheet.evaluate(el => el.classList.contains('open')); }
  async write(text) {
    await this.input.fill(text);
    await this.send.click();
  }
  async switchTo(mode) {
    await this.modeKey(mode).click();
    await this.page.waitForFunction(m => document.getElementById('aiSheet').dataset.mode === m, mode);
  }
  /** The header word's visible text, as the eye reads it on this screen. */
  async headerWordText() { return (await this.headerWord.innerText()).trim(); }
  /** Whether any word of the header's row is wider than its cell or runs into the next one. */
  async headerRowOverflows() {
    return this.page.locator('#topbarTabs').evaluate((row) => {
      const words = [...row.querySelectorAll('.topbar-tab-word')].map(w => w.getBoundingClientRect());
      const box = row.getBoundingClientRect();
      return words.some((r, i) => r.left < box.left - 0.5 || r.right > box.right + 0.5 || (i && r.left < words[i - 1].right - 0.5));
    });
  }
}

module.exports = { AiPicksPage };
