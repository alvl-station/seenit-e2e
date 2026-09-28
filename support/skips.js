// A skip that turns into a failure where the data is known to exist.
//
// Several scenarios skip when the catalogue holds no film with awards, no
// critic score, no providers, or the account has nothing marked. Against a
// preview or a fresh catalogue that is the ordinary state and a skip is
// right. Against PRODUCTION every one of those has data today, so the same
// skip means the app stopped SHOWING it — the awards row gone from the
// card, the provider tab empty — and a suite that quietly skipped would let
// that deploy through as green (a skip is not a failure to the verdict).
//
// The workflow sets SMOKE_STRICT_SKIPS=1 for production runs; by hand the
// variable is unset and every skip stays a skip. The skipped count is also
// written to the run summary either way (scripts/summarize-run.js).
const { test } = require('playwright-bdd');

const STRICT = process.env.SMOKE_STRICT_SKIPS === '1';

/**
 * `test.skip(condition, reason)` for data that may legitimately be absent
 * off production; a failure with the same reason where it never is.
 */
function skipWithoutData(condition, reason) {
  if (!condition) return;
  if (STRICT) throw new Error(`${reason} — production has this data, so the app is not showing it (SMOKE_STRICT_SKIPS=1)`);
  test.skip(true, reason);
}

module.exports = { skipWithoutData, STRICT };
