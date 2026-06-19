import type { Wish, WishStatus } from "@/hooks/use-wishes";

describe("Wish state machine", () => {
  const makeWish = (overrides: Partial<Wish> = {}): Wish => ({
    id: "wish-1",
    friendship_id: "fs-1",
    creator_id: "user-a",
    target_id: "user-b",
    text: "Make me dinner",
    mood: "romantic",
    status: "active",
    decline_text: null,
    decline_mood: null,
    thank_you_note: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    accepted_at: null,
    held_at: null,
    fulfilled_at: null,
    confirmed_at: null,
    withdrawn_at: null,
    ...overrides,
  });

  const VALID_TRANSITIONS: Record<WishStatus, WishStatus[]> = {
    active: ["accepted", "on_hold", "withdrawn"],
    accepted: ["fulfilled", "withdrawn"],
    on_hold: ["accepted", "withdrawn"],
    fulfilled: ["confirmed"],
    confirmed: [],
    withdrawn: [],
  };

  it("active → accepted is valid", () => {
    const wish = makeWish({ status: "active" });
    expect(VALID_TRANSITIONS[wish.status]).toContain("accepted");
  });

  it("active → on_hold is valid", () => {
    const wish = makeWish({ status: "active" });
    expect(VALID_TRANSITIONS[wish.status]).toContain("on_hold");
  });

  it("active → withdrawn is valid", () => {
    const wish = makeWish({ status: "active" });
    expect(VALID_TRANSITIONS[wish.status]).toContain("withdrawn");
  });

  it("accepted → fulfilled is valid", () => {
    const wish = makeWish({ status: "accepted" });
    expect(VALID_TRANSITIONS[wish.status]).toContain("fulfilled");
  });

  it("fulfilled → confirmed is valid", () => {
    const wish = makeWish({ status: "fulfilled" });
    expect(VALID_TRANSITIONS[wish.status]).toContain("confirmed");
  });

  it("confirmed is terminal", () => {
    expect(VALID_TRANSITIONS.confirmed).toHaveLength(0);
  });

  it("withdrawn is terminal", () => {
    expect(VALID_TRANSITIONS.withdrawn).toHaveLength(0);
  });

  it("on_hold → accepted is valid (reconsider)", () => {
    const wish = makeWish({ status: "on_hold" });
    expect(VALID_TRANSITIONS[wish.status]).toContain("accepted");
  });

  it("full lifecycle: active → accepted → fulfilled → confirmed", () => {
    let wish = makeWish({ status: "active" });
    const transitions: WishStatus[] = ["accepted", "fulfilled", "confirmed"];

    for (const next of transitions) {
      expect(VALID_TRANSITIONS[wish.status]).toContain(next);
      wish = { ...wish, status: next };
    }

    expect(wish.status).toBe("confirmed");
    expect(VALID_TRANSITIONS[wish.status]).toHaveLength(0);
  });
});
