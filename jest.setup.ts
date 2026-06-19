// Mock Supabase client
jest.mock("@/lib/supabase", () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    then: jest.fn(),
  }));

  return {
    supabase: {
      from: mockFrom,
      auth: {
        signOut: jest.fn().mockResolvedValue({}),
        signInWithPassword: jest.fn().mockResolvedValue({}),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      },
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn().mockResolvedValue({ error: null }),
          list: jest.fn().mockResolvedValue({ data: [] }),
          remove: jest.fn().mockResolvedValue({}),
          getPublicUrl: jest.fn(() => ({ data: { publicUrl: "https://example.com/avatar.jpg" } })),
        })),
      },
    },
  };
});

// Mock expo-router
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
}));

// Mock Sentry
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock analytics
jest.mock("@/lib/analytics", () => ({
  identifyUser: jest.fn(),
  clearUser: jest.fn(),
  trackSignIn: jest.fn(),
  trackSignOut: jest.fn(),
  trackOAuthRedirect: jest.fn(),
  trackOAuthError: jest.fn(),
  trackIOUCreated: jest.fn(),
  trackIOURedeemed: jest.fn(),
  trackWishCreated: jest.fn(),
  trackWishGranted: jest.fn(),
  captureError: jest.fn(),
}));

// Mock query-client
jest.mock("@/lib/query-client", () => ({
  queryClient: {
    clear: jest.fn(),
    invalidateQueries: jest.fn(),
  },
}));
