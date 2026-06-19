describe("Friend tree scoring", () => {
  type ScoreInput = { creator_id: string; completed_at: string };
  type WishInput = { target_id: string; confirmed_at: string };

  const calcScore = (
    userId: string,
    ious: ScoreInput[],
    wishes: WishInput[],
    fromTs: string,
    toTs?: string
  ) => {
    const iouPts = ious.filter(
      (i) =>
        i.creator_id === userId &&
        (i.completed_at ?? "") >= fromTs &&
        (toTs === undefined || (i.completed_at ?? "") < toTs)
    ).length;
    const wishPts = wishes.filter(
      (w) =>
        w.target_id === userId &&
        (w.confirmed_at ?? "") >= fromTs &&
        (toTs === undefined || (w.confirmed_at ?? "") < toTs)
    ).length * 2;
    return iouPts + wishPts;
  };

  const treeState = (me: number, partner: number): "alive" | "dull" | null => {
    if (me === 0 && partner === 0) return null;
    const high = Math.max(me, partner);
    const low = Math.min(me, partner);
    return low >= Math.floor(high / 2) ? "alive" : "dull";
  };

  describe("scoring rules", () => {
    it("IOU completed = 1 point for creator", () => {
      const ious: ScoreInput[] = [
        { creator_id: "me", completed_at: "2026-06-15T00:00:00Z" },
      ];
      const score = calcScore("me", ious, [], "2026-06-01T00:00:00Z");
      expect(score).toBe(1);
    });

    it("wish confirmed = 2 points for target", () => {
      const wishes: WishInput[] = [
        { target_id: "me", confirmed_at: "2026-06-15T00:00:00Z" },
      ];
      const score = calcScore("me", [], wishes, "2026-06-01T00:00:00Z");
      expect(score).toBe(2);
    });

    it("combined: 2 IOUs + 1 wish = 4 points", () => {
      const ious: ScoreInput[] = [
        { creator_id: "me", completed_at: "2026-06-15T00:00:00Z" },
        { creator_id: "me", completed_at: "2026-06-16T00:00:00Z" },
      ];
      const wishes: WishInput[] = [
        { target_id: "me", confirmed_at: "2026-06-17T00:00:00Z" },
      ];
      const score = calcScore("me", ious, wishes, "2026-06-01T00:00:00Z");
      expect(score).toBe(4);
    });

    it("respects 14-day window boundaries", () => {
      const ious: ScoreInput[] = [
        { creator_id: "me", completed_at: "2026-06-01T00:00:00Z" },
        { creator_id: "me", completed_at: "2026-06-10T00:00:00Z" },
      ];
      // Window from June 5 to June 15 — only second IOU counts
      const score = calcScore("me", ious, [], "2026-06-05T00:00:00Z", "2026-06-15T00:00:00Z");
      expect(score).toBe(1);
    });

    it("does not count other user's IOUs", () => {
      const ious: ScoreInput[] = [
        { creator_id: "them", completed_at: "2026-06-15T00:00:00Z" },
      ];
      const score = calcScore("me", ious, [], "2026-06-01T00:00:00Z");
      expect(score).toBe(0);
    });
  });

  describe("tree state", () => {
    it("alive when both contribute equally", () => {
      expect(treeState(3, 3)).toBe("alive");
    });

    it("alive when low >= floor(high/2)", () => {
      expect(treeState(4, 2)).toBe("alive");
      expect(treeState(5, 3)).toBe("alive");
    });

    it("dull when one falls behind", () => {
      expect(treeState(6, 2)).toBe("dull");
      expect(treeState(10, 1)).toBe("dull");
    });

    it("null when both are zero", () => {
      expect(treeState(0, 0)).toBeNull();
    });

    it("dull when only one contributes", () => {
      expect(treeState(5, 0)).toBe("dull");
    });
  });

  describe("overall tree state resolution", () => {
    it("dead when both windows are zero", () => {
      const currentState = treeState(0, 0);
      const prevState = treeState(0, 0);
      const state =
        currentState !== null ? currentState :
        prevState !== null ? "dull" :
        "dead";
      expect(state).toBe("dead");
    });

    it("dull when current window is zero but previous was active", () => {
      const currentState = treeState(0, 0);
      const prevState = treeState(3, 3);
      const state =
        currentState !== null ? currentState :
        prevState !== null ? "dull" :
        "dead";
      expect(state).toBe("dull");
    });

    it("alive when current window is healthy", () => {
      const currentState = treeState(3, 2);
      const state =
        currentState !== null ? currentState :
        "dead";
      expect(state).toBe("alive");
    });
  });

  describe("null-safe scoring (corrupted data)", () => {
    it("handles null completed_at by treating as empty string", () => {
      const ious: ScoreInput[] = [
        { creator_id: "me", completed_at: "" }, // simulates null
      ];
      const score = calcScore("me", ious, [], "2026-06-01T00:00:00Z");
      // empty string < "2026..." so it won't match
      expect(score).toBe(0);
    });

    it("handles null confirmed_at by treating as empty string", () => {
      const wishes: WishInput[] = [
        { target_id: "me", confirmed_at: "" },
      ];
      const score = calcScore("me", [], wishes, "2026-06-01T00:00:00Z");
      expect(score).toBe(0);
    });
  });
});
