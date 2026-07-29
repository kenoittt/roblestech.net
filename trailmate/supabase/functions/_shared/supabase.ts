/**
 * Supabase clients for Edge Functions.
 *
 * Two clients, used for different jobs:
 *   - adminClient()  service role, bypasses RLS. Used for the privileged writes in SDS §7.
 *   - userClient(req) the caller's JWT, RLS applies. Used to resolve *who is asking* and to
 *                     read anything the caller is already entitled to read.
 *
 * A handler should authenticate with userClient and only then write with adminClient, so
 * authorization is never inferred from a client-supplied user id.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@shared/env.ts";
import { HttpError } from "@shared/http.ts";

export function adminClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(req: Request): SupabaseClient {
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    throw new HttpError(401, "Missing Authorization header", "unauthorized");
  }
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface AppUser {
  id: string;
  authId: string;
  displayName: string;
  email: string | null;
  roleFlags: string[];
  stripeCustomerId: string | null;
}

/** Resolves the caller's public.users row, or throws 401. */
export async function requireUser(req: Request): Promise<{ user: AppUser; db: SupabaseClient }> {
  const db = userClient(req);

  const { data: authData, error: authError } = await db.auth.getUser();
  if (authError || !authData.user) {
    throw new HttpError(401, "Not signed in", "unauthorized");
  }

  const { data: profile, error } = await db
    .from("users")
    .select("id, auth_id, display_name, role_flags, stripe_customer_id, deleted_at")
    .eq("auth_id", authData.user.id)
    .maybeSingle();

  if (error) throw new HttpError(500, `Could not load profile: ${error.message}`);
  if (!profile || profile.deleted_at) {
    throw new HttpError(403, "No active profile for this account", "no_profile");
  }

  return {
    db,
    user: {
      id: profile.id as string,
      authId: profile.auth_id as string,
      displayName: profile.display_name as string,
      email: authData.user.email ?? null,
      roleFlags: (profile.role_flags ?? []) as string[],
      stripeCustomerId: (profile.stripe_customer_id ?? null) as string | null,
    },
  };
}

export interface PlatformConfig {
  take_rate_bps: number;
  hiker_fee_bps: number;
  payout_delay_hours: number;
  review_window_days: number;
  waitlist_claim_hours: number;
  min_age: number;
}

/** SDS §9.2 rates. Read from the DB so the ledger and Stripe always agree. */
export async function loadPlatformConfig(admin: SupabaseClient): Promise<PlatformConfig> {
  const { data, error } = await admin
    .from("platform_config")
    .select("take_rate_bps, hiker_fee_bps, payout_delay_hours, review_window_days, waitlist_claim_hours, min_age")
    .single();

  if (error || !data) {
    throw new HttpError(500, `Could not load platform_config: ${error?.message ?? "no row"}`);
  }
  return data as PlatformConfig;
}
