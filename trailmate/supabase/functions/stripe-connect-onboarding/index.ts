/**
 * stripe-connect-onboarding (FR-2.2)
 *
 * Creates (or reuses) the organizer's Stripe Connect Express account and returns a hosted
 * AccountLink. Bank details, KYC and tax info are collected by Stripe, never by us — which
 * is the whole point of Express for a marketplace at this stage.
 *
 * The `charges_enabled` / `payouts_enabled` flags this unlocks are written by the
 * account.updated webhook, not by the return URL, because a user can close the browser
 * before being redirected back.
 */

import { HttpError, json, readJson, serveJson } from "@shared/http.ts";
import { adminClient, requireUser } from "@shared/supabase.ts";
import { stripeClient } from "@shared/stripe.ts";
import { env } from "@shared/env.ts";

interface Body {
  /** ISO-3166-1 alpha-2. SDS §13 Q1 — single launch country in v1. */
  country?: string;
  /** "onboarding" for first run, "dashboard" for an Express login link. */
  mode?: "onboarding" | "dashboard";
}

serveJson(async (req) => {
  const { user } = await requireUser(req);
  const { country = "US", mode = "onboarding" } = await readJson<Body>(req).catch(() => ({} as Body));

  const admin = adminClient();

  // FR-1.3 — "Become an organizer" upgrades the account.
  const { data: existing } = await admin
    .from("organizer_profiles")
    .select("user_id, stripe_account_id, details_submitted")
    .eq("user_id", user.id)
    .maybeSingle();

  const stripe = stripeClient();
  let accountId = existing?.stripe_account_id ?? null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country,
      email: user.email ?? undefined,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          // Stripe pays out on its rolling schedule; TrailMate's own 24 h dispute window is
          // enforced by the payouts_ledger release job, not by Stripe's schedule.
          schedule: { interval: "daily", delay_days: "minimum" },
        },
      },
      metadata: { trailmate_user_id: user.id },
    }, { idempotencyKey: `connect-account-${user.id}` });

    accountId = account.id;

    const { error } = await admin
      .from("organizer_profiles")
      .upsert(
        { user_id: user.id, stripe_account_id: accountId, status: "pending" },
        { onConflict: "user_id" },
      );
    if (error) throw new HttpError(500, error.message);

    // Grant the organizer role so hikes_insert_own lets them create drafts while payout
    // onboarding is still in progress. Publishing stays blocked by app.can_publish().
    const { data: profile } = await admin
      .from("users")
      .select("role_flags")
      .eq("id", user.id)
      .single();

    const roles = new Set<string>(profile?.role_flags ?? ["hiker"]);
    roles.add("organizer");
    await admin.from("users").update({ role_flags: [...roles] }).eq("id", user.id);
  }

  const scheme = env.deepLinkScheme;

  if (mode === "dashboard") {
    if (!existing?.details_submitted) {
      throw new HttpError(409, "Finish payout onboarding first", "onboarding_incomplete");
    }
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return json({ url: loginLink.url, accountId, kind: "dashboard" });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    // Expo deep links (FR-7.4 universal links); the app polls organizer_profiles on return.
    refresh_url: `${scheme}://organizer/onboarding?status=refresh`,
    return_url: `${scheme}://organizer/onboarding?status=return`,
    collection_options: { fields: "eventually_due" },
  });

  return json({ url: link.url, accountId, expiresAt: link.expires_at, kind: "onboarding" });
});
