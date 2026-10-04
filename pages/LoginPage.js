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
    // The door of the owner's auth design (2026-10-04): two keys, an address, four conditions.
    this.googleButton = page.locator('#googleBtn');
    this.registerTab = page.locator('#authTabRegister');
    this.emailInput = page.locator('#loginEmail');
    this.addressTick = page.locator('#authMailOk.on');
    this.metRules = page.locator('#authRules .auth-rule.ok');
  }

  async toRegister() {
    await this.registerTab.click();
    await this.page.locator('#loginOverlay[data-mode="register"]').waitFor();
  }

  async isShown() {
    // The form, not the overlay: the landing reuses the overlay's id.
    return this.page.locator('#loginForm').isVisible();
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
