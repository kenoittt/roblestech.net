/**
 * Environment access for Edge Functions.
 *
 * SDS §3.3: the mobile app never sees a Stripe secret key. Everything sensitive is read
 * here, inside the function runtime, and nothing in this module is ever bundled into the
 * app. Set values with `supabase secrets set KEY=value`.
 */

export function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(
      `Missing required secret ${name}. Set it with: supabase secrets set ${name}=…`,
    );
  }
  return value;
}

export function optional(name: string, fallback = ""): string {
  return Deno.env.get(name) ?? fallback;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("SUPABASE_ANON_KEY");
  },
  get serviceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get stripeSecretKey() {
    return required("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
  get cronSecret() {
    return required("CRON_SECRET");
  },
  /** Pepper for hashing signer IPs so the raw address is never stored (FR-5.2). */
  get waiverIpPepper() {
    return required("WAIVER_IP_PEPPER");
  },
  get deepLinkScheme() {
    return optional("APP_DEEP_LINK_SCHEME", "trailmate");
  },
  get expoAccessToken() {
    return optional("EXPO_ACCESS_TOKEN");
  },
};
