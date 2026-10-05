// Steps over PicksPage: the editing bench and the projector. Thin wrappers; the selectors live in pages/.
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

Then('the bench stands on the first step with an empty strip', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect(picks.projector).toBeVisible();
  await expect.poll(() => picks.step(), POLL).toBe('add');
  await expect(picks.onStrip).toHaveCount(0);
  await expect(picks.stripTitle).toHaveText('Стрічка порожня');
});
When('I edit the first genre onto the strip', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  ctx.pickedGenre = await picks.frameLabel(0);
  await picks.tap(ctx.pickedGenre);
});
Then('the strip holds one frame, and its frame is lit', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect(picks.onStrip).toHaveCount(1);
  await expect(picks.stripTitle).toHaveText('У стрічці 1');
  await expect.poll(() => picks.frameState(ctx.pickedGenre), POLL).toBe('in');
});
When('I go on to the cut', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await picks.press('next');
  await expect.poll(() => picks.step(), POLL).toBe('remove');
});
When('I cut the second genre', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  ctx.cutGenre = await picks.frameLabel(1);
  await picks.tap(ctx.cutGenre);
});
Then('a struck-through frame is spliced into the strip', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect(picks.cutOnStrip).toHaveCount(1);
  await expect(picks.stripTitle).toHaveText('У стрічці 1 · вирізано 1');
  await expect.poll(() => picks.frameState(ctx.cutGenre), POLL).toBe('cut');
});
When('I start the show', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await picks.press('cook');
  await picks.waitForShow();
});
Then('the screen shows at most eight films, made from the strip', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect.poll(() => picks.cards.count(), POLL).toBeGreaterThan(0);
  expect(await picks.cards.count()).toBeLessThanOrEqual(8);
  await expect(picks.madeFrom.first()).toContainText(ctx.pickedGenre);
  if (ctx.cutGenre) await expect(picks.madeFrom.filter({ hasText: ctx.cutGenre })).toHaveClass(/is-cut/);
});
When('I stop the projector', async ({ ctx, page, catalog: _ }) => {
  await picksOf(ctx, page).press('stop');
});
Then('the strip is as I left it', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect.poll(() => picks.step(), POLL).toBe('add');
  await expect.poll(() => picks.frameState(ctx.pickedGenre), POLL).toBe('in');
});
When('I switch off films', async ({ ctx, page, catalog: _ }) => {
  await picksOf(ctx, page).kindSwitch('film').click();
});
Then('films are off and series stay on', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect(picks.kindSwitch('film')).toHaveAttribute('aria-checked', 'false');
  await expect(picks.kindSwitch('series')).toHaveAttribute('aria-checked', 'true');
});
Then('every title on the screen is a series, and the show says so', async ({ ctx, page, catalog: _ }) => {
  const picks = picksOf(ctx, page);
  await expect.poll(() => picks.cards.count(), POLL).toBeGreaterThan(0);
  expect(await picks.cards.count()).toBeLessThanOrEqual(8);
  const keys = await picks.cards.evaluateAll(cards => cards.map(c => c.dataset.key || ''));
  for (const key of keys) expect(key, 'a film in a series-only show').toMatch(/^tv:/);
  await expect(picks.dishNote).toContainText('серіали');
});
