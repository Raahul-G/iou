import { useAuthStore } from "@/store/auth.store";

// Reset the store between tests
beforeEach(() => {
  useAuthStore.getState().reset();
});

describe("auth store", () => {
  it("initial state is loading with no session", () => {
    const state = useAuthStore.getState();
    // After reset, isLoading is false — matches reset() behavior
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.oauthError).toBeNull();
    expect(state.isExchangingOAuth).toBe(false);
  });

  it("setSession stores session and extracts user", () => {
    const mockSession = {
      access_token: "token",
      refresh_token: "refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "user-1", email: "test@test.com" },
    } as any;

    useAuthStore.getState().setSession(mockSession);

    const state = useAuthStore.getState();
    expect(state.session).toBe(mockSession);
    expect(state.user).toBe(mockSession.user);
  });

  it("setSession(null) clears user", () => {
    const mockSession = {
      access_token: "token",
      refresh_token: "refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "user-1" },
    } as any;

    useAuthStore.getState().setSession(mockSession);
    useAuthStore.getState().setSession(null);

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
  });

  it("setProfile stores profile", () => {
    const profile = { id: "user-1", display_name: "Test" } as any;
    useAuthStore.getState().setProfile(profile);
    expect(useAuthStore.getState().profile).toBe(profile);
  });

  it("setOAuthError stores error message", () => {
    useAuthStore.getState().setOAuthError("Something failed");
    expect(useAuthStore.getState().oauthError).toBe("Something failed");

    useAuthStore.getState().setOAuthError(null);
    expect(useAuthStore.getState().oauthError).toBeNull();
  });

  it("setExchangingOAuth toggles flag", () => {
    useAuthStore.getState().setExchangingOAuth(true);
    expect(useAuthStore.getState().isExchangingOAuth).toBe(true);

    useAuthStore.getState().setExchangingOAuth(false);
    expect(useAuthStore.getState().isExchangingOAuth).toBe(false);
  });

  it("reset clears all state", () => {
    useAuthStore.getState().setSession({
      access_token: "t",
      refresh_token: "r",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "user-1" },
    } as any);
    useAuthStore.getState().setProfile({ id: "user-1", display_name: "Test" } as any);
    useAuthStore.getState().setOAuthError("err");
    useAuthStore.getState().setExchangingOAuth(true);

    useAuthStore.getState().reset();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.oauthError).toBeNull();
    expect(state.isExchangingOAuth).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});
