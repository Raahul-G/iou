-- ============================================================
-- Migration: partnerships
--
-- A partnership is a special relationship between two friends.
-- One takes the Water role 💧 (User A) — fulfills Wishes, gives IOUs.
-- One takes the Fertilizer role 🌿 (User B) — creates Wishes, gives IOUs.
-- Roles are tags only; both users are equal players in the app.
--
-- The inviter proposes the role assignment for both parties.
-- The invitee accepts (status → active) or declines (deletes row).
-- Each user may have at most one active partnership at any time.
--
-- created_at = the anniversary date used by the tree blossom feature.
-- activated_at = when the invite was accepted.
-- ============================================================

-- ============================================================
-- Step 1: Extend notifications type constraint
-- Must happen before any trigger tries to insert new types.
-- ============================================================

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    -- existing types (unchanged)
    'friend_request',
    'friend_request_accepted',
    'iou_created',
    'iou_accepted',
    'iou_declined',
    'iou_completion_requested',
    'iou_completion_rejected',
    'iou_completed',
    -- partnership types (this migration)
    'partner_invite',
    'partner_invite_accepted',
    -- wish types (added in next migration — constraint is just a string check)
    'wish_created',
    'wish_accepted',
    'wish_not_right_now',
    'wish_fulfilled',
    'wish_confirmed',
    'wish_withdrawn'
  ));

-- ============================================================
-- Step 2: partnerships table
-- ============================================================

CREATE TABLE partnerships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  water_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fertilizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- inviter_id tracks who sent the invite (must be water or fertilizer)
  -- used for RLS: only the non-inviter (invitee) can accept
  inviter_id    UUID NOT NULL REFERENCES profiles(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'active')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at  TIMESTAMPTZ,   -- set when status → active; also the anniversary date

  CONSTRAINT no_self_partnership    CHECK (water_id <> fertilizer_id),
  CONSTRAINT unique_partnership     UNIQUE (water_id, fertilizer_id),
  CONSTRAINT inviter_is_participant CHECK (inviter_id = water_id OR inviter_id = fertilizer_id)
);

-- Each user can have at most one active partnership
CREATE UNIQUE INDEX one_active_partnership_water
  ON partnerships (water_id) WHERE status = 'active';
CREATE UNIQUE INDEX one_active_partnership_fertilizer
  ON partnerships (fertilizer_id) WHERE status = 'active';

CREATE INDEX partnerships_water_id_idx      ON partnerships (water_id);
CREATE INDEX partnerships_fertilizer_id_idx ON partnerships (fertilizer_id);

-- ============================================================
-- Step 3: Add related_partnership_id to notifications
-- Done after the table exists so the FK is valid.
-- ============================================================

ALTER TABLE notifications
  ADD COLUMN related_partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL;

-- ============================================================
-- Step 4: Auto-set activated_at on status transition
-- ============================================================

CREATE OR REPLACE FUNCTION handle_partnership_activated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'pending' THEN
    NEW.activated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partnerships_activated_at
  BEFORE UPDATE ON partnerships
  FOR EACH ROW EXECUTE FUNCTION handle_partnership_activated();

-- ============================================================
-- Step 5: Row Level Security
-- ============================================================

ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

-- Both parties can read their partnership
CREATE POLICY "partnerships: participant read"
  ON partnerships FOR SELECT
  TO authenticated
  USING (water_id = auth.uid() OR fertilizer_id = auth.uid());

-- Only the inviter can create the invite row
CREATE POLICY "partnerships: inviter insert"
  ON partnerships FOR INSERT
  TO authenticated
  WITH CHECK (inviter_id = auth.uid());

-- Only the invitee (non-inviter) can update (accept the invite → status: active)
CREATE POLICY "partnerships: invitee update"
  ON partnerships FOR UPDATE
  TO authenticated
  USING (
    (water_id = auth.uid() OR fertilizer_id = auth.uid())
    AND inviter_id <> auth.uid()
  )
  WITH CHECK (
    (water_id = auth.uid() OR fertilizer_id = auth.uid())
    AND inviter_id <> auth.uid()
  );

-- Either party can delete (inviter cancels pending, invitee declines)
CREATE POLICY "partnerships: participant delete"
  ON partnerships FOR DELETE
  TO authenticated
  USING (water_id = auth.uid() OR fertilizer_id = auth.uid());

-- ============================================================
-- Step 6: Notification triggers
-- ============================================================

-- Partner invite sent → notify the invitee
CREATE OR REPLACE FUNCTION notify_partner_invite()
RETURNS TRIGGER AS $$
DECLARE
  inviter_name TEXT;
  invitee_id   UUID;
BEGIN
  SELECT display_name INTO inviter_name FROM profiles WHERE id = NEW.inviter_id;
  invitee_id := CASE
    WHEN NEW.inviter_id = NEW.water_id THEN NEW.fertilizer_id
    ELSE NEW.water_id
  END;

  PERFORM create_notification(
    invitee_id,
    'partner_invite',
    NEW.inviter_id,
    NULL,
    inviter_name || ' wants to plant a tree with you 🌱',
    'Tap to accept and choose your role.'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_partner_invite_created
  AFTER INSERT ON partnerships
  FOR EACH ROW EXECUTE FUNCTION notify_partner_invite();

-- Partner invite accepted → notify the inviter
CREATE OR REPLACE FUNCTION notify_partner_invite_accepted()
RETURNS TRIGGER AS $$
DECLARE
  accepter_id   UUID;
  accepter_name TEXT;
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'pending' THEN
    accepter_id := CASE
      WHEN NEW.inviter_id = NEW.water_id THEN NEW.fertilizer_id
      ELSE NEW.water_id
    END;
    SELECT display_name INTO accepter_name FROM profiles WHERE id = accepter_id;

    PERFORM create_notification(
      NEW.inviter_id,
      'partner_invite_accepted',
      accepter_id,
      NULL,
      accepter_name || ' accepted your invite 🌿',
      'Your Relationship Tree is starting to grow.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_partner_invite_accepted
  AFTER UPDATE ON partnerships
  FOR EACH ROW EXECUTE FUNCTION notify_partner_invite_accepted();
