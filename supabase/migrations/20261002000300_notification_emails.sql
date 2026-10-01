-- =============================================================================
-- Notification emails: each notification is emailed once, by the app, right
-- after the change that created it. emailed_at marks it as handled (sent, or
-- skipped because the person turned emails off).
-- =============================================================================
alter table public.ppm_notifications add column if not exists emailed_at timestamptz;
create index if not exists ppm_notifications_unsent_idx
  on public.ppm_notifications (created_at)
  where emailed_at is null;

-- Notifications from before this change are not emailed after the fact.
update public.ppm_notifications set emailed_at = created_at where emailed_at is null;
