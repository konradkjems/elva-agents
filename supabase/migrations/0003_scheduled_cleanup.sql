-- ============================================================================
-- Scheduled cleanup — replaces MongoDB TTL indexes.
--
-- Mongo had: conversations.createdAt TTL 30 days, audit_log TTL 2 years.
--
-- Requires the pg_cron extension. On Supabase, enable it once in the dashboard
-- (Database → Extensions → pg_cron) OR via the statement below. pg_cron can
-- only be installed in the `postgres` database.
--
-- NOTE: the project's data-retention cron (scripts/apply-data-retention.js) is
-- per-widget configurable and stays as application logic. These jobs are the
-- coarse backstop equivalents of the old TTL indexes. If you prefer to keep
-- retention purely in the Vercel cron, you can skip this file.
-- ============================================================================

create extension if not exists pg_cron;

-- Daily at 03:30 — delete conversations older than 30 days.
select cron.schedule(
  'cleanup-old-conversations',
  '30 3 * * *',
  $$ delete from conversations where created_at < now() - interval '30 days' $$
);

-- Weekly Sun 04:00 — delete audit_log entries older than 2 years.
select cron.schedule(
  'cleanup-old-audit-log',
  '0 4 * * 0',
  $$ delete from audit_log where timestamp < now() - interval '2 years' $$
);

-- To remove a job later: select cron.unschedule('cleanup-old-conversations');
