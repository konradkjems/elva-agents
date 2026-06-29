-- ============================================================================
-- In-platform prompt management + multi-provider model support (core engine).
--
-- WHY: Until now a widget's AI behaviour (system prompt, model, provider) lived
-- entirely on platform.openai.com, referenced only by widget.openai.promptId
-- (a `pmpt_…` id). This migration brings prompt management INTO the platform and
-- makes the model/provider selectable, so widgets can run on OpenAI, Anthropic,
-- Google, etc. via the Vercel AI SDK + AI Gateway.
--
-- MODEL: versioned prompts. `prompts` holds one logical prompt per row (org- and
-- optionally widget-scoped) and points at its active version. `prompt_versions`
-- holds immutable snapshots (system prompt + provider + model + params). Editing
-- creates a new version; rolling back just repoints `current_version_id`.
--
-- COEXISTENCE: existing `pmpt_…` widgets are untouched. A widget opts into the new
-- engine via widgets.ai = { engine: 'in-platform' } + widgets.prompt_id. The chat
-- engine resolves the path from those columns (see lib/chat/prompts.js).
--
-- RLS: enabled with no policies (deny-by-default), consistent with 0007. The
-- service-role client (lib/supabase/admin.js) has BYPASSRLS and keeps working.
-- ============================================================================

-- One logical prompt, org-scoped, pointing at its active version.
create table prompts (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations (id) on delete cascade,
  widget_id          uuid references widgets (id) on delete set null,
  name               text not null,
  description        text,
  current_version_id uuid,                       -- FK closed after prompt_versions exists
  created_by         uuid references users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index prompts_org_idx    on prompts (organization_id);
create index prompts_widget_idx on prompts (widget_id);
create trigger prompts_set_updated_at
  before update on prompts
  for each row execute function set_updated_at();

-- Immutable version snapshots. version is monotonic per prompt, starting at 1.
create table prompt_versions (
  id            uuid primary key default gen_random_uuid(),
  prompt_id     uuid not null references prompts (id) on delete cascade,
  version       integer not null,
  system_prompt text not null,
  provider      text not null,                   -- 'openai' | 'anthropic' | 'google'
  model         text not null,                   -- registry key, e.g. 'gpt-4o-mini'
  temperature   numeric,                         -- null = provider default
  max_tokens    integer,                         -- null = provider default
  config        jsonb not null default '{}'::jsonb,  -- tools / top_p / future params
  created_by    uuid references users (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (prompt_id, version)
);
create index prompt_versions_prompt_idx on prompt_versions (prompt_id);

-- Close the circular FK (mirrors the organizations/users pattern in 0001).
alter table prompts
  add constraint prompts_current_version_fkey
  foreign key (current_version_id) references prompt_versions (id) on delete set null;

-- Widget → prompt binding. Coexists with the legacy openai.promptId (`pmpt_…`).
alter table widgets
  add column if not exists prompt_id      uuid references prompts (id) on delete set null,
  add column if not exists prompt_version text,            -- 'latest' | '<n>'
  add column if not exists ai             jsonb not null default '{}'::jsonb;  -- { engine: 'in-platform' }
create index if not exists widgets_prompt_id_idx on widgets (prompt_id);

-- Deny-by-default RLS (consistent with 0007; service-role bypasses).
alter table prompts         enable row level security;
alter table prompt_versions enable row level security;
