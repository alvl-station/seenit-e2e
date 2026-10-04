// Steps over PicksPage: the cauldron. Thin wrappers; the selectors live in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { PicksPage } = require('../pages/PicksPage');
const { When, Then } = createBdd(test);

const POLL = { timeout: 10000 };

// Every step asks for `catalog`: that fixture is what opens the app and signs in.
function picksOf(ctx, page) {
  if (!ctx.picks) ctx.picks = new PicksPage(page);
  return ctx.picks;
}

Then('the cauldron stands on the first step with an empty pot', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect(picks.pot).toBeVisible();
  await expect.poll(() => picks.step(), POLL).toBe('add');
  await expect(picks.chosen).toHaveCount(0);
});
When('I throw the first genre into the pot', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  ctx.pickedGenre = await picks.firstChipLabel();
  await picks.tap(ctx.pickedGenre);
});
Then('the pot holds one thing, and its chip is lit', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect(picks.chosen).toHaveCount(1);
  await expect(picks.potTitle).toHaveText('У казані 1');
  await expect.poll(() => picks.chipState(ctx.pickedGenre), POLL).toBe('in');
});
When('I go on to the second step', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await picks.press('next');
  await expect.poll(() => picks.step(), POLL).toBe('remove');
});
When('I ask the pot for its dish', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await picks.press('cook');
  await picks.waitForDish();
});
Then('the dish is at most ten films, cooked from what was thrown in', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect.poll(() => picks.cards.count(), POLL).toBeGreaterThan(0);
  expect(await picks.cards.count()).toBeLessThanOrEqual(10);
  await expect(picks.cooked).toHaveCount(1);
  await expect(picks.cooked.first()).toContainText(ctx.pickedGenre);
});
When('I go back to change the criteria', async ({ ctx, page, catalog: _ }) => {
  await picksOf(ctx, page).press('edit');
});
Then('the pot is as I left it', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect.poll(() => picks.step(), POLL).toBe('add');
  await expect.poll(() => picks.chipState(ctx.pickedGenre), POLL).toBe('in');
});
When('I switch off films', async ({ ctx, page, catalog: _ }) => {
  await picksOf(ctx, page).kindSwitch('film').click();
});
Then('films are off and series stay on', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect(picks.kindSwitch('film')).toHaveAttribute('aria-checked', 'false');
  await expect(picks.kindSwitch('series')).toHaveAttribute('aria-checked', 'true');
});
Then('every title in the dish is a series, and the dish says so', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect.poll(() => picks.cards.count(), POLL).toBeGreaterThan(0);
  expect(await picks.cards.count()).toBeLessThanOrEqual(10);
  const keys = await picks.cards.evaluateAll(cards => cards.map(c => c.dataset.key || ''));
  for (const key of keys) expect(key, 'a film in a series-only dish').toMatch(/^tv:/);
  await expect(picks.dishNote).toContainText('серіали');
});
