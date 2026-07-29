/**
 * Public runtime configuration.
 *
 * Everything here is inlined into the JS bundle at build time. If a value would be
 * damaging in an attacker's hands, it does not belong in this file — it belongs in an Edge
 * Function secret (SDS §3.3).
 */

function read(name: string, value: string | undefined, { required = true } = {}): string {
  if (!value) {
    if (required) {
      throw new Error(
        `Missing ${name}. Copy apps/mobile/.env.example to .env and fill it in, ` +
          `then restart the Expo dev server (env vars are read at bundle time).`,
      );
    }
    return "";
  }
  return value;
}

export const env = {
  supabaseUrl: read("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: read("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  stripePublishableKey: read(
    "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    { required: false },
  ),
  mapboxToken: read(
    "EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN",
    process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN,
    { required: false },
  ),
  posthogKey: read("EXPO_PUBLIC_POSTHOG_KEY", process.env.EXPO_PUBLIC_POSTHOG_KEY, {
    required: false,
  }),
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  sentryDsn: read("EXPO_PUBLIC_SENTRY_DSN", process.env.EXPO_PUBLIC_SENTRY_DSN, {
    required: false,
  }),
} as const;

/** Native-only features degrade to a notice in Expo Go rather than crashing. */
export const features = {
  payments: Boolean(env.stripePublishableKey),
  maps: Boolean(env.mapboxToken),
} as const;
