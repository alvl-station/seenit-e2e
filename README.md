# SeenIt — E2E smoke suite

Playwright smoke tests for [SeenIt](https://seenit-app.pages.dev/),
stage 2 of the event-driven deploy chain (see `CLAUDE.md` for the full
picture and the rules this repo lives by).

**Public on purpose** — unlimited Actions minutes. All output is redacted
before it touches disk; Playwright traces are never uploaded; smoke runs
trigger only via `repository_dispatch` from the private frontend repo.

## The chain, and what comes back

```
seenit-frontend deploy.yml ──run-smoke──▶ smoke.yml ──smoke-passed / smoke-failed / smoke-inconclusive──▶ verdict.yml
```

`run-smoke` carries `ref`, `deploy_run`, `base_url` and — since the build
stamp — `stamp` (`<ref>@<sha>`, the value the deploy wrote into the page as
`<meta name="seenit-build">`). The run waits until the live page serves that
stamp three fetches in a row (up to 10 min) before a single test starts, and
one scenario asserts the browser under test saw it too. A dispatch without a
stamp falls back to waiting for HTTP 200, with a warning.

Three verdicts go back, as `repository_dispatch` event types:

| event | meaning | verdict.yml |
|---|---|---|
| `smoke-passed` | every test passed (flakes and skips included, both listed in the run summary) | moves `deployed-latest` |
| `smoke-failed` | at least one test failed after its retry | rolls back, files an issue |
| `smoke-inconclusive` | no result at all: a setup step failed, the CDN never served the build, the run was cancelled | says nothing — nothing moves |

The `client_payload` carries `ref`, `deploy_run`, `stamp`, `verdict`,
`e2e_run_url` and `report_url`. Only the smoke test step's outcome is a
verdict; install, browser and wait failures are inconclusive by design.

## Reports

Every CI run publishes its Allure report to the `gh-pages` branch at
`https://alvl-station.github.io/seenit-e2e/runs/<run_id>/` (the root forwards
to the newest run; the newest 30 are kept, so a rollback issue's link keeps
pointing at the report it was filed with). `history/` at the root carries the
trend chart across runs. The run summary in Actions lists every flaky test,
every skip with its reason, and any teardown that could not undo a mark.

On production runs the scenarios that skip for missing data (awards, critic
score, providers, the mark counts) fail instead — production has that data,
so a skip there means the app stopped showing it (`support/skips.js`).

## Running by hand

```bash
npm ci && npx playwright install chromium
npm test                                   # unit tests for the scripts
source .env.local && npm run smoke         # SMOKE_TEST_USERNAME / SMOKE_TEST_PASSWORD
npm run api                                # the API suite, one worker (shared account)
DEPLOY_STAMP=v1.2.3@abcdef0 npm run smoke  # also assert the served build
```

The scenarios that write marks or compare counts live in `features/marks.feature`
only: that file is its own Playwright project, run alone before the read-only
ones, because every run shares one test account.

> Part of the SeenIt multi-repo setup: **seenit-frontend** (private — sources
> & pipeline, canonical REQUIREMENTS/CONVENTIONS) · **seenit** (public —
> published page) · **seenit-e2e** (this repo) · **seenit-backend** (private —
> API proxy). Predecessor: [kino-tracker](https://github.com/alvl-station/kino-tracker).
