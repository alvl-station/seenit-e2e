// Playwright fixtures shared by every spec — import `test`/`expect` from
// HERE, never from '@playwright/test' directly:
//
//   const { test, expect } = require('../support/fixtures');
//   test('...', async ({ catalog, page }) => { ... });
//
// The `catalog` fixture hands each test an already-logged-in CatalogPage
// with the catalog loaded, so specs contain zero credential plumbing and
// zero login boilerplate.
//
// What may be changed, and what may not: kino/movies is one catalog shared
// by every account, so adding, editing and deleting films stay forbidden
// (seenit-frontend REQUIREMENTS T-4). Marks are per-account now, so
// toggling "переглянуто"/"рекомендую" is allowed — CI writes into its own
// uid's subtree and the database rules refuse anything else.
// The base `test` comes from playwright-bdd (its bdd-enabled extension of
// Playwright's), so createBdd() in steps/ accepts our extended version.
const { test: bddBase } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { CatalogPage } = require('../pages/CatalogPage');

const test = bddBase.extend({
  catalog: async ({ page }, use) => {
    const catalog = new CatalogPage(page);
    // Already authenticated: the 'setup' project signed in once and saved
    // the session (support/auth.setup.js), so this just opens the catalog.
    await catalog.goto();
    // Failure screenshots and videos are PUBLISHED (the Allure report is a
    // public Pages site). Masking the login inputs costs nothing and covers
    // the case where the saved session expired and the overlay reappears —
    // -webkit-text-security renders them as dots without touching the DOM
    // value, so login still behaves normally (REQUIREMENTS S-4).
    await page.addStyleTag({
      content: '#loginUser, #loginPass { -webkit-text-security: disc; }',
    }).catch(() => { /* best-effort */ });
    // #loginOverlay is visible on load by DESIGN and only hides once
    // Firebase's onAuthStateChanged fires with the restored user — an
    // instant check races that and always sees the overlay. Wait for it to
    // go, and only then call it an auth problem.
    const login = new LoginPage(page);
    try {
      await login.waitUntilHidden(20000);
    } catch (err) {
      throw new Error('Not authenticated — the setup project should have signed in. Session expired, TEST_USER is wrong, or Firebase is throttling the account.');
    }
    await catalog.waitForCatalogLoaded();
    // Marks arrive on their own listener, later than the catalog. Without
    // this wait a scenario's first "remember the count" read races them —
    // it remembers null against a chip that fills in a moment later.
    await page.waitForFunction(() => (window.__marksLoadedCount || 0) >= 2, null, { timeout: 10000 })
      .catch(() => { /* older bundle without the beacon: proceed as before */ });
    // The onboarding guide auto-opens once per account. For the test
    // account that "once" is whichever scenario happens to run first after
    // a deploy — and the overlay would sit on top of the grid and fail it.
    // Closing it here also writes the account's seen-flag, so it never
    // reappears in later runs.
    await catalog.dismissGuideIfShown();
    await use(catalog);
  },

  // Scratch object shared by the steps of ONE scenario (playwright-bdd
  // steps are separate functions, so anything one step finds for the next —
  // a modal instance, a remembered offset — travels through here).
  //
  // The teardown is the important half. A scenario that marks a film and
  // then FAILS never reaches its own cleanup step, so the mark stays on the
  // test account for good. That is not just untidy: a marked film drops out
  // of the default view, so residue slowly changes what "the first card"
  // means and turns into flakiness nobody can trace back. Two such marks
  // had already accumulated from one failing run.
  //
  // So anything a step marked is recorded here and undone whatever happens.
  ctx: async ({ page }, use) => {
    const ctx = { marked: [] };
    await use(ctx);
    for (const { title, which } of ctx.marked) {
      try {
        const catalog = new CatalogPage(page);
        // The film may be hidden by the watched filter — isolate first, and
        // only unmark if it is genuinely still marked.
        if (await catalog.indexOfCardTitled(title) === -1) await catalog.tapWatchedToggle();
        if (await catalog.indexOfCardTitled(title) === -1) continue;
        if (which === 'переглянуто' && !(await catalog.cardTitledIsWatched(title))) continue;
        if (which === 'переглянуто') await catalog.toggleWatchedOnCardTitled(title);
        else await catalog.toggleLikedOnCardTitled(title);
      } catch (err) {
        // Best-effort: a teardown failure must not mask the real one.
      }
    }
  },
});

module.exports = { test, expect };
