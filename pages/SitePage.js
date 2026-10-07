// Page object for the SITE: the pages read before sign-in — /main (the scenes about the app), /calendar
// (the releases day by day; /week forwards there since 2026-10-07), /stories, /about, the documents (/legal,
// /terms, /privacy, /community, /sources) and /contacts. Built by seenit-frontend from src/site/. The calendar
// and the stories have page objects of their own that extend this one (CalendarPage, StoriesPage): every
// page shares the calm frame — the header's five tabs, the phone's menu key, the footer.
class SitePage {
  constructor(page) {
    this.page = page;
    // The calm pages' header (design/site-pages): five tabs on a groove, the current one on the thumb.
    this.tabs = page.locator('#spHdr a.sp-tab');
    this.activeTab = page.locator('#spHdr a.sp-tab.on');
    // On a phone the tabs fold behind a menu key at the header's side (2026-10-07).
    this.menuKey = page.locator('#spMenu');
    // The way in: the hero's button.
    this.signInButton = page.locator('[data-site-go]');
    this.tabbar = page.locator('#tabbar');
    this.title = page.locator('.site-text h1');
    // A document's rail (design/site-pages, 2026-10-06): the five documents, the current one marked.
    this.sectionMenu = page.locator('#dcList a');
    this.draftStamp = page.locator('.site-draft');
    this.footerNote = page.locator('.site-foot-note');
    this.footerContacts = page.locator('.site-foot-links a[href="contacts"]');
    // The front page since the owner's design of 2026-10-05: its own glass header, the newest story.
    this.homeHeader = page.locator('#homeHdr');
    this.homeSignIn = page.locator('#homeHdr [data-site-go]');
    this.ctaRegister = page.locator('.home-cta [data-site-join]');
    this.homeStoryLink = page.locator('#homeStory a.home-read');
    this.homeTabs = page.locator('#homePlaces a.topbar-tab');
    // The two scenes a hand can drive (owner's design, 2026-10-06): the rating's tape and the projector.
    this.rateBand = page.locator('#homeRState');
    this.rateTape = page.locator('#homeTape');
    this.projectorLead = page.locator('#homePjLead');
    this.projectorChosen = page.locator('#homePjChosen span');
    this.tunnelPosters = page.locator('#homeTunnel .home-tp img');
  }

  /** A tab of the calm header by its word. */
  tab(word) { return this.tabs.filter({ hasText: new RegExp(`^${word}$`) }); }
  /** A word in the front page's own header row. */
  homeTab(word) { return this.homeTabs.filter({ hasText: new RegExp(`^${word}$`) }); }
  /** Whether the header's tabs stand in sight (on a phone only while the menu is open). */
  async tabsShown() { return this.page.locator('#spTabs').isVisible(); }
  async pressMenuKey() { await this.menuKey.click(); }

  /** Scrolls the front page to `p` (0..1) of a scene's track, at once. */
  async scrollToScene(track, p) {
    await this.page.evaluate(([t, at]) => {
      const el = document.querySelector(`[data-track="${t}"]`);
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, el.offsetTop + (el.offsetHeight - window.innerHeight) * at);
    }, [track, p]);
  }

  /** Drags the rating's tape up the scale in `times` strokes, each within the tape, so no move leaves the window. */
  async dragTapeUp(times) {
    const box = await this.rateTape.boundingBox();
    const y = box.y + box.height / 2, from = box.x + box.width * 0.9, to = box.x + box.width * 0.1;
    for (let n = 0; n < times; n++) {
      await this.page.mouse.move(from, y);
      await this.page.mouse.down();
      for (let i = 1; i <= 8; i++) await this.page.mouse.move(from + (to - from) * i / 8, y);
      await this.page.mouse.up();
    }
  }

  /** Whether the projector's gate, where the beam starts, lies inside its scene on this screen. */
  async gateInsideScene() {
    return this.page.evaluate(() => {
      const pin = document.getElementById('homePj').getBoundingClientRect();
      const gate = document.getElementById('homePjGate').getBoundingClientRect();
      return gate.top >= pin.top && gate.bottom <= pin.bottom && gate.left >= pin.left && gate.right <= pin.right;
    });
  }

  async goto(name, base) {
    await this.page.goto(new URL(name, base).toString(), { waitUntil: 'domcontentloaded' });
  }
}

module.exports = { SitePage };
