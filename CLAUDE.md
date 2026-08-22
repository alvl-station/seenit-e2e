# CLAUDE.md — seenit-e2e

## What this is
The Playwright smoke suite for **SeenIt** (a personal Ukrainian-language
movie/TV tracker). This repo is stage 2 of the event-driven deploy chain:

```
seenit-frontend deploy.yml ──run-smoke──▶ smoke.yml (here) ──smoke-passed/failed──▶ seenit-frontend verdict.yml
```

- Live site under test: https://alvl-station.github.io/seenit/ (artifact repo: **seenit**)
- Sources & pipeline: **seenit-frontend** (private) — its `REQUIREMENTS.md` / `CONVENTIONS.md` are the canonical rules for the whole product; this file only covers what's specific to this repo.
- Predecessor: github.com/alvl-station/kino-tracker

## This repo is PUBLIC — and that's load-bearing
Public = unlimited Actions minutes, and the Playwright run is the most
expensive job in the chain. The prices, all non-negotiable:
- **Triggers**: `repository_dispatch`/`workflow_dispatch` ONLY. Never add a
  `pull_request` trigger to anything that reads `TEST_USER` — a fork PR must
  not be able to reach it.
- **Redaction**: all test output flows through `scripts/redact-secrets.js`
  *before* touching disk. Logs and artifacts here are world-readable, and the
  login/password are jq-derived from the `TEST_USER` JSON, so GitHub's
  automatic masking has never seen those strings. `::add-mask::` is also
  applied, but it only covers the live log view, never files.
- **No traces**: never upload `test-results/` — a Playwright trace records
  every action's arguments, including the literal password typed into
  `fill()` on the login form.

## Layout — everything in its obvious place
```
features/  Gherkin scenarios (*.feature, English) — THE human-readable
           source of truth, one file per area, each Feature description
           naming the BUGS/REQ ids it covers
steps/     step definitions — thin wrappers binding Gherkin lines to the
           page objects; no selectors here, ever
pages/     ONLY page objects, one class per screen/overlay
support/   fixtures.js — the extended `test` (from playwright-bdd) whose
           `catalog` fixture hands every scenario a logged-in catalog, and
           `ctx` carries state between the steps of one scenario
scripts/   the log redactor + its node:test unit suite, co-located
.features-gen/  bddgen output (gitignored) — playwright.config's testDir
```
Run: `npm run smoke` (= `bddgen && playwright test`). Device profiles are
projects selected by scenario tags: untagged = desktop; `@phone-portrait`
and `@phone-landscape` run in emulated touch viewports.

## Test rules
- Strict Page Object Model: `pages/*.js`, one class per screen/overlay
  (`LoginPage`, `CatalogPage`, `MovieModalPage`, `AddModalPage`). Steps never
  touch selectors directly — a new assertion means a page-object method
  first, then a step, then the Gherkin line.
- **Read-only against real data.** The app has no per-user data yet
  (`kino/watched`/`kino/liked` are global Firebase refs) — every login
  mutates the same real catalog. Log in, look, search, open/close modals.
  Never toggle "переглянуто"/"рекомендую", never add/delete a movie.
- Test queries must never accidentally match real catalog entries — use pure
  gibberish (no real words, no digits).
- **Grow the suite**: a user-facing feature PR in seenit-frontend should be
  accompanied by a PR here (one new smoke test + strengthen one existing).
  Cross-link the two PRs.

## Commands
```bash
npm install                  # once (Playwright)
npx playwright install chromium
npm test                     # node:test unit suite for the redactor (scripts/)
BASE_URL=... SMOKE_TEST_USERNAME=... SMOKE_TEST_PASSWORD=... npm run smoke
```

## Secrets
- `TEST_USER` — JSON `{"login": "...", "password": "..."}`; a dedicated
  Firebase Auth test account, never the owner's own login.
- `UI_CALLBACK_PAT` — fine-grained PAT whose only power is firing
  `repository_dispatch` in seenit-frontend (the verdict). If it expires, the
  chain breaks silently — seenit-frontend's daily watchdog catches that.
