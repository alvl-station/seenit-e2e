# How code is written here (seenit-e2e)

The rules every change to the suite follows, on the owner's ask of 2026-09-30: «harmonious by the principles of OOP, no file over 1000 lines, encapsulation and inheritance, concise and understandable». The layout itself is in `CLAUDE.md`.

## 1. Where code goes

| Kind of code | Place | Rule |
|---|---|---|
| What is tested | `features/<area>.feature` | Gherkin in English, one file per area. The Feature names the REQ/BUG ids it covers. |
| Binding a Gherkin line | `steps/<area>.steps.js` | **Thin.** A step calls page objects and asserts. **No selectors here, ever.** |
| How a screen is driven | `pages/<Screen>Page.js` | **One class per screen or overlay.** Its selectors, its waits and its probes into the app (`page.evaluate`) live here and nowhere else. |
| Shared fixtures | `support/fixtures.js` | Import `test`/`expect` from here, never from `@playwright/test`. `ctx` carries one scenario's state, and its teardown undoes every mark a step made. |
| The API suite | `api/*.api.spec.js` with `api/support/api-client.js` | Every write is undone. The token stays in memory only. |

## 2. Object-oriented rules

- **Encapsulation.**
  - A page object owns its screen's selectors. A step never reaches past it into the DOM.
  - Probes into the app's globals (`page.evaluate(() => …)`) live only in page objects, so that a frontend refactor is one place to fix here.
  - `.card` means the shelf's cards. Scope it to `#main .card`, because rails, the franchise row and search results are cards too since 2026-09-30.
- **Inheritance.** When two page objects share behaviour (opening a tab in the strip, waiting for a page), it goes into a `BasePage` they both extend. Copying a method into a second page object is not allowed.
- **Composition.** A part of a screen that several screens show (the tab strip, the header) is a component object that the page objects hold.

## 3. Size and readability

- No source file over 1000 lines. Split a feature or a page object by concern.
- Scenarios read as the product: what a person does and sees, not how the DOM is built.
- English only in code, comments, commits and PRs.

## 4. Safety (this repo is public)

- Never add a `pull_request` trigger to anything that reads `TEST_USER`.
- All output passes through `scripts/redact-secrets.js` before it reaches disk.
- No traces, and `test-results/` is never uploaded.
- Tests never add, edit or delete films in the shared catalogue (seenit-frontend REQUIREMENTS T-4).

## 5. How a change proves itself

- Run the suite locally, never in CI without the owner's OK: `npm run smoke -- --workers=8`. Load the login from `.env.local` with `set -a; . ./.env.local; set +a` and never print it.
- `*.pages.dev` does not resolve from this machine. Map the host with `--host-resolver-rules` in a temporary config, as described in the owner's notes, and delete the config after the run.
- Run `npm test` for the redactor's unit suite.
