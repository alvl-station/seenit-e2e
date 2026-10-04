// Page object for the SITE: the pages read before sign-in — /main (this
// week's news), /about, the documents (/legal, /terms, /privacy,
// /community, /sources) and /contacts. Built by seenit-frontend from
// src/site/ and dressed in the app's own pieces: the header on the bar
// ground, the tab strip, the shelf's cards, the chips.
class SitePage {
  constructor(page) {
    this.page = page;
    this.header = page.locator('header[data-surface="bar"]');
    this.tabs = page.locator('.topbar-tabs a.topbar-tab');
    this.activeTab = page.locator('.topbar-tabs a.topbar-tab.active');
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
    this.sectionMenu = page.locator('.site-subnav .opt');
    this.draftStamp = page.locator('.site-draft');
    this.footerNote = page.locator('.site-foot-note');
    this.footerContacts = page.locator('.site-foot-links a[href="contacts"]');
    // Stories: the page, and the front page's strip of the newest.
    this.stories = page.locator('article.story');
    this.storySources = page.locator('article.story .story-sources li');
    this.storyPhotoCredits = page.locator('article.story .story-photo figcaption');
    this.trailerButtons = page.locator('.story-video');
    this.trailerFrames = page.locator('iframe.story-frame');
    this.storyTeasers = page.locator('a.story-teaser');
    // The front page since the owner's design of 2026-10-05: its own glass header, the week as one 3D strip, the newest story.
    this.homeHeader = page.locator('#homeHdr');
    this.homeSignIn = page.locator('#homeHdr [data-site-go]');
    this.ctaRegister = page.locator('.home-cta [data-site-join]');
    this.weekCards = page.locator('#homeRow .home-wc');
    this.openableWeekCards = page.locator('#homeRow a.home-wc');
    this.weekPanelTitle = page.locator('#homePanelTitle');
    this.homeStoryLink = page.locator('#homeStory a.home-read');
  }

  /** Brings a week card to the middle of the strip (focusing it scrolls it there) and returns the title the panel shows. */
  async centreWeekCard(card) {
    const index = await card.getAttribute('data-index');
    await card.focus();
    await this.page.waitForFunction(i => {
      const row = document.getElementById('homeRow');
      const c = row && row.children[Number(i)];
      return !!c && Number(c.style.zIndex) === 100;
    }, index, { timeout: 15000 });
    return (await this.weekPanelTitle.textContent()).trim();
  }

  async goto(name, base) {
    await this.page.goto(new URL(name, base).toString(), { waitUntil: 'domcontentloaded' });
  }
}

module.exports = { SitePage };
