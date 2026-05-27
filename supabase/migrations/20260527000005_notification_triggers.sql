-- ============================================================
-- Migration 005: notification triggers
--
-- Automatically inserts notification rows when key events occur.
-- All triggers use SECURITY DEFINER so they run as the DB owner
-- and bypass RLS when inserting notifications.
-- ============================================================

-- Helper: insert a notification row
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id         UUID,
  p_type            TEXT,
  p_related_user_id UUID,
  p_related_iou_id  UUID,
  p_title           TEXT,
  p_message         TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, type, related_user_id, related_iou_id, title, message)
  VALUES (p_user_id, p_type, p_related_user_id, p_related_iou_id, p_title, p_message);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- Friend request sent → notify receiver
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.from_user_id;

  PERFORM create_notification(
    NEW.to_user_id,
    'friend_request',
    NEW.from_user_id,
    NULL,
    sender_name || ' sent you a friend request',
    'Tap to accept or reject.'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION notify_friend_request();

-- ------------------------------------------------------------
-- Friend request accepted → notify sender
-- Friend request rejected → no notification (silent by spec)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_friend_request_status()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT display_name INTO accepter_name FROM profiles WHERE id = NEW.to_user_id;

    PERFORM create_notification(
      NEW.from_user_id,
      'friend_request_accepted',
      NEW.to_user_id,
      NULL,
      accepter_name || ' accepted your friend request',
      'You can now create IOUs together.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friend_request_status_changed
  AFTER UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION notify_friend_request_status();

-- ------------------------------------------------------------
-- IOU created → notify receiver
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_iou_created()
RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
BEGIN
  SELECT display_name INTO creator_name FROM profiles WHERE id = NEW.creator_id;

  PERFORM create_notification(
    NEW.receiver_id,
    'iou_created',
    NEW.creator_id,
    NEW.id,
    creator_name || ' owes you: ' || NEW.title,
    'Tap to accept or decline.'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_iou_created
  AFTER INSERT ON ious
  FOR EACH ROW EXECUTE FUNCTION notify_iou_created();

-- ------------------------------------------------------------
-- IOU status changes → various notifications
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_iou_status_change()
RETURNS TRIGGER AS $$
DECLARE
  receiver_name TEXT;
  creator_name  TEXT;
BEGIN
  SELECT display_name INTO receiver_name FROM profiles WHERE id = NEW.receiver_id;
  SELECT display_name INTO creator_name  FROM profiles WHERE id = NEW.creator_id;

  -- accepted → notify creator
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    PERFORM create_notification(
      NEW.creator_id,
      'iou_accepted',
      NEW.receiver_id,
      NEW.id,
      receiver_name || ' accepted your IOU',
      '"' || NEW.title || '" is now active.'
    );

  -- declined → notify creator
  ELSIF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    PERFORM create_notification(
      NEW.creator_id,
      'iou_declined',
      NEW.receiver_id,
      NEW.id,
      receiver_name || ' declined your IOU',
      '"' || NEW.title || '" was declined.'
    );

  -- completion_requested → notify receiver
  ELSIF NEW.status = 'completion_requested' AND OLD.status = 'accepted' THEN
    PERFORM create_notification(
      NEW.receiver_id,
      'iou_completion_requested',
      NEW.creator_id,
      NEW.id,
      creator_name || ' says they completed: ' || NEW.title,
      'Can you confirm?'
    );

  -- accepted (from completion_requested) → creator was rejected, notify creator
  ELSIF NEW.status = 'accepted' AND OLD.status = 'completion_requested' THEN
    PERFORM create_notification(
      NEW.creator_id,
      'iou_completion_rejected',
      NEW.receiver_id,
      NEW.id,
      receiver_name || ' didn''t confirm yet',
      '"' || NEW.title || '" is still active.'
    );

  -- completed → notify both parties
  ELSIF NEW.status = 'completed' AND OLD.status = 'completion_requested' THEN
    -- notify creator
    PERFORM create_notification(
      NEW.creator_id,
      'iou_completed',
      NEW.receiver_id,
      NEW.id,
      'IOU completed: ' || NEW.title,
      receiver_name || ' confirmed. Well done!'
    );
    -- notify receiver
    PERFORM create_notification(
      NEW.receiver_id,
      'iou_completed',
      NEW.creator_id,
      NEW.id,
      'IOU completed: ' || NEW.title,
      'You confirmed ' || creator_name || '''s IOU.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_iou_status_changed
  AFTER UPDATE ON ious
  FOR EACH ROW EXECUTE FUNCTION notify_iou_status_change();
