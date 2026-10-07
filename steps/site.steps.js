// Steps over the site — the pages read before sign-in (seenit-frontend
// src/site/, ROUTES.md). Thin wrappers; the selectors live in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { SitePage } = require('../pages/SitePage');
const { StoriesPage } = require('../pages/StoriesPage');
const { CatalogPage } = require('../pages/CatalogPage');
const { baseUrl: BASE } = require('../support/base-url');
const { asStranger } = require('../support/stranger');
const { When, Then } = createBdd(test);

const PAGES = ['main', 'calendar', 'stories', 'about', 'legal', 'terms', 'privacy', 'community', 'sources', 'contacts'];
const DOCUMENTS = ['terms', 'privacy', 'community', 'sources'];
const DRAFTS = ['terms', 'privacy', 'community'];
const TMDB_NOTICE = /This product uses the TMDB API but is not endorsed or certified by TMDB\./;

Then('a fresh visitor at the root meets the front page', async ({ browser }) => {
  await asStranger(browser, async (site, page) => {
    await page.goto(BASE(), { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/main$/, { timeout: 15000 });
    await expect(site.homeHeader).toBeVisible();
    await expect(site.tabbar).toHaveCount(0);
    await expect(site.tunnelPosters.first()).toBeAttached({ timeout: 15000 });
  });
});

Then('the rating scene answers a hand on its tape', async ({ browser }) => {
  await asStranger(browser, async (site) => {
    await site.goto('main', BASE());
    await site.scrollToScene('rate', 0.05);
    await expect(site.rateBand).toHaveText('Ніколи мені такого не раджу', { timeout: 15000 });
    await site.dragTapeUp(3);
    await expect(site.rateBand).toHaveText('Обовʼязково до перегляду', { timeout: 15000 });
  });
});

Then('the projector stands inside its scene on a phone', async ({ page }) => {
  const site = new SitePage(page);
  await site.goto('main', BASE());
  await site.scrollToScene('pot', 0.1);
  await expect.poll(() => site.gateInsideScene(), { timeout: 15000 }).toBe(true);
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
      // The front page keeps its own folding header with the four others (design/home); every other page the calm
      // frame's five tabs with the current one lit (design/site-pages, 2026-10-06).
      if (name === 'main') {
        await expect(site.homeHeader, name).toBeVisible();
        await expect(site.homeTabs, name).toHaveCount(4);
      } else {
        await expect(site.tabs, name).toHaveCount(5);
        // Contacts is a document since 2026-10-06, so it lights «Документи» like the rest.
        await expect(site.activeTab, name).toHaveCount(1);
      }
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
      await expect(site.sectionMenu, name).toHaveCount(5);
      await expect(site.sectionMenu.and(page.locator('[aria-current="page"]')), name).toHaveCount(1);
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

Then('the stories page shows sourced stories with credited photos', async ({ browser }) => {
  await asStranger(browser, async (stories) => {
    await stories.goto('stories', BASE());
    expect(await stories.stories.count()).toBeGreaterThan(0);
    await expect(stories.rows).toHaveCount(await stories.stories.count());
    // Every story names where it came from; every photo, whose it is.
    for (const story of await stories.stories.all()) {
      expect(await stories.sourcesOf(story).count()).toBeGreaterThan(0);
    }
    expect(await stories.photoCredits.count()).toBeGreaterThan(0);
    for (const credit of await stories.photoCredits.all()) {
      await expect(credit).toContainText('Wikimedia Commons');
    }
  }, StoriesPage);
});

Then('a row of the list opens its story in the panel, and the address follows', async ({ browser }) => {
  await asStranger(browser, async (stories, page) => {
    await stories.goto('stories', BASE());
    // The first story stands in the panel before anything is pressed; the second row is pressed.
    await expect(stories.openStory).toHaveCount(1);
    const row = stories.rows.nth(1);
    const slug = await stories.rowSlug(row);
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/stories#${slug}$`));
    await expect.poll(() => stories.openSlug()).toBe(slug);
    await expect(stories.openStory).toBeVisible();
    await expect(stories.selectedRow()).toHaveAttribute('data-open', slug);
  }, StoriesPage);
});

Then('a trailer loads only when it is tapped, from the no-cookie player', async ({ browser }) => {
  await asStranger(browser, async (stories) => {
    await stories.goto('stories', BASE());
    expect(await stories.rows.count()).toBeGreaterThan(0);
    // A story opens at its own address; its trailer is a button until it is tapped.
    const slug = await stories.storyWithTrailer();
    await stories.goto('stories#' + slug, BASE());
    await expect.poll(() => stories.openSlug()).toBe(slug);
    await expect(stories.trailerButtons).toHaveCount(1);
    await expect(stories.trailerFrames).toHaveCount(0);
    await stories.trailerButtons.first().click();
    await expect(stories.trailerFrames).toHaveCount(1);
    await expect(stories.trailerFrames.first()).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?/);
  }, StoriesPage);
});

Then("the front page leads to the newest stories", async ({ browser }) => {
  await asStranger(browser, async (site, page) => {
    await site.goto('main', BASE());
    const first = site.homeStoryLink;
    await expect(first).toHaveAttribute('href', /^stories#[a-z0-9-]+$/);
    const anchor = (await first.getAttribute('href')).split('#')[1];
    await first.click();
    await expect(page).toHaveURL(new RegExp(`/stories#${anchor}$`));
    const stories = new StoriesPage(page);
    await expect.poll(() => stories.openSlug()).toBe(anchor);
    await expect(stories.openStory).toBeVisible();
  });
});

Then("the site's tabs stand behind the menu key, and a tab leads to its page", async ({ page }) => {
  const site = new SitePage(page);
  await site.goto('about', BASE());
  expect(await site.tabsShown()).toBe(false);
  await expect(site.menuKey).toHaveAttribute('aria-expanded', 'false');
  await site.pressMenuKey();
  await expect(site.menuKey).toHaveAttribute('aria-expanded', 'true');
  expect(await site.tabsShown()).toBe(true);
  await expect(site.tabs).toHaveCount(5);
  await site.tab('Календар').click();
  await expect(page).toHaveURL(/\/calendar(\?|$)/, { timeout: 15000 });
});
