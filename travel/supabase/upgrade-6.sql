-- ============================================================================
-- WanderWise upgrade 6 — checkable preset checklist items.
-- Run once in the WanderWise Supabase SQL editor (after upgrade-5.sql).
-- Lets the /checklists preset lists toggle done/not-done like a real
-- checklist, matching the per-trip packing checklist.
-- ============================================================================

alter table public.checklist_preset_items add column if not exists done boolean not null default false;

notify pgrst, 'reload schema';
