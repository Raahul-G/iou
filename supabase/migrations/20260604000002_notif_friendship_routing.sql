-- ============================================================
-- Migration: Notification friendship routing
--
-- 1. Add related_friendship_id column to notifications
-- 2. Add tree_dull to type CHECK constraint
-- 3. Replace the 7-param create_notification overload to
--    write related_friendship_id instead of related_partnership_id
-- 4. Update wish triggers to pass friendship_id
-- 5. Add maybe_notify_tree_dull RPC
-- ============================================================

-- Step 1: Add related_friendship_id column
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_friendship_id UUID
    REFERENCES friendships(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notifications_friendship_idx
  ON notifications (related_friendship_id)
  WHERE related_friendship_id IS NOT NULL;

-- Step 2: Extend type CHECK to include tree_dull
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
    'partner_invite',
    'partner_invite_accepted',
    'wish_created',
    'wish_accepted',
    'wish_not_right_now',
    'wish_fulfilled',
    'wish_confirmed',
    'wish_withdrawn',
    'tree_dull'
  ));

-- Step 3: Replace the 7-param create_notification overload.
-- Old signature wrote to related_partnership_id (param 5).
-- New signature writes to related_friendship_id (param 5).
-- PostgreSQL won't allow renaming params via CREATE OR REPLACE, so drop first.
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, UUID, UUID, UUID, TEXT, TEXT);

CREATE FUNCTION create_notification(
  p_user_id               UUID,
  p_type                  TEXT,
  p_related_user_id       UUID,
  p_related_wish_id       UUID,
  p_related_friendship_id UUID,
  p_title                 TEXT,
  p_message               TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (
    user_id, type, related_user_id,
    related_wish_id, related_friendship_id,
    title, message
  ) VALUES (
    p_user_id, p_type, p_related_user_id,
    p_related_wish_id, p_related_friendship_id,
    p_title, p_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update wish notification triggers to pass friendship_id

CREATE OR REPLACE FUNCTION notify_wish_created()
RETURNS TRIGGER AS $$
DECLARE creator_name TEXT;
BEGIN
  SELECT display_name INTO creator_name FROM profiles WHERE id = NEW.creator_id;
  PERFORM create_notification(
    NEW.target_id,
    'wish_created',
    NEW.creator_id,
    NEW.id,
    NEW.friendship_id,
    creator_name || ' made a wish ✨',
    '"' || NEW.text || '"'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_wish_status_change()
RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
  target_name  TEXT;
  message_text TEXT;
BEGIN
  SELECT display_name INTO creator_name FROM profiles WHERE id = NEW.creator_id;
  SELECT display_name INTO target_name  FROM profiles WHERE id = NEW.target_id;

  IF NEW.status = 'accepted' AND OLD.status = 'active' THEN
    PERFORM create_notification(
      NEW.creator_id, 'wish_accepted', NEW.target_id,
      NEW.id, NEW.friendship_id,
      target_name || ' accepted your wish 🌸', 'They''re on it!'
    );

  ELSIF NEW.status = 'on_hold' AND OLD.status = 'active' THEN
    message_text := CASE
      WHEN NEW.decline_text IS NOT NULL AND NEW.decline_text <> ''
        THEN '"' || NEW.decline_text || '"'
      ELSE 'They''ll get to it when the time is right.'
    END;
    PERFORM create_notification(
      NEW.creator_id, 'wish_not_right_now', NEW.target_id,
      NEW.id, NEW.friendship_id,
      target_name || ' says not right now 💛', message_text
    );

  ELSIF NEW.status = 'fulfilled' AND OLD.status = 'accepted' THEN
    PERFORM create_notification(
      NEW.creator_id, 'wish_fulfilled', NEW.target_id,
      NEW.id, NEW.friendship_id,
      target_name || ' made your wish come true ✨', 'Can you confirm?'
    );

  ELSIF NEW.status = 'confirmed' AND OLD.status = 'fulfilled' THEN
    message_text := CASE
      WHEN NEW.thank_you_note IS NOT NULL AND NEW.thank_you_note <> ''
        THEN '"' || NEW.thank_you_note || '"'
      ELSE creator_name || ' confirmed your fulfillment.'
    END;
    PERFORM create_notification(
      NEW.target_id, 'wish_confirmed', NEW.creator_id,
      NEW.id, NEW.friendship_id,
      creator_name || ' confirmed 🌟', message_text
    );

  ELSIF NEW.status = 'withdrawn' AND OLD.status IN ('active', 'on_hold') THEN
    PERFORM create_notification(
      NEW.target_id, 'wish_withdrawn', NEW.creator_id,
      NEW.id, NEW.friendship_id,
      creator_name || ' withdrew their wish', 'The wish slot is open again.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Tree dull notification RPC.
-- Called by the client when useFriendTree resolves to "dull" or "dead".
-- Fires at most once per 7 days per friendship to avoid spam.
CREATE OR REPLACE FUNCTION maybe_notify_tree_dull(p_friendship_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_a_id UUID;
  v_user_b_id UUID;
  v_name_a    TEXT;
  v_name_b    TEXT;
  v_recent    BOOLEAN;
BEGIN
  SELECT user_a_id, user_b_id INTO v_user_a_id, v_user_b_id
  FROM friendships WHERE id = p_friendship_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Dedup: skip if already notified in last 7 days
  SELECT EXISTS(
    SELECT 1 FROM notifications
    WHERE related_friendship_id = p_friendship_id
      AND type = 'tree_dull'
      AND created_at > NOW() - INTERVAL '7 days'
  ) INTO v_recent;
  IF v_recent THEN RETURN; END IF;

  SELECT display_name INTO v_name_a FROM profiles WHERE id = v_user_a_id;
  SELECT display_name INTO v_name_b FROM profiles WHERE id = v_user_b_id;

  INSERT INTO notifications (
    user_id, type, related_user_id, related_friendship_id, title, message
  ) VALUES
    (v_user_a_id, 'tree_dull', v_user_b_id, p_friendship_id,
     'Your tree is getting thirsty 🌱',
     'Keep the momentum going with ' || v_name_b),
    (v_user_b_id, 'tree_dull', v_user_a_id, p_friendship_id,
     'Your tree is getting thirsty 🌱',
     'Keep the momentum going with ' || v_name_a);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
