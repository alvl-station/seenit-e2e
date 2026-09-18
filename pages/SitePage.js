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
  }

  async goto(name, base) {
    await this.page.goto(new URL(name, base).toString(), { waitUntil: 'domcontentloaded' });
  }
}

module.exports = { SitePage };
