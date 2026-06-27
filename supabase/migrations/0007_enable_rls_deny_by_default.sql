-- ============================================================================
-- Enable Row Level Security (deny-by-default) on every application table.
--
-- WHY: RLS was deferred during Phase 1 in favour of app-level tenant scoping
-- (all data access happens server-side with the service-role key). But with RLS
-- OFF and the anon/authenticated roles holding default table grants, the PUBLIC
-- anon key (shipped in the browser bundle) could read every row — including
-- users.password_hash — and insert rows directly via PostgREST. This migration
-- closes that hole.
--
-- MODEL: RLS is enabled with NO policies, so the anon and authenticated roles
-- are denied all access by default. The service_role key used on the server has
-- BYPASSRLS, so application code (lib/supabase/admin.js) keeps working unchanged.
-- The browser only ever uses Supabase for AUTH (login/session), never for direct
-- table queries, so deny-by-default is safe. Granular per-table policies can be
-- added later if we ever want authenticated clients to read their own rows.
--
-- ORDER: apply ONLY after SUPABASE_SERVICE_ROLE_KEY is the real secret
-- (sb_secret_… / service_role JWT). Applying this while the server still uses a
-- publishable/anon-level key would lock the app out of its own data.
-- ============================================================================

alter table organizations          enable row level security;
alter table users                  enable row level security;
alter table team_members           enable row level security;
alter table widgets                enable row level security;
alter table conversations          enable row level security;
alter table demos                  enable row level security;
alter table invitations            enable row level security;
alter table support_requests       enable row level security;
alter table audit_log              enable row level security;
alter table analytics              enable row level security;
alter table satisfaction_analytics enable row level security;
alter table app_settings           enable row level security;
