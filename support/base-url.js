// The one place the site under test is named.
//
// Every suite runs against a live, already-deployed URL: production by
// default, so the suite is runnable by hand, or whatever BASE_URL says (the
// workflow sets it from the deploy dispatch). The same default used to be
// spelled out in five files; a preview host renamed once and the suites
// disagreed about where they were.
//
// The workflow reads PRODUCTION_URL from its own env for the same value; a
// change here must be mirrored in .github/workflows/smoke.yml.
const PRODUCTION_URL = 'https://seenit-app.pages.dev/';

/** The site under test, always with a trailing slash so paths can be appended. */
function baseUrl() {
  const url = (process.env.BASE_URL || PRODUCTION_URL).trim();
  return url.endsWith('/') ? url : `${url}/`;
}

/** Whether the suite is pointed at production (strict skips apply there). */
function isProduction() {
  return baseUrl() === PRODUCTION_URL;
}

module.exports = { PRODUCTION_URL, baseUrl, isProduction };
