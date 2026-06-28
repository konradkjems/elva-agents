# Database Setup (Supabase)

> This project migrated from MongoDB to **Supabase** (Postgres) in June 2026. The old MongoDB setup guide is obsolete.

## Setup
1. Create a Supabase project at https://supabase.com.
2. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API) into `.env.local`.
3. Apply the schema with the SQL migrations in `supabase/migrations/*.sql` (`supabase db push`, or paste them into the dashboard SQL editor).
4. Create a bootstrap admin: `npm run create-admin`, then `node scripts/set-platform-admin.js <email>`.

See `WARP.md` / `CLAUDE.md` for the full architecture and env reference.
