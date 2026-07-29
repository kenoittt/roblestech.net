/**
 * Root layout: providers, then the navigation stack.
 *
 * Auth gating happens in the group layouts ((tabs)/_layout redirects out, (auth)/_layout
 * redirects in) rather than here, so a deep link to trailmate://hike/{id} survives a cold
 * start on a signed-out device — the user signs in and lands where the link pointed.
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as Notifications from "expo-notifications";
import { AuthProvider } from "@/lib/auth";
import { env, features } from "@/lib/env";
import { colors } from "@/theme/tokens";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      // NFR-5: hikes happen out of coverage, so cached data must stay usable for a while.
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // FR-9.1 — Android needs an explicit channel before any notification will show.
    void Notifications.setNotificationChannelAsync("default", {
      name: "TrailMate",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: colors.forest,
    });
  }, []);

  const content = (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.forest,
              headerTitleStyle: { fontWeight: "600" },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="hike/[id]/index" options={{ title: "" }} />
            <Stack.Screen name="hike/[id]/chat" options={{ title: "Hike chat" }} />
            <Stack.Screen
              name="checkout/[hikeId]"
              options={{ title: "Checkout", presentation: "modal" }}
            />
            <Stack.Screen name="organizer/index" options={{ title: "Organizer" }} />
            <Stack.Screen name="organizer/onboarding" options={{ title: "Get set up" }} />
          </Stack>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  // FR-5.1 — Stripe's Payment Sheet needs native code, so it is absent in Expo Go. The app
  // still runs there; checkout tells the user to use a development build.
  return features.payments ? (
    <StripeProvider
      publishableKey={env.stripePublishableKey}
      merchantIdentifier="merchant.net.roblestech.trailmate"
      urlScheme="trailmate"
    >
      {content}
    </StripeProvider>
  ) : (
    content
  );
}
