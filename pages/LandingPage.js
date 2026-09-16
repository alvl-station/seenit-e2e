// Page object for the landing (main.html): the mark, the wordmark, a link to
// /login and one to /registrations. No bars, no app.
class LandingPage {
  constructor(page) {
    this.page = page;
    this.signInLink = page.locator('.login-go');
    this.registerLink = page.locator('.login-reset');
    this.tabbar = page.locator('#tabbar');
  }
  async isShown() { return this.signInLink.isVisible(); }
}

module.exports = { LandingPage };
