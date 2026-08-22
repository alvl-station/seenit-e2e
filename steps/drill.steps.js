const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../support/fixtures');
const { Then } = createBdd(test);
Then('this step always fails', async ({ catalog }) => {
  expect(await catalog.cardCount(), 'deliberate drill failure').toBe(-1);
});
