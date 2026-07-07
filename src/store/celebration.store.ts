import { create } from "zustand";

export type CelebrationKind =
  | "iou_sent"
  | "iou_completed"
  | "wish_sent"
  | "wish_accepted"
  | "wish_confirmed"
  | "friend_added";

export type Celebration = {
  kind: CelebrationKind;
  /** Tree points earned, shown as an animated "+N" chip */
  points?: number;
  /** Optional name to personalise the subtitle (e.g. the friend) */
  name?: string;
  /** Monotonic id so back-to-back celebrations of the same kind still re-render */
  id: number;
};

type CelebrationState = {
  current: Celebration | null;
  celebrate: (kind: CelebrationKind, opts?: { points?: number; name?: string }) => void;
  dismiss: () => void;
};

let nextId = 1;

export const useCelebrationStore = create<CelebrationState>((set) => ({
  current: null,
  celebrate: (kind, opts) =>
    set({ current: { kind, points: opts?.points, name: opts?.name, id: nextId++ } }),
  dismiss: () => set({ current: null }),
}));

/** Convenience for non-component call sites */
export const celebrate = (
  kind: CelebrationKind,
  opts?: { points?: number; name?: string }
) => useCelebrationStore.getState().celebrate(kind, opts);
