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
// scoring a film (which is what marks it since 2026-09-20) is allowed — CI
// writes into its own account and the Worker refuses anything else.
// The base `test` comes from playwright-bdd (its bdd-enabled extension of
// Playwright's), so createBdd() in steps/ accepts our extended version.
const { test: bddBase } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { CatalogPage } = require('../pages/CatalogPage');
const { MovieModalPage } = require('../pages/MovieModalPage');

const test = bddBase.extend({
  catalog: async ({ page }, use) => {
    const catalog = new CatalogPage(page);
    // Failure screenshots and videos are PUBLISHED (the Allure report is a
    // public Pages site). Masking the login inputs costs nothing and covers
    // the case where the saved session expired and the overlay reappears —
    // -webkit-text-security renders them as dots without touching the DOM
    // value, so login still behaves normally (REQUIREMENTS S-4). #accWho is
    // the account panel's name line — the same username, printed on a
    // screen several scenarios open. An init script rather than a style
    // tag, so the mask survives the reloads and navigations a scenario
    // makes ("I reload the catalog", the front page and back).
    await page.addInitScript(() => {
      const mask = () => {
        const style = document.createElement('style');
        style.textContent = '#loginUser, #loginPass, #accWho { -webkit-text-security: disc; }';
        (document.head || document.documentElement).appendChild(style);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mask);
      else mask();
    });
    // Already authenticated: the 'setup' project signed in once and saved
    // the session (support/auth.setup.js), so this just opens the catalog.
    const account = catalog.accountAnswered();
    await catalog.goto();
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
    await catalog.waitForMarksLoaded();
    await account;
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
  // So every film a step scored is recorded here ({ key, title }) and
  // cleared whatever happens, the way a person clears it: the page loaded
  // afresh (whatever overlay the failure left open), the film found in the
  // archive, its card opened and «Не дивився» pressed — the number and the
  // marks both go — and the marks batch sent before the page is let go.
  ctx: async ({ page }, use) => {
    const ctx = { marked: [], collections: [] };
    await use(ctx);
    // Every collection a step made is deleted again, through the app's own request, whatever happened.
    for (const id of ctx.collections) {
      const gone = await page.evaluate(async (cid) => {
        const res = await api.request(`/library/collections/${encodeURIComponent(cid)}`, { method: 'DELETE', headers: { accept: 'application/json' } });
        return res.ok;
      }, id).catch(() => false);
      if (!gone) test.info().annotations.push({ type: 'teardown-failed', description: `could not delete the collection ${id}` });
    }
    for (const { key, title } of ctx.marked) {
      try {
        const catalog = new CatalogPage(page);
        const modal = new MovieModalPage(page);
        await catalog.open();
        // A batch the failure left on the device is replayed on load; send
        // it before deciding the film is clear.
        await catalog.saveMarks();
        if (!(await catalog.filmIsMarked(key))) continue;
        await catalog.openArchive('watched');
        if (!(await catalog.openCardWithKey(key))) throw new Error('the archive does not list it');
        await modal.waitUntilOpen();
        await modal.meter.clear();
        await catalog.saveMarks();
      } catch (err) {
        // Best-effort: a teardown failure must not mask the real one — but
        // it must not vanish either, or a mark left behind is traced to
        // nothing. The annotation shows on the test in the report.
        test.info().annotations.push({
          type: 'teardown-failed',
          description: `could not clear "${title}" (${key}): ${String(err && err.message || err).split('\n')[0]}`,
        });
      }
    }
  },
});

module.exports = { test, expect };
