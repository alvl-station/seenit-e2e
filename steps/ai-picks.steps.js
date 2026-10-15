// Steps over AiPicksPage: the orb and the two-mode chat. Thin wrappers; the selectors live in pages/.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { AiPicksPage } = require('../pages/AiPicksPage');
const { When, Then } = createBdd(test);

const POLL = { timeout: 10000 };

// Every step asks for `catalog`: that fixture is what opens the app and signs in.
function aiOf(ctx, page) {
  if (!ctx.ai) ctx.ai = new AiPicksPage(page);
  return ctx.ai;
}

Then('the AI picks page shows the orb and greets with four suggestions', async ({ ctx, page, catalog: _ }) => {
  const ai = aiOf(ctx, page);
  await expect.poll(() => ai.isOpen(), POLL).toBe(true);
  await expect(ai.orb).toBeVisible();
  await expect(ai.messages.first()).toContainText('Що хочеш подивитись сьогодні?');
  await expect(ai.chips).toHaveCount(4);
});
When('I write {string} to the AI', async ({ ctx, page, catalog: _ }, text) => {
  const ai = aiOf(ctx, page);
  ctx.aiSaid = text;
  await ai.write(text);
});
Then('the AI answers my words', async ({ ctx, page, catalog: _ }) => {
  const ai = aiOf(ctx, page);
  await expect(ai.mine.last()).toHaveText(ctx.aiSaid);
  await expect(ai.typing).toHaveCount(0, POLL);
  await expect.poll(() => ai.messages.count(), POLL).toBeGreaterThanOrEqual(3);
  ctx.aiLogLength = await ai.messages.count();
});
When('I switch the AI to the description mode', async ({ ctx, page, catalog: _ }) => {
  await aiOf(ctx, page).switchTo('desc');
});
When('I switch the AI back to picks', async ({ ctx, page, catalog: _ }) => {
  await aiOf(ctx, page).switchTo('pick');
});
Then('the description mode says soon and takes no words', async ({ ctx, page, catalog: _ }) => {
  const ai = aiOf(ctx, page);
  await expect(ai.soon).toBeVisible();
  await expect(ai.mine).toHaveCount(0);
  await expect(ai.input).toBeDisabled();
});
Then('my words to the AI are still in the log', async ({ ctx, page, catalog: _ }) => {
  const ai = aiOf(ctx, page);
  await expect(ai.messages).toHaveCount(ctx.aiLogLength);
  await expect(ai.mine.last()).toHaveText(ctx.aiSaid);
});
Then('the header\'s AI word reads {string} and no word of the row overflows its place', async ({ ctx, page, catalog: _ }, word) => {
  const ai = aiOf(ctx, page);
  await expect.poll(() => ai.headerWordText(), POLL).toBe(word);
  expect(await ai.headerRowOverflows()).toBe(false);
});
