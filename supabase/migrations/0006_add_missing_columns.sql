-- ============================================================================
-- Add widget/organization fields that exist in the production data but were
-- omitted from the initial schema (lossless-migration fix).
--
-- widgets: behavior, consent, demo_settings, imageupload, integrations,
--          manual_review, satisfaction, timezone
-- organizations: last_edited_at, last_edited_by, use_custom_theme
-- ============================================================================

alter table widgets
  add column if not exists behavior      jsonb not null default '{}'::jsonb,
  add column if not exists consent       jsonb not null default '{}'::jsonb,
  add column if not exists demo_settings  jsonb not null default '{}'::jsonb,
  add column if not exists imageupload    jsonb not null default '{}'::jsonb,
  add column if not exists integrations   jsonb not null default '{}'::jsonb,
  add column if not exists manual_review  jsonb not null default '{}'::jsonb,
  add column if not exists satisfaction   jsonb not null default '{}'::jsonb,
  add column if not exists timezone       text;

alter table organizations
  add column if not exists last_edited_at  timestamptz,
  add column if not exists last_edited_by  uuid references users (id) on delete set null,
  add column if not exists use_custom_theme boolean;
