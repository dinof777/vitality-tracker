# Migrations

`../schema.sql` is the **current full state** of the database — what you run to
stand a fresh one up. The files in here are the **incremental steps** for a
database that already exists.

Convention:

- `NNNN_short_name.sql`, applied in filename order, never edited after they ship.
- Every statement is idempotent (`if not exists`, `on conflict do nothing`) so
  re-running a migration is safe.
- Any change here must also be folded into `../schema.sql`, so the two never
  drift. (They did once: `exercises.tags` shipped to production without ever
  landing in `schema.sql` — `0001` is the repair.)

## Process

A migration lands as a **reviewed PR** before it ever touches the live
database — no more pasting SQL directly into the Neon/Supabase SQL editor.
Once merged, apply it with the runner:

```
npm run migrate
```

`scripts/run-migrations.mjs` applies every file in here not yet recorded in
the `schema_migrations` table, in filename order, and records each one it
applies. Re-running it is safe — anything already recorded is skipped.

`0001_taxonomy.sql` and `0002_lifecycle.sql` predate this process: both were
applied by hand, with no PR review and no record of it anywhere. They happened
to be additive and idempotent, so nothing was at risk, but "was this applied?"
had no answer besides memory. `0003_schema_migrations.sql` adds the tracking
table and back-fills rows for `0001`/`0002` so it reflects reality from the
moment it exists — that migration is the one-time reconciliation; every
migration after it goes through the process above.
