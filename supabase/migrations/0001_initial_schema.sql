-- ============================================================================
-- Elva Chat Widget Platform — Initial Postgres schema (MongoDB → Supabase)
-- Hybrid model: core relations as real tables, nested config/usage/messages
-- as JSONB. Every table carries `legacy_id` to preserve the original Mongo
-- _id (ObjectId hex OR custom string) for FK resolution and embed compatibility.
--
-- Tenant isolation is enforced at the application layer (service-role key +
-- organization_id filtering). RLS is intentionally NOT enabled yet — it can be
-- layered on later without schema changes.
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()
create extension if not exists citext;     -- case-insensitive email

-- Auto-maintain updated_at on tables that have it.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- organizations  (tenant root)
-- owner_id FK is added AFTER users exists (circular dependency with
-- users.current_organization_id).
-- ----------------------------------------------------------------------------
create table organizations (
  id                  uuid primary key default gen_random_uuid(),
  legacy_id           text unique,
  name                text not null,
  slug                text not null unique,
  owner_id            uuid,
  plan                text not null default 'free'
                        check (plan in ('free', 'basic', 'growth', 'pro')),
  limits              jsonb not null default '{}'::jsonb,
  usage               jsonb not null default '{}'::jsonb,
  subscription_status text check (subscription_status in
                        ('active', 'trial', 'expired', 'cancelled')),
  subscription_id     text,
  trial_ends_at       timestamptz,
  billing_email       text,
  settings            jsonb not null default '{}'::jsonb,
  logo                text,
  primary_color       text,
  domain              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index organizations_owner_id_idx   on organizations (owner_id);
create index organizations_deleted_at_idx on organizations (deleted_at);
create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- users  (platform/agent profile)
-- In Phase 2 this row's id is linked 1:1 to auth.users(id) (same UUID).
-- password_hash is TEMPORARY — copied to auth.users in Phase 2, then dropped.
-- ----------------------------------------------------------------------------
create table users (
  id                      uuid primary key default gen_random_uuid(),
  legacy_id               text unique,
  email                   citext not null unique,
  name                    text,
  password_hash           text,
  role                    text not null default 'member'
                            check (role in ('member', 'admin', 'platform_admin')),
  platform_role           text,
  status                  text not null default 'active'
                            check (status in ('active', 'pending_deletion')),
  provider                text,
  email_verified          boolean not null default false,
  image                   text,
  preferences             jsonb not null default '{}'::jsonb,
  agent_profile           jsonb,
  current_organization_id uuid references organizations (id) on delete set null,
  last_login              timestamptz,
  deletion_scheduled_at   timestamptz,
  deletion_date           timestamptz,
  deletion_reason         text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index users_current_org_idx on users (current_organization_id);
create index users_role_idx        on users (role);
create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

-- Close the circular FK now that both tables exist.
alter table organizations
  add constraint organizations_owner_id_fkey
  foreign key (owner_id) references users (id) on delete set null;

-- ----------------------------------------------------------------------------
-- team_members  (membership join table)
-- ----------------------------------------------------------------------------
create table team_members (
  id              uuid primary key default gen_random_uuid(),
  legacy_id       text unique,
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id         uuid not null references users (id) on delete cascade,
  role            text not null
                    check (role in ('owner', 'admin', 'member', 'viewer')),
  permissions     jsonb not null default '{}'::jsonb,
  status          text not null default 'active'
                    check (status in ('invited', 'active', 'suspended', 'removed')),
  invited_by      uuid references users (id) on delete set null,
  invited_at      timestamptz,
  joined_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index team_members_user_idx       on team_members (user_id);
create index team_members_org_status_idx on team_members (organization_id, status);
create trigger team_members_set_updated_at
  before update on team_members
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- widgets
-- legacy_id = the public embed identifier (string e.g. 'cottonshoppen-widget-456'
-- OR ObjectId hex). Widget-serving endpoints look this up. `prompt`/`theme`
-- hold the legacy Chat Completions shape; `openai`/`appearance`/... hold the
-- current Responses-API shape.
-- ----------------------------------------------------------------------------
create table widgets (
  id              uuid primary key default gen_random_uuid(),
  legacy_id       text unique,
  organization_id uuid references organizations (id) on delete cascade,
  name            text,
  description     text,
  status          text default 'active',
  is_demo_mode    boolean not null default false,
  openai          jsonb not null default '{}'::jsonb,
  appearance      jsonb not null default '{}'::jsonb,
  messages        jsonb not null default '{}'::jsonb,
  branding        jsonb not null default '{}'::jsonb,
  advanced        jsonb not null default '{}'::jsonb,
  analytics       jsonb not null default '{}'::jsonb,
  prompt          text,                                    -- legacy Chat Completions
  theme           jsonb,                                   -- legacy Chat Completions
  created_by      uuid references users (id) on delete set null,
  last_edited_by  uuid references users (id) on delete set null,
  last_edited_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index widgets_org_idx            on widgets (organization_id);
create index widgets_created_by_idx     on widgets (created_by);
create index widgets_org_created_at_idx on widgets (organization_id, created_at desc);
create trigger widgets_set_updated_at
  before update on widgets
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- conversations
-- messages[] kept as JSONB. last_response_id is promoted to a column (indexed)
-- because chat continuation looks conversations up by OpenAI response id.
-- ----------------------------------------------------------------------------
create table conversations (
  id               uuid primary key default gen_random_uuid(),
  legacy_id        text unique,
  widget_id        uuid references widgets (id) on delete cascade,
  widget_legacy_id text,                                   -- embed id as received
  organization_id  uuid references organizations (id) on delete set null,
  session_id       text,
  user_id          text,                                   -- end-user id, not a platform user
  start_time       timestamptz,
  end_time         timestamptz,
  message_count    integer not null default 0,
  messages         jsonb not null default '[]'::jsonb,
  satisfaction     jsonb,                                  -- null until rated
  tags             jsonb not null default '[]'::jsonb,
  metadata         jsonb not null default '{}'::jsonb,
  openai           jsonb not null default '{}'::jsonb,
  last_response_id text,
  live_chat        jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index conversations_widget_idx        on conversations (widget_id);
create index conversations_widget_legacy_idx on conversations (widget_legacy_id);
create index conversations_org_idx           on conversations (organization_id);
create index conversations_session_idx       on conversations (session_id);
create index conversations_last_response_idx on conversations (last_response_id);
create index conversations_created_at_idx    on conversations (created_at);
create index conversations_widget_created_idx on conversations (widget_id, created_at desc);
create trigger conversations_set_updated_at
  before update on conversations
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- demos  (platform sales demos; legacy_id always a custom 'demo-...' string)
-- ----------------------------------------------------------------------------
create table demos (
  id                          uuid primary key default gen_random_uuid(),
  legacy_id                   text unique,
  name                        text,
  description                 text,
  source_widget_id            text,                        -- string or uuid, resolved in app
  source_widget_name          text,
  organization_id             uuid references organizations (id) on delete set null,
  created_by                  uuid references users (id) on delete set null,
  target_client               jsonb not null default '{}'::jsonb,
  demo_settings               jsonb not null default '{}'::jsonb,
  status                      text default 'active',
  converted_to_organization_id uuid references organizations (id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index demos_created_by_idx on demos (created_by);
create index demos_status_idx     on demos (status);
create index demos_converted_idx  on demos (converted_to_organization_id);
create index demos_org_idx        on demos (organization_id);
create trigger demos_set_updated_at
  before update on demos
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- invitations
-- ----------------------------------------------------------------------------
create table invitations (
  id              uuid primary key default gen_random_uuid(),
  legacy_id       text unique,
  organization_id uuid not null references organizations (id) on delete cascade,
  email           citext not null,
  invited_by      uuid references users (id) on delete set null,
  role            text not null
                    check (role in ('owner', 'admin', 'member', 'viewer')),
  token           text not null unique,
  status          text not null default 'pending'
                    check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  accepted_by     uuid references users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index invitations_org_status_idx on invitations (organization_id, status);
create index invitations_email_idx      on invitations (email);
create index invitations_expires_idx    on invitations (expires_at);
create trigger invitations_set_updated_at
  before update on invitations
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- support_requests  (renamed from manual_reviews in Mongo)
-- ----------------------------------------------------------------------------
create table support_requests (
  id              uuid primary key default gen_random_uuid(),
  legacy_id       text unique,
  widget_id       uuid references widgets (id) on delete set null,
  organization_id uuid references organizations (id) on delete cascade,
  conversation_id uuid references conversations (id) on delete set null,
  contact_info    jsonb not null default '{}'::jsonb,
  message         text,
  status          text not null default 'pending'
                    check (status in ('pending', 'in_review', 'completed', 'rejected')),
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index support_requests_org_idx    on support_requests (organization_id);
create index support_requests_widget_idx on support_requests (widget_id);
create index support_requests_status_idx on support_requests (status);
create trigger support_requests_set_updated_at
  before update on support_requests
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- audit_log  (singular, as in Mongo)
-- ----------------------------------------------------------------------------
create table audit_log (
  id              uuid primary key default gen_random_uuid(),
  legacy_id       text unique,
  action          text not null,
  user_id         uuid references users (id) on delete set null,
  organization_id uuid references organizations (id) on delete set null,
  performed_by    uuid references users (id) on delete set null,
  metadata        jsonb not null default '{}'::jsonb,
  timestamp       timestamptz not null default now()
);

create index audit_log_timestamp_idx   on audit_log (timestamp);
create index audit_log_user_idx        on audit_log (user_id, timestamp);
create index audit_log_action_idx      on audit_log (action);
create index audit_log_org_idx         on audit_log (organization_id);

-- ----------------------------------------------------------------------------
-- analytics  (daily rollup per widget; was keyed by string agentId in Mongo)
-- ----------------------------------------------------------------------------
create table analytics (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   text unique,
  widget_id   uuid references widgets (id) on delete cascade,
  date        date not null,
  metrics     jsonb not null default '{}'::jsonb,
  hourly      jsonb not null default '{}'::jsonb,
  session_ids jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (widget_id, date)
);

create trigger analytics_set_updated_at
  before update on analytics
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- satisfaction_analytics  (daily rating rollup per widget)
-- ----------------------------------------------------------------------------
create table satisfaction_analytics (
  id         uuid primary key default gen_random_uuid(),
  legacy_id  text unique,
  widget_id  uuid references widgets (id) on delete cascade,
  date       date not null,
  ratings    jsonb not null default '{}'::jsonb,
  trends     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (widget_id, date)
);

create trigger satisfaction_analytics_set_updated_at
  before update on satisfaction_analytics
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- app_settings  (single-row global settings)
-- ----------------------------------------------------------------------------
create table app_settings (
  id         integer primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger app_settings_set_updated_at
  before update on app_settings
  for each row execute function set_updated_at();
