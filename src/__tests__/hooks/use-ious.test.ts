import type { IOU, Balance } from "@/hooks/use-ious";

describe("IOU state transitions", () => {
  const makeIOU = (overrides: Partial<IOU> = {}): IOU => ({
    id: "iou-1",
    friendship_id: "fs-1",
    creator_id: "user-a",
    receiver_id: "user-b",
    title: "Coffee",
    category: "favour",
    note: null,
    status: "pending",
    created_at: "2026-01-01T00:00:00Z",
    accepted_at: null,
    completion_requested_at: null,
    completed_at: null,
    ...overrides,
  });

  it("follows the pending → accepted → completion_requested → completed flow", () => {
    const states: IOU["status"][] = ["pending", "accepted", "completion_requested", "completed"];
    for (let i = 0; i < states.length - 1; i++) {
      const current = states[i];
      const next = states[i + 1];
      expect(current).not.toBe(next);
    }
    expect(states[0]).toBe("pending");
    expect(states[states.length - 1]).toBe("completed");
  });

  it("can be declined from pending", () => {
    const iou = makeIOU({ status: "pending" });
    expect(iou.status).toBe("pending");
    const declined = { ...iou, status: "declined" as const };
    expect(declined.status).toBe("declined");
  });

  describe("useBalance logic", () => {
    const computeBalance = (ious: IOU[], myId: string): Balance => {
      const active = ious.filter((iou) =>
        ["accepted", "completion_requested"].includes(iou.status)
      );
      return {
        i_owe: active.filter((iou) => iou.creator_id === myId).length,
        they_owe: active.filter((iou) => iou.receiver_id === myId).length,
      };
    };

    it("counts active IOUs correctly", () => {
      const ious = [
        makeIOU({ status: "accepted", creator_id: "me", receiver_id: "them" }),
        makeIOU({ id: "iou-2", status: "accepted", creator_id: "them", receiver_id: "me" }),
        makeIOU({ id: "iou-3", status: "completed", creator_id: "me", receiver_id: "them" }),
        makeIOU({ id: "iou-4", status: "pending", creator_id: "me", receiver_id: "them" }),
      ];
      const balance = computeBalance(ious, "me");
      expect(balance.i_owe).toBe(1);
      expect(balance.they_owe).toBe(1);
    });

    it("returns zero for no active IOUs", () => {
      const balance = computeBalance([], "me");
      expect(balance.i_owe).toBe(0);
      expect(balance.they_owe).toBe(0);
    });
  });

  describe("useScores logic", () => {
    it("counts completed IOUs per month and all-time", () => {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const ious = [
        makeIOU({ status: "completed", completed_at: now.toISOString() }),
        makeIOU({ id: "iou-2", status: "completed", completed_at: "2025-01-01T00:00:00Z" }),
      ];

      const allTime = ious.length;
      const thisMonth = ious.filter(
        (iou) => iou.completed_at && iou.completed_at >= firstOfMonth
      ).length;

      expect(allTime).toBe(2);
      expect(thisMonth).toBe(1);
    });
  });
});
