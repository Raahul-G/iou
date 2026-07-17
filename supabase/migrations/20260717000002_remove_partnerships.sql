-- ============================================================
-- Migration: Remove partnerships feature
--
-- The partner feature (Water/Fertilizer roles, tree planting)
-- has been removed. The regular friend tree already covers
-- this use case for all friends.
-- ============================================================

-- ── 1. Drop triggers first (depend on functions) ──────────────

DROP TRIGGER IF EXISTS on_partner_invite_accepted ON partnerships;
DROP TRIGGER IF EXISTS on_partner_invite_created  ON partnerships;
DROP TRIGGER IF EXISTS partnerships_activated_at  ON partnerships;

-- ── 2. Drop functions ─────────────────────────────────────────

DROP FUNCTION IF EXISTS notify_partner_invite_accepted();
DROP FUNCTION IF EXISTS notify_partner_invite();
DROP FUNCTION IF EXISTS handle_partnership_activated();

-- ── 3. Remove related_partnership_id column from notifications ─
-- (drops the FK constraint referencing the partnerships table)

ALTER TABLE notifications DROP COLUMN IF EXISTS related_partnership_id;

-- ── 4. Delete any existing partner notification rows ──────────
-- Required before the constraint can be narrowed to exclude them.

DELETE FROM notifications
WHERE type IN ('partner_invite', 'partner_invite_accepted');

-- ── 5. Remove partner notification types from constraint ───────

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'friend_request',
    'friend_request_accepted',
    'iou_created',
    'iou_accepted',
    'iou_declined',
    'iou_completion_requested',
    'iou_completion_rejected',
    'iou_completed',
    'wish_created',
    'wish_accepted',
    'wish_not_right_now',
    'wish_fulfilled',
    'wish_confirmed',
    'wish_withdrawn',
    'tree_dull',
    'friend_onboarding'
  ));

-- ── 6. Drop the partnerships table ────────────────────────────

DROP TABLE IF EXISTS partnerships;
