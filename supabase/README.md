# Supabase migration — setup & runbook

This directory holds the Postgres schema and the data-migration tooling for the
MongoDB → Supabase migration. Migration is **phased**: Phase 1 = Database (this
directory), Phase 2 = Auth, Phase 3 = Storage. See the full plan in
`/Users/konradkjems/.claude/plans/jeg-vil-gerne-migrere-snappy-bonbon.md`.

## Layout

```
supabase/migrations/
  0001_initial_schema.sql      # all 13 tables, indexes, updated_at triggers
  0002_rpc_functions.sql       # atomic counters + message append (replace $inc/$push)
  0003_scheduled_cleanup.sql   # pg_cron jobs replacing Mongo TTL indexes
scripts/supabase/
  _lib.js                      # shared mongo/supabase helpers + FK resolution
  migrate.js                   # data migration orchestrator (idempotent on legacy_id)
  verify-migration.js          # count + orphaned-reference verification
```

## One-time setup

1. **Create a Supabase project** (use a dedicated *staging* project for the
   first dry-run). Grab from Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`  (server-only secret)
   and from Project Settings → Database:
   - `SUPABASE_DB_URL`  (connection string)

   Put them in `.env.local` (see `.env.example`).

2. **Install the Supabase CLI** and link the project:
   ```bash
   npm i -g supabase            # or: brew install supabase/tap/supabase
   supabase init                # creates config.toml; keep existing migrations
   supabase link --project-ref <your-project-ref>
   ```

3. **Apply the schema:**
   ```bash
   supabase db push             # runs supabase/migrations/*.sql against the project
   ```
   `pg_cron` (used by `0003`) must be enabled: Dashboard → Database → Extensions
   → enable `pg_cron`. If you'd rather keep retention in the Vercel cron, skip
   `0003`.

## Run the data migration

With both `MONGODB_URI` (source) and the Supabase env vars set in `.env.local`:

```bash
npm run supabase:migrate-data   # migrates all collections, in FK order
npm run supabase:verify         # compares counts + checks orphaned references
```

The migration is **idempotent** (upserts on `legacy_id`), so it is safe to
re-run — useful for a final delta sync right before cutover.

## Notes

- Every row keeps its original Mongo `_id` in `legacy_id`. Widget-serving
  endpoints look widgets up by `legacy_id` so existing embeds keep working.
- `users.password_hash` holds the bcrypt hash temporarily; Phase 2 copies it
  into `auth.users` and the column is then dropped.
- Tenant isolation is enforced in application code (service-role key +
  `organization_id` filtering). RLS is not enabled yet.
