-- Account-level onboarding completion. Nullable: NULL = user has not finished
-- the first-run tour. Backfill grandfathers every existing user so the tour
-- only ever shows to accounts created after this migration.
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

update public.profiles
  set onboarding_completed_at = now()
  where onboarding_completed_at is null;
