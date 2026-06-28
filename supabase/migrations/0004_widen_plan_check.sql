-- ============================================================================
-- Widen organizations.plan check to include 'enterprise'.
-- The production data contains plan='enterprise' (distinct values observed:
-- basic, enterprise, free, growth, pro), which the initial constraint omitted.
-- ============================================================================

alter table organizations
  drop constraint if exists organizations_plan_check;

alter table organizations
  add constraint organizations_plan_check
  check (plan in ('free', 'basic', 'growth', 'pro', 'enterprise'));
