// A stranger: a browser context with no saved session at all, for the pages read before sign-in.
// `fn` gets the page object `Page` builds (SitePage by default) and the raw page; the context is closed after.
const { SitePage } = require('../pages/SitePage');

async function asStranger(browser, fn, Page = SitePage) {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  try { await fn(new Page(page), page); } finally { await ctx.close(); }
}

module.exports = { asStranger };
