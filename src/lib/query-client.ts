import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // 30 seconds
      gcTime: 1000 * 60 * 5,      // 5 minutes
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      // "online" (default) pauses queries when navigator.onLine is false.
      // On a hard browser refresh there is a brief window where the browser
      // reports offline, causing queries to freeze indefinitely. "always" runs
      // queries regardless of the online/offline signal.
      networkMode: "always",
    },
    mutations: {
      retry: 1,
      networkMode: "always",
    },
  },
});
