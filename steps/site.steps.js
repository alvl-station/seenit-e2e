// Steps over the site — the pages read before sign-in (seenit-frontend
// src/site/, ROUTES.md). Thin wrappers; the selectors live in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { SitePage } = require('../pages/SitePage');
const { MovieModalPage } = require('../pages/MovieModalPage');
const { CatalogPage } = require('../pages/CatalogPage');
const { baseUrl: BASE } = require('../support/base-url');
const { When, Then } = createBdd(test);

const PAGES = ['main', 'week', 'stories', 'about', 'legal', 'terms', 'privacy', 'community', 'sources', 'contacts'];
// Contacts live in the footer, not on the strip, and the front page is the logo's — no tab is lit there.
const UNTABBED = ['contacts', 'main'];
// The dark pages wear the front page's own glass header (owner's designs, 2026-10-05 and 2026-10-06).
const DARK = ['main', 'week'];
const DOCUMENTS = ['terms', 'privacy', 'community', 'sources'];
const DRAFTS = ['terms', 'privacy', 'community'];
const TMDB_NOTICE = /This product uses the TMDB API but is not endorsed or certified by TMDB\./;

// A stranger: a context with no saved session at all.
async function asStranger(browser, fn) {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  try { await fn(new SitePage(page), page); } finally { await ctx.close(); }
}

Then('a fresh visitor at the root meets the front page', async ({ browser }) => {
  await asStranger(browser, async (site, page) => {
    await page.goto(BASE(), { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/main$/, { timeout: 15000 });
    await expect(site.homeHeader).toBeVisible();
    await expect(site.tabbar).toHaveCount(0);
    await expect(site.tunnelPosters.first()).toBeAttached({ timeout: 15000 });
  });
});

Then("the week's tab shows this week's news", async ({ browser }) => {
  await asStranger(browser, async (site, page) => {
    await site.goto('main', BASE());
    await site.homeTabs.filter({ hasText: /^Цього тижня$/ }).click();
    await expect(page).toHaveURL(/\/week$/, { timeout: 15000 });
    // The news comes from the Worker's /public/home after the page paints, as one strip of posters.
    await expect(site.weekCards.first()).toBeAttached({ timeout: 15000 });
    expect(await site.weekCards.count()).toBeGreaterThan(0);
  });
});

Then('the rating scene answers a hand on its tape', async ({ browser }) => {
  await asStranger(browser, async (site) => {
    await site.goto('main', BASE());
    await site.scrollToScene('rate', 0.05);
    await expect(site.rateBand).toHaveText('Ніколи мені такого не раджу', { timeout: 15000 });
    await site.dragTape(-1800);
    await expect(site.rateBand).toHaveText('Обовʼязково до перегляду', { timeout: 15000 });
  });
});

Then('the projector scene plays through on the scroll alone', async ({ browser }) => {
  await asStranger(browser, async (site, page) => {
    await site.goto('main', BASE());
    // Through the track in steps, as a reader scrolls: a frame at .17, .30 and .42, the lamp after .60.
    for (const p of [0.05, 0.2, 0.33, 0.45, 0.55]) { await site.scrollToScene('pot', p); await page.waitForTimeout(400); }
    await expect(site.projectorChosen).toHaveCount(3, { timeout: 15000 });
    await site.scrollToScene('pot', 0.7);
    await expect(site.projectorLead).toHaveText(/Сеанс почався/, { timeout: 15000 });
  });
});

Then('the front page offers a stranger a way in and an account', async ({ browser }) => {
  await asStranger(browser, async (site) => {
    await site.goto('main', BASE());
    await expect(site.homeSignIn).toHaveAttribute('href', 'login');
    await expect(site.signInButton.first()).toHaveAttribute('href', 'login');
    await expect(site.ctaRegister.first()).toHaveAttribute('href', 'registrations');
  });
});

Then("every page of the site shows the tab strip and TMDB's notice", async ({ browser }) => {
  await asStranger(browser, async (site) => {
    for (const name of PAGES) {
      await site.goto(name, BASE());
      if (DARK.includes(name)) await expect(site.homeHeader, name).toBeVisible();
      await expect(site.tabs, name).toHaveCount(4);
      await expect(site.activeTab, name).toHaveCount(UNTABBED.includes(name) ? 0 : 1);
      await expect(site.footerNote, name).toHaveText(TMDB_NOTICE);
      await expect(site.footerContacts, name).toHaveCount(1);
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
  await expect(site.homeSignIn).toHaveAttribute('href', 'films');
  await expect(site.homeSignIn).toHaveText('До застосунку');
  await expect(site.ctaRegister).toHaveCount(0);
});

Then('I am still signed in', async ({ page }) => {
  await new SitePage(page).homeSignIn.click();
  await expect(page).toHaveURL(/\/films$/);
  const catalog = new CatalogPage(page);
  await catalog.waitForCatalogLoaded();
  expect(await catalog.cardCount()).toBeGreaterThan(0);
});

When("I open the first film on the week's tab", async ({ catalog, page, ctx }) => {
  await catalog.waitForCatalogLoaded();
  const site = new SitePage(page);
  await site.goto('week', BASE());
  const first = site.openableWeekCards.first();
  await expect(first).toBeAttached({ timeout: 15000 });
  // A card leads to its film from the middle of the strip; anywhere else a press only brings it there.
  ctx.frontPageTitle = await site.centreWeekCard(first);
  await first.click();
});

Then("that film's card is open in the app", async ({ page, ctx }) => {
  await expect(page).toHaveURL(/\/(films|series)$/, { timeout: 15000 });
  const modal = new MovieModalPage(page);
  await modal.waitUntilOpen(30000);
  await expect(modal.title).toHaveText(ctx.frontPageTitle);
});

Then('the stories page shows sourced stories with credited photos', async ({ browser }) => {
  await asStranger(browser, async (site) => {
    await site.goto('stories', BASE());
    expect(await site.stories.count()).toBeGreaterThan(0);
    // Every story names where it came from; every photo, whose it is.
    for (const story of await site.stories.all()) {
      expect(await story.locator('.story-sources li').count()).toBeGreaterThan(0);
    }
    for (const credit of await site.storyPhotoCredits.all()) {
      await expect(credit).toContainText('Wikimedia Commons');
    }
  });
});

Then('a trailer loads only when it is tapped, from the no-cookie player', async ({ browser }) => {
  await asStranger(browser, async (site) => {
    await site.goto('stories', BASE());
    await expect(site.trailerFrames).toHaveCount(0);
    await site.trailerButtons.first().click();
    await expect(site.trailerFrames).toHaveCount(1);
    await expect(site.trailerFrames.first()).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?/);
  });
});

Then("the front page leads to the newest stories", async ({ browser }) => {
  await asStranger(browser, async (site, page) => {
    await site.goto('main', BASE());
    const first = site.homeStoryLink;
    await expect(first).toHaveAttribute('href', /^stories#[a-z0-9-]+$/);
    const anchor = (await first.getAttribute('href')).split('#')[1];
    await first.click();
    await expect(page).toHaveURL(new RegExp(`/stories#${anchor}$`));
    await expect(page.locator(`article.story#${anchor}`)).toBeVisible();
  });
});
