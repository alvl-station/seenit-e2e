// Page object for the SITE: the pages read before sign-in — /main (the
// scenes about the app), /week (this week's news), /about, the documents (/legal, /terms, /privacy,
// /community, /sources) and /contacts. Built by seenit-frontend from
// src/site/ and dressed in the app's own pieces: the header on the bar
// ground, the tab strip, the shelf's cards, the chips.
class SitePage {
  constructor(page) {
    this.page = page;
    this.header = page.locator('header[data-surface="bar"]');
    // The calm pages' header (design/site-pages, 2026-10-06): five tabs on a groove, the current one on the thumb.
    this.tabs = page.locator('#spHdr a.sp-tab');
    this.activeTab = page.locator('#spHdr a.sp-tab.on');
    // The way in: the icon at the side of the header, and the hero's button.
    this.signInIcon = page.locator('#siteGo');
    this.signInButton = page.locator('[data-site-go]');
    this.registerButton = page.locator('[data-site-join]');
    this.tabbar = page.locator('#tabbar');
    this.news = page.locator('#siteNews');
    this.newsSections = page.locator('#siteNews .genre-section');
    this.newsCards = page.locator('#siteNews .card');
    this.openableCards = page.locator('#siteNews a.card');
    this.title = page.locator('.site-text h1');
    // A document's rail (design/site-pages, 2026-10-06): the five documents, the current one marked.
    this.sectionMenu = page.locator('#dcList a');
    this.draftStamp = page.locator('.site-draft');
    this.footerNote = page.locator('.site-foot-note');
    this.footerContacts = page.locator('.site-foot-links a[href="contacts"]');
    // Stories: the page, and the front page's strip of the newest.
    // Stories (design/site-pages, 2026-10-06): an index, and each story a reader at stories#<slug>.
    this.stories = page.locator('article.st-read');
    this.storySources = page.locator('article.st-read .st-src li');
    this.storyPhotoCredits = page.locator('article.st-read .st-fig figcaption');
    this.storyCards = page.locator('.st-index a.st-card, .st-index a.st-feat');
    this.trailerButtons = page.locator('article.st-read:target .st-video');
    this.trailerFrames = page.locator('iframe.st-frame');
    this.storyTeasers = page.locator('a.story-teaser');
    // The front page since the owner's design of 2026-10-05: its own glass header, the week as one 3D strip, the newest story.
    this.homeHeader = page.locator('#homeHdr');
    this.homeSignIn = page.locator('#homeHdr [data-site-go]');
    this.ctaRegister = page.locator('.home-cta [data-site-join]');
    // The week's page: sections of the shelf's cards, the day keys and the section filter.
    this.weekCards = page.locator('#siteNews .wk-card');
    this.openableWeekCards = page.locator('#siteNews a.wk-card');
    this.weekDays = page.locator('#wkDays .wk-day');
    this.weekFilter = page.locator('#wkFilter .sp-seg-key');
    this.homeStoryLink = page.locator('#homeStory a.home-read');
    this.homeTabs = page.locator('#homePlaces a.topbar-tab');
    // The two scenes a hand can drive (owner's design, 2026-10-06): the rating's tape and the projector.
    this.rateBand = page.locator('#homeRState');
    this.rateTape = page.locator('#homeTape');
    this.projectorLead = page.locator('#homePjLead');
    this.projectorChosen = page.locator('#homePjChosen span');
    this.tunnelPosters = page.locator('#homeTunnel .home-tp img');
  }

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

  /** The address of the first story that has a trailer. */
  async storyWithTrailer() {
    return this.page.locator('article.st-read:has(.st-video)').first().getAttribute('id');
  }

  /** The title a week card shows. */
  async weekCardTitle(card) {
    return (await card.locator('h3').textContent()).trim();
  }

  async goto(name, base) {
    await this.page.goto(new URL(name, base).toString(), { waitUntil: 'domcontentloaded' });
  }
}

module.exports = { SitePage };
