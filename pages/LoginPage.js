// Page object for #loginOverlay (src/body.html). The overlay is toggled via
// a `.hidden` class (display:none), so Playwright's visible/hidden waits
// track it directly without reaching into class names.
class LoginPage {
  constructor(page) {
    this.page = page;
    this.overlay = page.locator('#loginOverlay');
    this.usernameInput = page.locator('#loginUser');
    this.passwordInput = page.locator('#loginPass');
    this.submitButton = page.locator('#loginBtn');
    this.errorText = page.locator('#loginError');
  }

  async isShown() {
    return this.overlay.isVisible();
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitUntilHidden(timeout = 15000) {
    await this.overlay.waitFor({ state: 'hidden', timeout });
  }
}

module.exports = { LoginPage };
