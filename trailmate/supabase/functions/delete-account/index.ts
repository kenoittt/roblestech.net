/**
 * delete-account (FR-1.4)
 *
 * In-app account deletion — an App Store requirement, not a nice-to-have.
 *
 * NFR-4 pulls in the opposite direction: waiver and payment records must be retained for
 * 7 years. So this anonymises rather than hard-deletes: PII is scrubbed, reviews lose their
 * author, and bookings / waivers / payouts_ledger stay intact and attached to a
 * now-anonymous user row.
 *
 * Refuses while the user has skin in the game — an upcoming hike, or held earnings — since
 * deleting then would strand a refund or a payout.
 */

import { HttpError, json, readJson, serveJson } from "@shared/http.ts";
import { adminClient, requireUser } from "@shared/supabase.ts";

interface Body {
  /** Must be the literal string "DELETE" — guards against an accidental call. */
  confirm: string;
}

serveJson(async (req) => {
  const { user } = await requireUser(req);
  const { confirm } = await readJson<Body>(req);

  if (confirm !== "DELETE") {
    throw new HttpError(400, 'Set confirm to "DELETE" to proceed', "confirmation_required");
  }

  const admin = adminClient();
  const blockers: string[] = [];

  const { count: upcoming } = await admin
    .from("bookings")
    .select("id, hikes!inner(start_at, status)", { count: "exact", head: true })
    .eq("hiker_id", user.id)
    .in("status", ["pending_payment", "confirmed"])
    .gt("hikes.start_at", new Date().toISOString());

  if ((upcoming ?? 0) > 0) {
    blockers.push(`${upcoming} upcoming booking(s) — cancel them first`);
  }

  const { count: activeListings } = await admin
    .from("hikes")
    .select("id", { count: "exact", head: true })
    .eq("organizer_id", user.id)
    .in("status", ["published", "full"]);

  if ((activeListings ?? 0) > 0) {
    blockers.push(`${activeListings} active listing(s) — cancel them first`);
  }

  const { count: heldPayouts } = await admin
    .from("payouts_ledger")
    .select("id", { count: "exact", head: true })
    .eq("organizer_id", user.id)
    .eq("status", "held");

  if ((heldPayouts ?? 0) > 0) {
    blockers.push(`${heldPayouts} payout(s) still in the dispute window`);
  }

  if (blockers.length > 0) {
    throw new HttpError(409, `Cannot delete yet: ${blockers.join("; ")}`, "deletion_blocked");
  }

  const { error: anonError } = await admin.rpc("anonymize_user", { p_user_id: user.id });
  if (anonError) throw new HttpError(500, anonError.message);

  // Revoke credentials last: after this the JWT is dead, so nothing above can be retried.
  const { error: authError } = await admin.auth.admin.deleteUser(user.authId, true);
  if (authError) {
    console.error(`profile ${user.id} anonymised but auth user deletion failed`, authError);
    throw new HttpError(
      500,
      "Your profile data was removed but sign-in credentials could not be deleted. Support has been notified.",
      "partial_deletion",
    );
  }

  return json({ deleted: true, retained: ["bookings", "waivers", "payouts_ledger"] });
});
