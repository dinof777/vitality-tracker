# CLAUDE.md — vitality-tracker

## Two rules for new and changed code (Dino, 2026-10-13)

- **No direct database queries in route handlers.** A new or changed `route.ts` stays thin: validate input, call a function, shape the response. The query lives in a function in a `lib/` module (flat files, e.g. `lib/client-portal-db.ts`, `lib/lifecycle-db.ts`) that gets its client from `getSql()` in `lib/db.ts`, and the handler imports that. Existing handlers that query directly are not to be refactored to comply, and no folders are reorganized for this.
- **Propose new dependencies before adding them.** Before `npm install` or any edit to `package.json` (a version bump inside a branch counts), post the package name, why it is needed, its size, and the alternatives (including "do it without"), then wait for Dino's approval.
