// Steps over the site — the pages read before sign-in (seenit-frontend
// src/site/, ROUTES.md). Thin wrappers; the selectors live in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { SitePage } = require('../pages/SitePage');
const { MovieModalPage } = require('../pages/MovieModalPage');
const { CatalogPage } = require('../pages/CatalogPage');
const { When, Then } = createBdd(test);

const BASE = () => process.env.BASE_URL || 'https://seenit-app.pages.dev/';
const PAGES = ['main', 'about', 'legal', 'terms', 'privacy', 'community', 'sources', 'contacts'];
const DOCUMENTS = ['terms', 'privacy', 'community', 'sources'];
const DRAFTS = ['terms', 'privacy', 'community'];
const TMDB_NOTICE = /This product uses the TMDB API but is not endorsed or certified by TMDB\./;

// A stranger: a context with no saved session at all.
async function asStranger(browser, fn) {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  try { await fn(new SitePage(page), page); } finally { await ctx.close(); }
}

Then("a fresh visitor at the root sees the front page with this week's news", async ({ browser }) => {
  await asStranger(browser, async (site, page) => {
    await page.goto(BASE(), { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/main$/, { timeout: 15000 });
    await expect(site.header).toBeVisible();
    await expect(site.tabbar).toHaveCount(0);
    // The news comes from the Worker's /public/home after the page paints.
    await expect(site.newsSections.first()).toBeVisible({ timeout: 15000 });
    expect(await site.newsCards.count()).toBeGreaterThan(0);
  });
});

Then('the front page offers a stranger a way in and an account', async ({ browser }) => {
  await asStranger(browser, async (site) => {
    await site.goto('main', BASE());
    await expect(site.signInIcon).toHaveAttribute('href', 'login');
    await expect(site.signInButton).toHaveAttribute('href', 'login');
    await expect(site.registerButton).toHaveAttribute('href', 'registrations');
  });
});

Then("every page of the site shows the tab strip and TMDB's notice", async ({ browser }) => {
  await asStranger(browser, async (site) => {
    for (const name of PAGES) {
      await site.goto(name, BASE());
      await expect(site.tabs, name).toHaveCount(4);
      await expect(site.activeTab, name).toHaveCount(1);
      await expect(site.footerNote, name).toHaveText(TMDB_NOTICE);
    }
  });
});

Then("each document opens at its own address with the section's menu", async ({ browser }) => {
  await asStranger(browser, async (site, page) => {
    for (const name of DOCUMENTS) {
      await site.goto(name, BASE());
      await expect(page, name).toHaveURL(new RegExp(`/${name}$`));
      await expect(site.title, name).toBeVisible();
      await expect(site.sectionMenu, name).toHaveCount(4);
      await expect(site.sectionMenu.and(page.locator('.active')), name).toHaveCount(1);
      await expect(site.draftStamp, name).toHaveCount(DRAFTS.includes(name) ? 1 : 0);
    }
  });
});

When("I press the word in the app's header", async ({ catalog, page }) => {
  await catalog.waitForCatalogLoaded();
  await page.locator('header .home-link').click();
  await expect(page).toHaveURL(/\/main$/);
});

Then('the front page offers the way back into the app', async ({ page }) => {
  const site = new SitePage(page);
  await expect(site.signInIcon).toHaveAttribute('href', 'films');
  await expect(site.signInIcon).toHaveAttribute('aria-label', 'До застосунку');
  await expect(site.registerButton).toHaveCount(0);
});

Then('I am still signed in', async ({ page }) => {
  await new SitePage(page).signInIcon.click();
  await expect(page).toHaveURL(/\/films$/);
  const catalog = new CatalogPage(page);
  await catalog.waitForCatalogLoaded();
  expect(await catalog.cardCount()).toBeGreaterThan(0);
});

When('I open the first film on the front page', async ({ catalog, page, ctx }) => {
  await catalog.waitForCatalogLoaded();
  const site = new SitePage(page);
  await site.goto('main', BASE());
  const first = site.openableCards.first();
  await expect(first).toBeVisible({ timeout: 15000 });
  ctx.frontPageTitle = await first.getAttribute('aria-label');
  await first.click();
});

Then("that film's card is open in the app", async ({ page, ctx }) => {
  await expect(page).toHaveURL(/\/(films|series)$/, { timeout: 15000 });
  const modal = new MovieModalPage(page);
  await modal.waitUntilOpen(30000);
  await expect(modal.title).toHaveText(ctx.frontPageTitle);
});
