import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Expo app config.
 *
 * Everything sensitive stays out of here: the app only ever holds *publishable* keys
 * (SDS §3.3). EXPO_PUBLIC_* values are inlined into the JS bundle at build time, so treat
 * anything named that way as public by definition.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TrailMate",
  slug: "trailmate",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "trailmate", // deep links: trailmate://hike/{id} (SDS §7)
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0F2E1E",
  },

  ios: {
    supportsTablet: false,
    bundleIdentifier: "net.roblestech.trailmate",
    // FR-1.1 — Apple sign-in is mandatory once Google sign-in exists.
    usesAppleSignIn: true,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      // FR-4.1 — "hikes near me". Foreground only; live tracking is deferred (FR-8.4).
      NSLocationWhenInUseUsageDescription:
        "TrailMate uses your location to show hikes near you and to give directions to a trailhead.",
      NSPhotoLibraryUsageDescription:
        "Choose photos for your profile, your hike listings, and your reviews.",
      NSCameraUsageDescription:
        "Take a photo for your profile, a listing, or a review.",
      ITSAppUsesNonExemptEncryption: false,
    },
    associatedDomains: ["applinks:trailmate.app"],
  },

  android: {
    package: "net.roblestech.trailmate",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0F2E1E",
    },
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "https", host: "trailmate.app", pathPrefix: "/hike" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "TrailMate uses your location to show hikes near you.",
      },
    ],
    [
      "expo-notifications",
      { icon: "./assets/notification-icon.png", color: "#0F2E1E" },
    ],
    [
      "@stripe/stripe-react-native",
      {
        // Apple Pay / Google Pay in the Payment Sheet (FR-5.1).
        merchantIdentifier: "merchant.net.roblestech.trailmate",
        enableGooglePay: true,
      },
    ],
    [
      "@rnmapbox/maps",
      {
        // Build-time download token, distinct from the runtime public token. Set
        // MAPBOX_DOWNLOAD_TOKEN as an EAS secret — it must not be committed.
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
  ],

  experiments: { typedRoutes: true },

  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },

  updates: {
    // OTA updates — the reason Expo was chosen for the testing phase (SDS §3.1).
    url: process.env.EAS_PROJECT_ID
      ? `https://u.expo.dev/${process.env.EAS_PROJECT_ID}`
      : undefined,
    fallbackToCacheTimeout: 3000,
  },
  runtimeVersion: { policy: "appVersion" },
});
