// Steps over the share sheet (pages/ShareSheetPage.js), opened from the film card's share key.
// Look and switch only: no network and no key that hands the picture over is ever pressed.
const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { modalOf } = require('../support/modal-of');
const { ShareSheetPage } = require('../pages/ShareSheetPage');
const { When, Then } = createBdd(test);

function shareOf(ctx, page) {
  if (!ctx.share) ctx.share = new ShareSheetPage(page);
  return ctx.share;
}

When("I press the card's share key", async ({ ctx, page }) => {
  await modalOf(ctx, page).pressShareKey();
  await shareOf(ctx, page).waitUntilOpen();
});
Then('the share sheet is open for the film, with its picture drawn', async ({ ctx, page }) => {
  const share = shareOf(ctx, page);
  await expect(share.title).toHaveText('Поділитися фільмом');
  await expect(share.picture).toBeVisible({ timeout: 15000 });
  expect(await share.networks.count()).toBeGreaterThan(0);
});
Then('it offers a post or a story, the post chosen', async ({ ctx, page }) => {
  const share = shareOf(ctx, page);
  expect(await share.formatWords()).toEqual(['Пост', 'Сторіс']);
  await expect(share.formatKey('Пост')).toHaveAttribute('aria-pressed', 'true');
  await expect(share.formatKey('Сторіс')).toHaveAttribute('aria-pressed', 'false');
});
Then('the 3D logo is on and the comment is off', async ({ ctx, page }) => {
  const share = shareOf(ctx, page);
  await expect(share.switchKey('logo')).toHaveAttribute('aria-checked', 'true');
  await expect(share.switchKey('note')).toHaveAttribute('aria-checked', 'false');
  await expect(share.noteField).toBeHidden();
});
When('I choose a story', async ({ ctx, page }) => {
  await shareOf(ctx, page).pressFormat('Сторіс');
});
Then("the story is chosen, and the picture is a story's size", async ({ ctx, page }) => {
  const share = shareOf(ctx, page);
  await expect(share.formatKey('Сторіс')).toHaveAttribute('aria-pressed', 'true');
  await expect(share.formatKey('Пост')).toHaveAttribute('aria-pressed', 'false');
  await expect(share.sizeLine).toHaveText(/1080 × 1920/);
});
When('I switch the comment on', async ({ ctx, page }) => {
  await shareOf(ctx, page).pressSwitch('note');
});
Then('a field for the comment is shown', async ({ ctx, page }) => {
  const share = shareOf(ctx, page);
  await expect(share.switchKey('note')).toHaveAttribute('aria-checked', 'true');
  await expect(share.noteField).toBeVisible();
});
When('I close the share sheet', async ({ ctx, page }) => {
  await shareOf(ctx, page).close();
});
Then('the share sheet is closed and the card is still open', async ({ ctx, page }) => {
  expect(await shareOf(ctx, page).isOpen()).toBe(false);
  await expect(modalOf(ctx, page).overlay).toBeVisible();
});
