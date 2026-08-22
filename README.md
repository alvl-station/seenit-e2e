# SeenIt — E2E smoke suite

Playwright smoke tests for [SeenIt](https://alvl-station.github.io/seenit/),
stage 2 of the event-driven deploy chain (see `CLAUDE.md` for the full
picture and the rules this repo lives by).

**Public on purpose** — unlimited Actions minutes. All output is redacted
before it touches disk; Playwright traces are never uploaded; smoke runs
trigger only via `repository_dispatch` from the private frontend repo.

> Part of the SeenIt multi-repo setup: **seenit-frontend** (private — sources
> & pipeline, canonical REQUIREMENTS/CONVENTIONS) · **seenit** (public —
> published page) · **seenit-e2e** (this repo) · **seenit-backend** (private —
> API proxy, planned). Predecessor: [kino-tracker](https://github.com/alvl-station/kino-tracker).
