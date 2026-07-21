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

To apply: paste the file into the Neon/Supabase SQL editor and run it.
