/**
 * sign-waiver (SDS §7, FR-5.2)
 *
 * Standalone signing endpoint. Paid checkout signs inline via create-booking-checkout; this
 * exists for the cases that are not a fresh paid checkout:
 *   - re-signing after a waiver template version bump,
 *   - a booking whose PDF generation failed and needs re-issuing,
 *   - future per-guest waivers (SDS §13 Q4) once each attendee has their own record.
 *
 * Also serves the current template on GET-style POST with `{ templateOnly: true }` so the
 * app can render exactly the version it will submit.
 */

import { HttpError, json, readJson, serveJson } from "@shared/http.ts";
import { adminClient, requireUser } from "@shared/supabase.ts";
import { loadWaiverTemplate, signWaiver } from "@shared/waiver.ts";

interface Body {
  templateOnly?: boolean;
  bookingId?: string;
  signedName?: string;
  waiverTemplateVersion?: number;
}

serveJson(async (req) => {
  const { user } = await requireUser(req);
  const body = await readJson<Body>(req).catch(() => ({} as Body));
  const admin = adminClient();

  if (body.templateOnly) {
    const template = await loadWaiverTemplate(admin);
    return json({ version: template.version, bodyMd: template.body_md });
  }

  if (!body.bookingId) throw new HttpError(400, "bookingId is required", "invalid_body");
  if (!body.signedName?.trim()) {
    throw new HttpError(400, "signedName is required", "invalid_body");
  }
  if (!body.waiverTemplateVersion) {
    throw new HttpError(400, "waiverTemplateVersion is required", "invalid_body");
  }

  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, hike_id, hiker_id, status, waiver_id")
    .eq("id", body.bookingId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!booking) throw new HttpError(404, "Booking not found", "booking_not_found");
  if (booking.hiker_id !== user.id) {
    throw new HttpError(403, "This is not your booking", "forbidden");
  }
  if (["cancelled_by_hiker", "cancelled_by_organizer", "refunded"].includes(booking.status)) {
    throw new HttpError(409, "This booking is no longer active", "booking_inactive");
  }

  const { data: current } = await admin
    .from("waivers")
    .select("id, template_version")
    .eq("booking_id", booking.id)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (current && current.template_version === body.waiverTemplateVersion) {
    throw new HttpError(
      409,
      "This booking already has a signed waiver for that template version",
      "already_signed",
    );
  }

  const waiver = await signWaiver({
    admin,
    bookingId: booking.id,
    hikeId: booking.hike_id,
    userId: user.id,
    signedName: body.signedName,
    templateVersion: body.waiverTemplateVersion,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent"),
  });

  return json({
    waiverId: waiver.id,
    templateVersion: waiver.templateVersion,
    documentHash: waiver.documentHash,
    pdfPath: waiver.pdfPath,
  });
});
