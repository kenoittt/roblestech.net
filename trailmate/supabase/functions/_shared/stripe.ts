/**
 * Stripe client and money helpers.
 *
 * Deno has no Node crypto, so webhook verification must use the SubtleCrypto provider and
 * the async `constructEventAsync`. Using the sync variant will always fail here.
 */

import Stripe from "stripe";
import { env } from "@shared/env.ts";

export function stripeClient(): Stripe {
  return new Stripe(env.stripeSecretKey, {
    apiVersion: "2025-08-27.basil",
    // Fetch-based client — the default Node HTTP client is unavailable in Deno.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

const cryptoProvider = Stripe.createSubtleCryptoProvider();

export async function verifyWebhook(
  stripe: Stripe,
  rawBody: string,
  signature: string | null,
): Promise<Stripe.Event> {
  if (!signature) throw new Error("Missing stripe-signature header");
  return await stripe.webhooks.constructEventAsync(
    rawBody,
    signature,
    env.stripeWebhookSecret,
    undefined,
    cryptoProvider,
  );
}

/** Commission on a gross amount, rounded half-up. Mirrors public.commission_cents(). */
export function commissionCents(grossCents: number, takeRateBps: number): number {
  return Math.floor((grossCents * takeRateBps) / 10000 + 0.5);
}

/** Optional hiker-side service fee — 0 bps at launch (SDS §9.2). */
export function hikerFeeCents(subtotalCents: number, hikerFeeBps: number): number {
  return Math.floor((subtotalCents * hikerFeeBps) / 10000 + 0.5);
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

/**
 * SDS §9.1 destination-charge split.
 *
 *   total charged to hiker = spot price × qty + hiker service fee
 *   application_fee_amount = commission on the spot subtotal + the whole hiker fee
 *   organizer receives     = subtotal − commission
 */
export function priceBooking(
  unitPriceCents: number,
  qty: number,
  cfg: { take_rate_bps: number; hiker_fee_bps: number },
): PriceBreakdown {
  const subtotalCents = unitPriceCents * qty;
  const hikerFee = hikerFeeCents(subtotalCents, cfg.hiker_fee_bps);
  const commission = commissionCents(subtotalCents, cfg.take_rate_bps);

  return {
    unitPriceCents,
    qty,
    subtotalCents,
    hikerFeeCents: hikerFee,
    totalChargeCents: subtotalCents + hikerFee,
    platformFeeCents: commission + hikerFee,
    organizerNetCents: subtotalCents - commission,
  };
}
