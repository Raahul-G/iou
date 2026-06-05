-- ============================================================
-- Migration: Wishes per friendship
--
-- Dissolves the partnership concept. Every friendship gets a
-- wish slot, tree, and IOU history. The partnerships table is
-- left in place but no longer used by the app.
-- ============================================================

-- Step 1: Drop old wish policies, triggers, and functions
DROP POLICY IF EXISTS "wishes: participant read"   ON wishes;
DROP POLICY IF EXISTS "wishes: creator insert"     ON wishes;
DROP POLICY IF EXISTS "wishes: participant update"  ON wishes;

DROP TRIGGER  IF EXISTS on_wish_created          ON wishes;
DROP TRIGGER  IF EXISTS on_wish_status_changed   ON wishes;
DROP TRIGGER  IF EXISTS wishes_status_timestamps ON wishes;

DROP FUNCTION IF EXISTS notify_wish_created();
DROP FUNCTION IF EXISTS notify_wish_status_change();
DROP FUNCTION IF EXISTS handle_wish_status_change();

DROP INDEX IF EXISTS one_active_wish_per_partnership;
DROP INDEX IF EXISTS wishes_confirmed_at_idx;

-- Step 2: Clear dev data, swap FK from partnerships → friendships
DELETE FROM wishes;

ALTER TABLE wishes DROP COLUMN IF EXISTS partnership_id;
ALTER TABLE wishes
  ADD COLUMN friendship_id UUID NOT NULL REFERENCES friendships(id) ON DELETE CASCADE;

-- Step 3: Recreate indexes
CREATE UNIQUE INDEX one_active_wish_per_friendship
  ON wishes (friendship_id)
  WHERE status IN ('active', 'accepted', 'on_hold', 'fulfilled');

CREATE INDEX wishes_friendship_confirmed_idx
  ON wishes (friendship_id, confirmed_at)
  WHERE status = 'confirmed';

-- Step 4: RLS policies scoped to friendship participants

CREATE POLICY "wishes: participant read"
  ON wishes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.id = friendship_id
        AND (f.user_a_id = auth.uid() OR f.user_b_id = auth.uid())
    )
  );

CREATE POLICY "wishes: creator insert"
  ON wishes FOR INSERT TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND target_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.id = friendship_id
        AND (f.user_a_id = auth.uid() OR f.user_b_id = auth.uid())
        AND (f.user_a_id = target_id  OR f.user_b_id = target_id)
    )
  );

CREATE POLICY "wishes: participant update"
  ON wishes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.id = friendship_id
        AND (f.user_a_id = auth.uid() OR f.user_b_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.id = friendship_id
        AND (f.user_a_id = auth.uid() OR f.user_b_id = auth.uid())
    )
  );

-- Step 5: Restore triggers updated to use friendship_id

CREATE OR REPLACE FUNCTION handle_wish_status_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  IF    NEW.status = 'accepted'  AND OLD.status = 'active'    THEN NEW.accepted_at  := NOW();
  ELSIF NEW.status = 'on_hold'   AND OLD.status = 'active'    THEN NEW.held_at       := NOW();
  ELSIF NEW.status = 'fulfilled' AND OLD.status = 'accepted'  THEN NEW.fulfilled_at  := NOW();
  ELSIF NEW.status = 'confirmed' AND OLD.status = 'fulfilled' THEN NEW.confirmed_at  := NOW();
  ELSIF NEW.status = 'withdrawn'                              THEN NEW.withdrawn_at  := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wishes_status_timestamps
  BEFORE UPDATE ON wishes
  FOR EACH ROW EXECUTE FUNCTION handle_wish_status_change();

CREATE OR REPLACE FUNCTION notify_wish_created()
RETURNS TRIGGER AS $$
DECLARE creator_name TEXT;
BEGIN
  SELECT display_name INTO creator_name FROM profiles WHERE id = NEW.creator_id;
  PERFORM create_notification(
    NEW.target_id, 'wish_created', NEW.creator_id, NEW.id, NULL,
    creator_name || ' made a wish ✨', '"' || NEW.text || '"'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_wish_created
  AFTER INSERT ON wishes
  FOR EACH ROW EXECUTE FUNCTION notify_wish_created();

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
    PERFORM create_notification(NEW.creator_id, 'wish_accepted', NEW.target_id, NEW.id, NULL,
      target_name || ' accepted your wish 🌸', 'They''re on it!');

  ELSIF NEW.status = 'on_hold' AND OLD.status = 'active' THEN
    message_text := CASE
      WHEN NEW.decline_text IS NOT NULL AND NEW.decline_text <> '' THEN '"' || NEW.decline_text || '"'
      ELSE 'They''ll get to it when the time is right.'
    END;
    PERFORM create_notification(NEW.creator_id, 'wish_not_right_now', NEW.target_id, NEW.id, NULL,
      target_name || ' says not right now 💛', message_text);

  ELSIF NEW.status = 'fulfilled' AND OLD.status = 'accepted' THEN
    PERFORM create_notification(NEW.creator_id, 'wish_fulfilled', NEW.target_id, NEW.id, NULL,
      target_name || ' made your wish come true ✨', 'Can you confirm?');

  ELSIF NEW.status = 'confirmed' AND OLD.status = 'fulfilled' THEN
    message_text := CASE
      WHEN NEW.thank_you_note IS NOT NULL AND NEW.thank_you_note <> '' THEN '"' || NEW.thank_you_note || '"'
      ELSE creator_name || ' confirmed your fulfillment.'
    END;
    PERFORM create_notification(NEW.target_id, 'wish_confirmed', NEW.creator_id, NEW.id, NULL,
      creator_name || ' confirmed 🌟', message_text);

  ELSIF NEW.status = 'withdrawn' AND OLD.status IN ('active', 'on_hold') THEN
    PERFORM create_notification(NEW.target_id, 'wish_withdrawn', NEW.creator_id, NEW.id, NULL,
      creator_name || ' withdrew their wish', 'The wish slot is open again.');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_wish_status_changed
  AFTER UPDATE ON wishes
  FOR EACH ROW EXECUTE FUNCTION notify_wish_status_change();
