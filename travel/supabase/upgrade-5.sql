-- ============================================================================
-- WanderWise upgrade 5 — connecting-flight details on trip_legs.
-- Run once in the WanderWise Supabase SQL editor (after upgrade-4.sql).
-- arrival_airport/departure_airport are left in place (legacy, unused by the
-- UI going forward — destination + connecting-flight fields replace them).
-- ============================================================================

alter table public.trip_legs add column if not exists has_connection boolean not null default false;
alter table public.trip_legs add column if not exists connection_airport text;
alter table public.trip_legs add column if not exists connection_airline text;
alter table public.trip_legs add column if not exists connection_flight_no text;

notify pgrst, 'reload schema';
