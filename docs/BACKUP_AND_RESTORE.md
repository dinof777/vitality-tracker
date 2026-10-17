# Backup and restore

**Written:** 2026-10-08 · **Database:** Neon Postgres (not Supabase — see
[A correction to the premise](#a-correction-to-the-premise)) · **Owner of this
area:** Otis (backup & disaster-recovery)

What this protects: the workout history in `log_entries` and `workouts` — the
progressive-overload record the app exists to build, which cannot be
reconstructed from anything else — plus the 291-exercise library, the gym
tenants, and the client body-measurement data in `client_profiles` /
`client_metrics`.

---

## The short version

| You need to… | Do this |
|---|---|
| Undo a migration that went wrong, or a bad bulk write, within the retention window | **Neon branch restore** in the Neon Console. Seconds, no data loss, no files. First choice. |
| Recover after the retention window has passed, or after losing the Neon account/project | `npm run restore -- --file <backup>` into a fresh database. Loses everything since the last weekly backup. |
| Take a backup now | `npm run backup` |
| Check the backups are real | `npm run restore -- --file <newest backup> --dry-run` (verifies the checksum and plans the write without connecting to anything) |

---

## A correction to the premise

The Mission Control card that commissioned this work, and the project plan
behind it, both describe the database as **Supabase** and name the tables as
`log_entries` and `workouts`. Two corrections, both verified in this repo:

1. **There is no Supabase.** The database is **Neon** serverless Postgres —
   `lib/db.ts` imports `neon` from `@neondatabase/serverless`, `package.json`
   lists that as the only database dependency, `.env.local.example` points at
   the Neon Console, and `STATUS.md` says so in its own description of the
   stack. The `supabase/` **directory** is a leftover name for where the schema
   and migrations live; nothing inside it talks to Supabase. So "set up a
   Supabase Edge Function export" and "Supabase's free tier has no
   point-in-time recovery" were both answering the wrong question.
2. **There are 19 tables, not 2.** `log_entries` and `workouts` are two of
   them. Backing up only those two would lose the exercise library, the gym
   tenants, the taxonomy and all client data — and would leave `log_entries`
   referencing exercises that no longer exist. **The backup therefore covers
   every table in the `public` schema, discovered at run time from
   `information_schema`**, so a table or column added by a future migration is
   included automatically and nobody has to remember to update a list.

---

## Two layers, and why both

### Layer 1 — Neon branch restore (your first move)

Neon keeps a write-ahead history and can create a branch of the database as it
was at an earlier moment, which you then promote. This is instant, needs no
files, and is the right tool for the scenario the card was actually worried
about: *a schema migration gone wrong, or an accidental truncation.*

- **Where:** Neon Console → the project → **Branches** → *Restore* / *Time
  travel*, or `neonctl branches restore`.
- **Limit:** it only reaches back as far as the project's **history retention
  window**, which depends on the Neon plan. `unverified:` the exact retention
  figure for this project's plan was **not** confirmed — this was written in a
  sandbox with no network access and no Neon credentials, and the figure is a
  plan setting, not something the repo records. **Check it once in the Neon
  Console (Project settings → History retention) and write the number in here.**
  If it is measured in hours rather than days, Layer 2 matters more, not less.
- **What it does not survive:** losing the Neon account or project itself
  (billing lapse, deleted project, compromised login), or corruption nobody
  notices until after the window closes. Both are exactly why Layer 2 exists.

### Layer 2 — a weekly logical export held outside Neon

`npm run backup` writes one timestamped, gzipped JSON file containing every
row of every table, plus a manifest recording the schema version it was taken
at and a SHA-256 of the data.

```bash
cd /Users/dinoflora/dev/vitality-tracker && npm run backup
```

- **Reads `DATABASE_URL`** from the environment, falling back to `.env.local`
  — the same convention as `npm run migrate`.
- **Writes to `$BACKUP_DIR`**, defaulting to
  `~/Library/Mobile Documents/com~apple~CloudDocs/Backups/vitality-tracker`
  (iCloud Drive).
- **Retention:** keeps the newest `$BACKUP_KEEP` files (default 12 — about a
  quarter of weekly runs) and deletes older ones *that it wrote itself*. It
  matches its own filename pattern and will not delete anything else in that
  folder.
- **It verifies itself.** After writing, it reads the file back off disk,
  decompresses it, and re-hashes the rows. If the file on disk does not match
  what was dumped, the run **fails**. "The backup was written" therefore means
  the file parses and its contents are intact, not that a write call returned.
- **It fails loudly, every time.** Exit code is non-zero and the reason is
  printed for: no `DATABASE_URL`, zero tables found, a column type it cannot
  promise to round-trip, a `NOT NULL` self-referencing column, or a failed
  verification. There is no path through this script that reports success
  having skipped something.

---

## PII: where a backup may and may not go

The dump contains **personal data** — client names, and in `client_profiles`
and `client_metrics` their body measurements, weight, BMI and heart-rate
variability. That sets hard limits on where the file lives:

- ✅ **iCloud Drive** (the default) — private to the account, encrypted in
  transit and at rest, and already backed up.
- ✅ A private S3 bucket or an encrypted external disk.
- ❌ **A GitHub repository, or a gist.** The card's own subtask suggested
  "GitHub" as a durable location; for this dump that is **not acceptable** and
  was deliberately not built. A gist is a URL away from public, git history
  keeps a deleted file forever, and "the repo is private" is one setting
  change away from not being true. Client body-measurement data does not go in
  a git repo.
- ❌ Anywhere the path or the dump itself gets logged, pasted into chat, or
  attached to a Mission Control card.

The scripts print **row counts and table names only** — never a row.

---

## Restore procedure

The procedure below restores into a **fresh, empty database**. That is the
deliberate shape: restoring over a live database is how you turn a recoverable
incident into an unrecoverable one.

### Safety rails built into `npm run restore`

- It **cannot see `DATABASE_URL`.** It reads `RESTORE_DATABASE_URL` and nothing
  else, so forgetting a flag cannot point a restore at production.
- It writes **inside one transaction**. Any failure rolls back the whole thing
   — there is no half-restored state to discover later.
- It inserts `on conflict do nothing`, so it tops up a partially-populated
  target and never overwrites an existing row.
- It **verifies the checksum before touching anything**, and refuses a dump
  that is truncated, edited, or of an unknown format version.
- It **plans every statement before opening a connection**, so a bug in the
  planner cannot leave a transaction open against a real database.
- `--dry-run` does all of the above and executes nothing. It needs no
  connection string at all.

### Steps

1. **Pick the backup.** Newest file in the backup folder, unless you are
   deliberately going further back.

   ```bash
   ls -lt ~/Library/Mobile\ Documents/com~apple~CloudDocs/Backups/vitality-tracker
   ```

2. **Check it before you rely on it** — this verifies the checksum and prints
   what it contains, without connecting to any database.

   ```bash
   cd /Users/dinoflora/dev/vitality-tracker && npm run restore -- --file ~/Library/Mobile\ Documents/com~apple~CloudDocs/Backups/vitality-tracker/vitality-backup-YYYYMMDDTHHMMZ.json.gz --dry-run
   ```

3. **Create a new Neon project** (or a new branch) in the Neon Console, and
   copy its connection string.

4. **Stand the schema up** in the new database. `supabase/schema.sql` is the
   current full state; `npm run migrate` applies the incremental files and
   records them. Either gets you there — use the migration runner, because it
   also populates `schema_migrations`, which step 5 compares against.

   ```bash
   cd /Users/dinoflora/dev/vitality-tracker && DATABASE_URL='<new connection string>' npm run migrate
   ```

5. **Restore the rows.**

   ```bash
   cd /Users/dinoflora/dev/vitality-tracker && RESTORE_DATABASE_URL='<new connection string>' npm run restore -- --file <the backup file>
   ```

   It prints the restore order, warns if the target's schema version differs
   from the dump's, and finishes with the row count it wrote.

6. **Point the app at it.** Update `DATABASE_URL` in the Vercel project
   settings (Dino only — it is a secret) and redeploy. Until that happens the
   live site is still reading the old database.

7. **Check the thing you came for.** Open the app and confirm a recent workout
   and its sets are there, and that an exercise image still loads. Row counts
   agreeing is not the same as the app working.

### How the hard part works

Two tables reference themselves — `taxonomy_terms` (`parent_id`,
`merged_into`) and `equipment_catalog` (`merged_into`). A plain insert in table
order fails on those, because a child row can arrive before its parent. Rather
than guessing a row order, the restore writes them in **two phases**: every row
is inserted with the self-referencing columns `NULL`, then a second pass
`UPDATE`s them to their real values once every row exists. This is why the
backup refuses to run if it ever finds a `NOT NULL` self-referencing column —
the two-phase write would be impossible and it says so rather than producing a
dump that cannot be restored.

Everything else is ordered by a topological sort of the foreign-key graph read
from `pg_constraint`, so parents always precede children. A true cycle between
two tables cannot be ordered; if one is ever introduced, both scripts name the
tables involved rather than failing halfway through.

---

## What has and has not been tested

Be clear about this, because a backup you believe in and have not tested is
worse than none.

**Verified** (`npx vitest run scripts/lib-backup.test.mjs` — 42 tests, all
passing, and they run on every `npm run build` via the `prebuild` gate):

- The foreign-key ordering is correct **for this schema's real 19 tables and 27
  foreign keys**, transcribed from `supabase/schema.sql`: every parent precedes
  every child, the two self-referencing tables are identified as such rather
  than treated as cycles, and the order is identical run to run.
- A **full round trip**: a dump of a realistic slice of this schema (a
  parent/child taxonomy term, an exercise with a `text[]`, a workout with its
  log entries) is planned and applied to a stand-in store that enforces the one
  rule a database would — a foreign key must point at a row that already
  exists — and the end state equals the dumped rows exactly, self-references
  included.
- The checksum gate **rejects** a dump whose rows were edited, a truncated
  file, an unknown format version, and a file that is not a backup.
- Retention pruning keeps the newest N, deletes nothing when there are fewer
  than N, prunes nothing if `keep` is 0 or negative, and **never touches a file
  it did not write** (tested against a folder also holding `notes.txt` and a
  PDF).
- Row values are always **parameterised**, never interpolated into SQL;
  identifiers are rejected unless they are plain `snake_case`.
- Both scripts exit non-zero with the reason named when `DATABASE_URL` is
  missing or an argument is wrong — confirmed by running them.

**Not verified, and why:**

- **No run against the live database.** This was built in a Mission Control
  runner worktree with no network access and no credentials, so `npm run
  backup` has never connected to Neon. The round trip above is proved against
  fixtures, not against production rows. **This is the one step that still
  needs doing** — it is the subtask "test the restore procedure once," and it
  is waiting on the card.
- **Neon's history-retention window for this project** — a plan setting, not
  visible from the repo. See Layer 1.
- **Nothing schedules `npm run backup` yet.** See below.

---

## Keeping it running

A backup script nobody runs is a document, not a backup. Two things still
needed, neither of which could be done from a sandboxed worktree:

1. **Schedule it weekly.** A `launchd` agent on the Mac is the right home —
   this repo deliberately owns no scheduled jobs (no `vercel.json`, no
   crontab), and that is worth keeping: a Vercel cron would mean putting a
   full-database read behind an HTTP route, and storing a dump containing
   client PII somewhere a request can reach. A local weekly job keeps the
   secret and the dump on one machine. **Installing it is Cal's lane**
   (infrastructure & scheduled-job health), including the part that matters
   most: confirming the job actually exits 0 rather than appearing to run.
2. **Verify monthly.** The point of the check is not that a file exists but
   that it restores: `npm run restore -- --file <newest> --dry-run` verifies
   the checksum in seconds, and once or twice a year it is worth doing a full
   restore into a scratch Neon branch. Put it in the calendar, or better, have
   the scheduled job itself report a failure loudly — a silent backup failure
   is the documented way this goes wrong, and it has gone wrong that way on
   this machine before (a nightly backup ran broken for 39 days with nothing
   surfacing it).

---

## Options considered and not taken

| Option | Why not |
|---|---|
| **Supabase scheduled Edge Function** (the card's suggestion) | There is no Supabase in this project. Not applicable. |
| **Neon's paid built-in backups / longer retention** | Worth having, and it is a billing decision for Dino, not a code change. It is a better Layer 1 — it is not a Layer 2, because it still lives inside the Neon account that Layer 2 exists to survive the loss of. |
| **`pg_dump` on a cron** | Needs Postgres client tools installed and version-matched, and gives a binary dump that is awkward to inspect or partially restore. The repo already has a working Node + `@neondatabase/serverless` path (`run-migrations.mjs`), so this adds no new tooling and produces a file you can read. A bare `pg_dump | gzip` to iCloud also has no self-verification and no failure signal. |
| **Vercel Cron hitting an API route that exports** | Puts a full-database read on a public HTTP surface and needs the dump stored somewhere a request can reach, with client PII in it. More attack surface and more moving parts than a personal app needs. |
| **Committing the dump to the repo, or a GitHub gist** | PII in git history, permanently. See [PII](#pii-where-a-backup-may-and-may-not-go). |
| **Manual CSV download from the console** | Fine as an emergency grab, useless as a routine: per-table, no ordering, no schema version, no checksum, and it depends on someone remembering. |
| **Backing up only `log_entries` and `workouts`** (the card's subtask) | Would restore log entries pointing at exercises and tenants that no longer exist. Every table, discovered at run time, costs nothing at this data size. |
