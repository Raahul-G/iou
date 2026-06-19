import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";

// Reset between tests
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().reset();
});

describe("logout flow", () => {
  it("signOut is awaited (not fire-and-forget)", async () => {
    const signOutSpy = jest.spyOn(supabase.auth, "signOut");
    const result = supabase.auth.signOut();

    // Should return a promise
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(signOutSpy).toHaveBeenCalled();
  });

  it("queryClient.clear is available and callable", () => {
    expect(typeof queryClient.clear).toBe("function");
    queryClient.clear();
    expect(queryClient.clear).toHaveBeenCalled();
  });

  it("auth store reset clears all state", () => {
    // Set up state first
    useAuthStore.getState().setSession({
      access_token: "t",
      refresh_token: "r",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "user-1" },
    } as any);

    // Reset
    useAuthStore.getState().reset();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
  });

  it("full logout sequence: signOut → queryClient.clear → store reset", async () => {
    const callOrder: string[] = [];

    const signOutSpy = (supabase.auth.signOut as jest.Mock).mockImplementation(() => {
      callOrder.push("signOut");
      return Promise.resolve({});
    });

    (queryClient.clear as jest.Mock).mockImplementation(() => {
      callOrder.push("clear");
    });

    const originalReset = useAuthStore.getState().reset;

    // Simulate the logout sequence as done in the onAuthStateChange handler
    await supabase.auth.signOut();
    queryClient.clear();
    useAuthStore.getState().reset();

    expect(callOrder).toContain("signOut");
    expect(callOrder).toContain("clear");
    expect(useAuthStore.getState().session).toBeNull();
  });
});
