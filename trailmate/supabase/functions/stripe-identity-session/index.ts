/**
 * stripe-identity-session (FR-2.1)
 *
 * Starts a Stripe Identity document + selfie check. Returns the client secret the app hands
 * to the Identity SDK; the outcome arrives via identity.verification_session.* webhooks —
 * the app must never be trusted to report its own verification result.
 */

import { HttpError, json, serveJson } from "@shared/http.ts";
import { adminClient, requireUser } from "@shared/supabase.ts";
import { stripeClient } from "@shared/stripe.ts";

serveJson(async (req) => {
  const { user } = await requireUser(req);
  const admin = adminClient();

  const { data: profile } = await admin
    .from("organizer_profiles")
    .select("user_id, identity_status, stripe_identity_session_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.identity_status === "verified") {
    return json({ alreadyVerified: true });
  }
  if (profile?.identity_status === "processing") {
    throw new HttpError(409, "A verification check is already in progress", "identity_processing");
  }

  const stripe = stripeClient();

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { trailmate_user_id: user.id },
    options: {
      document: {
        require_matching_selfie: true,
        require_live_capture: true,
        allowed_types: ["driving_license", "passport", "id_card"],
      },
    },
  });

  const { error } = await admin
    .from("organizer_profiles")
    .upsert({
      user_id: user.id,
      stripe_identity_session_id: session.id,
      identity_status: "processing",
    }, { onConflict: "user_id" });
  if (error) throw new HttpError(500, error.message);

  return json({
    sessionId: session.id,
    clientSecret: session.client_secret,
    ephemeralKeySecret: session.client_secret,
  });
});
