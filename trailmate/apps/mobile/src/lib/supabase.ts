/**
 * Supabase client.
 *
 * SDS §3.3: the app uses the anon key plus the user's JWT, and nothing else. Every read and
 * write below is filtered by Row-Level Security — the client is not trusted, and does not
 * need to be.
 *
 * Sessions live in SecureStore (Keychain / Keystore) rather than AsyncStorage, because a
 * refresh token is a bearer credential.
 */

import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { env } from "@/lib/env";

// SecureStore has a 2 KB sweet spot per item and is unavailable on web; chunking keeps the
// larger session payloads (JWT + refresh token + user object) working on both platforms.
const CHUNK_SIZE = 1800;

const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const head = await SecureStore.getItemAsync(`${key}.0`);
    if (head === null) return await SecureStore.getItemAsync(key);

    let value = head;
    for (let i = 1; ; i += 1) {
      const chunk = await SecureStore.getItemAsync(`${key}.${i}`);
      if (chunk === null) break;
      value += chunk;
    }
    return value;
  },

  async setItem(key: string, value: string): Promise<void> {
    await this.removeItem(key);
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    for (let i = 0; i * CHUNK_SIZE < value.length; i += 1) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
  },

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
    for (let i = 0; i < 20; i += 1) {
      const chunkKey = `${key}.${i}`;
      if ((await SecureStore.getItemAsync(chunkKey)) === null) break;
      await SecureStore.deleteItemAsync(chunkKey);
    }
  },
};

export const supabase: SupabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // NFR-3: JWT expiry ≤ 1 h with refresh. There is no URL to parse on native.
    detectSessionInUrl: false,
  },
  realtime: {
    // FR-7.2 chat + FR-9.1 notifications. Realtime honours RLS, so a subscriber only
    // receives rows their policies already allow them to read.
    params: { eventsPerSecond: 10 },
  },
});
