-- ============================================================
-- Migration 004: notifications
--
-- In-app notification feed. Push notifications are V1.1.
-- Notifications are created by database triggers (see migration 005).
--
-- Types:
--   friend_request              → someone sent you a friend request
--   friend_request_accepted     → your request was accepted
--   iou_created                 → you received a new IOU
--   iou_accepted                → your IOU was accepted
--   iou_declined                → your IOU was declined
--   iou_completion_requested    → creator says they did it; confirm?
--   iou_completion_rejected     → receiver didn't confirm yet
--   iou_completed               → IOU fully confirmed complete
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
                    'friend_request',
                    'friend_request_accepted',
                    'iou_created',
                    'iou_accepted',
                    'iou_declined',
                    'iou_completion_requested',
                    'iou_completion_rejected',
                    'iou_completed'
                  )),
  related_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  related_iou_id  UUID REFERENCES ious(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  message         TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_id_idx       ON notifications (user_id);
CREATE INDEX notifications_is_read_idx       ON notifications (user_id, is_read);
CREATE INDEX notifications_created_at_idx    ON notifications (user_id, created_at DESC);
