// Steps over the site's calendar (pages/CalendarPage.js). Thin wrappers; the selectors live in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { CalendarPage } = require('../pages/CalendarPage');
const { MovieModalPage } = require('../pages/MovieModalPage');
const { baseUrl: BASE } = require('../support/base-url');
const { asStranger } = require('../support/stranger');
const { skipWithoutData } = require('../support/skips');
const { When, Then } = createBdd(test);

const LOAD = { timeout: 15000 };
const dayAfter = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

Then("the front page's calendar word opens the calendar with a week of days", async ({ browser }) => {
  await asStranger(browser, async (cal, page) => {
    await cal.goto('main', BASE());
    await cal.homeTab('Календар').click();
    await expect(page).toHaveURL(/\/calendar(\?|$)/, LOAD);
    await cal.waitForAgenda();
    await expect(cal.days).toHaveCount(7);
    await expect(cal.activeTab).toHaveText('Календар');
  }, CalendarPage);
});

Then("the about page's calendar tab opens the calendar, lit", async ({ browser }) => {
  await asStranger(browser, async (cal, page) => {
    await cal.goto('about', BASE());
    await cal.tab('Календар').click();
    await expect(page).toHaveURL(/\/calendar(\?|$)/, LOAD);
    await expect(cal.activeTab).toHaveText('Календар');
    await expect(cal.tab('Календар')).toHaveAttribute('aria-current', 'page');
  }, CalendarPage);
});

Then('switching off the cinemas leaves only the other types, and a reload keeps it', async ({ browser }) => {
  await asStranger(browser, async (cal, page) => {
    await cal.goto('calendar', BASE());
    await cal.waitForAgenda();
    await expect(cal.typeKey('cin')).toHaveAttribute('aria-pressed', 'true');
    await cal.pressType('cin');
    await expect(cal.typeKey('cin')).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => cal.query()).toMatch(/[?&]k=home,ep(&|$)/);
    expect(await cal.cardTypes()).not.toContain('cin');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await cal.waitForAgenda();
    await expect(cal.typeKey('cin')).toHaveAttribute('aria-pressed', 'false');
    await expect(cal.typeKey('home')).toHaveAttribute('aria-pressed', 'true');
    await expect(cal.typeKey('ep')).toHaveAttribute('aria-pressed', 'true');
    expect(await cal.cardTypes()).not.toContain('cin');
  }, CalendarPage);
});

Then("the next week's arrow moves the rail seven days on, and a reload keeps it", async ({ browser }) => {
  await asStranger(browser, async (cal, page) => {
    await cal.goto('calendar', BASE());
    await cal.waitForAgenda();
    const monday = await cal.firstDay();
    skipWithoutData(await cal.weekArrow(1).isDisabled(), 'the calendar reaches no week after this one');
    await cal.pressWeekArrow(1);
    const next = dayAfter(monday, 7);
    await expect.poll(() => cal.firstDay(), LOAD).toBe(next);
    await expect.poll(() => cal.query()).toMatch(new RegExp(`[?&]w=${next}(&|$)`));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => cal.firstDay(), LOAD).toBe(next);
    await expect(cal.days).toHaveCount(7);
  }, CalendarPage);
});

Then('a card pressed opens its film in the panel and its key in the address, and a reload keeps it', async ({ browser }) => {
  await asStranger(browser, async (cal, page) => {
    await cal.goto('calendar', BASE());
    await cal.waitForAgenda();
    const n = await cal.cards.count();
    skipWithoutData(n === 0, 'nothing comes out this week');
    // The last card: the page opens the premiere or the first one by itself.
    const card = cal.cards.nth(n - 1);
    const film = await cal.cardData(card);
    await card.click();
    await expect(card).toHaveClass(/\bsel\b/);
    await expect(cal.panelTitle).toHaveText(film.title, LOAD);
    await expect.poll(() => cal.query()).toContain(`f=${film.key}`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(cal.panelTitle).toHaveText(film.title, LOAD);
  }, CalendarPage);
});

Then("the week's old address with its section opens the calendar on that type alone", async ({ browser }) => {
  await asStranger(browser, async (cal, page) => {
    await cal.goto('week?s=digital', BASE());
    await expect(page).toHaveURL(/\/calendar(\?|$)/, LOAD);
    await cal.waitForAgenda();
    await expect(cal.typeKey('home')).toHaveAttribute('aria-pressed', 'true');
    await expect(cal.typeKey('cin')).toHaveAttribute('aria-pressed', 'false');
    await expect(cal.typeKey('ep')).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => cal.query()).toMatch(/[?&]k=home(&|$)/);
  }, CalendarPage);
});

When('I open a calendar film from the panel in the app', async ({ catalog, page, ctx }) => {
  await catalog.waitForCatalogLoaded();
  const cal = new CalendarPage(page);
  await cal.goto('calendar', BASE());
  await cal.waitForAgenda();
  const film = await cal.openFirstFilmTheAppHolds();
  skipWithoutData(!film, 'no film on this week of the calendar is in the catalogue');
  ctx.frontPageTitle = film.title;
  await cal.panelAppLink.click();
});

Then("that film's card is open in the app", async ({ page, ctx }) => {
  await expect(page).toHaveURL(/\/(films|series)$/, LOAD);
  const modal = new MovieModalPage(page);
  await modal.waitUntilOpen(30000);
  await expect(modal.title).toHaveText(ctx.frontPageTitle);
});
