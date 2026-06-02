import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// SSR-safe localStorage adapter — returns null during Node.js static export,
// works normally in the browser at runtime.
const webStorage = {
  getItem: (key: string) =>
    Promise.resolve(
      typeof window !== "undefined" ? localStorage.getItem(key) : null
    ),
  setItem: (key: string, value: string) => {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window !== "undefined") localStorage.removeItem(key);
    return Promise.resolve();
  },
};

// Web-specific Supabase client — no react-native-url-polyfill import.
// The URL polyfill overrides the global URL object and breaks Supabase's
// internal fetch on web, causing queries to hang indefinitely.
// Metro automatically resolves *.web.ts before *.ts for web builds.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: webStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
