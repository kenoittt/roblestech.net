/**
 * Typed wrappers around the Edge Functions listed in SDS §7.
 *
 * Every money mutation in the app goes through one of these. If you find yourself writing
 * to `bookings` or `payouts_ledger` directly from a screen, that is the bug — RLS will
 * reject it, and it should.
 */

import { supabase } from "@/lib/supabase";
import type { CancellationPolicy } from "@/types/database";

export class FunctionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FunctionError";
  }
}

async function invoke<TResponse>(name: string, body?: unknown): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });

  if (error) {
    // supabase-js hides the response body on non-2xx; dig it out so the UI can show the
    // real reason ("this hike is full") instead of a generic failure.
    let code = "request_failed";
    let message = error.message;

    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        const payload = (await context.json()) as { error?: string; message?: string };
        code = payload.error ?? code;
        message = payload.message ?? message;
      } catch {
        // Body was not JSON — keep the transport-level message.
      }
    }
    throw new FunctionError(code, message);
  }

  return data as TResponse;
}

export interface PriceBreakdown {
  unitPriceCents: number;
  qty: number;
  subtotalCents: number;
  hikerFeeCents: number;
  totalChargeCents: number;
  platformFeeCents: number;
  organizerNetCents: number;
}

export interface CheckoutResult {
  free: boolean;
  bookingId: string;
  waiverId: string;
  paymentIntentId?: string;
  clientSecret?: string;
  customerId?: string;
  ephemeralKeySecret?: string;
  breakdown: PriceBreakdown;
}

/** FR-5.1 / FR-5.2 — signing the waiver is part of the same call that creates the intent. */
export function createBookingCheckout(input: {
  hikeId: string;
  qty: number;
  signedName: string;
  waiverTemplateVersion: number;
}): Promise<CheckoutResult> {
  return invoke<CheckoutResult>("create-booking-checkout", input);
}

export function fetchWaiverTemplate(): Promise<{ version: number; bodyMd: string }> {
  return invoke<{ version: number; bodyMd: string }>("sign-waiver", { templateOnly: true });
}

export function signWaiver(input: {
  bookingId: string;
  signedName: string;
  waiverTemplateVersion: number;
}): Promise<{ waiverId: string; templateVersion: number; pdfPath: string | null }> {
  return invoke("sign-waiver", input);
}

/** FR-5.4 — the refund amount comes back from the server, never computed on device. */
export function cancelBooking(input: {
  bookingId: string;
  reason?: string;
}): Promise<{
  bookingId: string;
  status: string;
  refundCents: number;
  paidCents: number;
  policy: CancellationPolicy;
}> {
  return invoke("cancel-booking", input);
}

/** FR-5.5 — organizer or weather cancellation; always a full refund. */
export function cancelHike(input: {
  hikeId: string;
  reason: string;
  weather?: boolean;
}): Promise<{ hikeId: string; refundedBookings: number }> {
  return invoke("cancel-hike", input);
}

/** FR-2.2 — returns a hosted Stripe Connect onboarding URL to open in a browser. */
export function startConnectOnboarding(input?: {
  country?: string;
  mode?: "onboarding" | "dashboard";
}): Promise<{ url: string; accountId: string; kind: string }> {
  return invoke("stripe-connect-onboarding", input ?? {});
}

/** FR-2.1 — document + selfie verification session for the Stripe Identity SDK. */
export function startIdentityVerification(): Promise<{
  sessionId?: string;
  clientSecret?: string;
  alreadyVerified?: boolean;
}> {
  return invoke("stripe-identity-session", {});
}

/** FR-1.4 — in-app account deletion (App Store requirement). */
export function deleteAccount(): Promise<{ deleted: boolean }> {
  return invoke("delete-account", { confirm: "DELETE" });
}
