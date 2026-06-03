-- ============================================================
-- Migration: wishes
--
-- A Wish is a request User B (Fertilizer) makes to User A (Water).
-- Only one unresolved Wish can exist per partnership at a time
-- (enforced by a partial unique index on partnership_id).
--
-- Status machine:
--
--   active ──► accepted ──► fulfilled ──► confirmed  (terminal ✓)
--     │
--     ├──► on_hold ─┐
--     │             └──► withdrawn                   (terminal ✗)
--     └──────────────────► withdrawn                 (terminal ✗)
--
-- Transitions:
--   active    → accepted   User A taps Accept
--   active    → on_hold    User A taps "Not Right Now" (+ optional sweet text + mood)
--   active    → withdrawn  User B withdraws before User A responds
--   on_hold   → withdrawn  User B withdraws after seeing the decline note
--   accepted  → fulfilled  User A taps "Mark Done"
--   fulfilled → confirmed  User B taps confirm + writes Thank You note
--
-- After confirmed: optional Gratitude Token prompt (handled in app layer —
-- creates a normal IOU from User B to User A if User B opts in).
-- ============================================================

-- ============================================================
-- Step 1: wishes table
-- ============================================================

CREATE TABLE wishes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  creator_id     UUID NOT NULL REFERENCES profiles(id),   -- Fertilizer (User B)
  target_id      UUID NOT NULL REFERENCES profiles(id),   -- Water (User A)
  text           TEXT NOT NULL CHECK (char_length(text) <= 280),
  mood           TEXT NOT NULL,                           -- emoji string (e.g. '🌧️')
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN (
                   'active',      -- waiting for User A to respond
                   'accepted',    -- User A accepted; will fulfill
                   'on_hold',     -- User A said "Not Right Now"
                   'fulfilled',   -- User A marked done; waiting User B confirmation
                   'confirmed',   -- User B confirmed (terminal)
                   'withdrawn'    -- User B withdrew (terminal)
                 )),
  -- "Not Right Now" payload from User A
  decline_text   TEXT CHECK (decline_text IS NULL OR char_length(decline_text) <= 140),
  decline_mood   TEXT,
  -- Confirmation payload from User B
  thank_you_note TEXT CHECK (thank_you_note IS NULL OR char_length(thank_you_note) <= 280),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Status transition timestamps
  accepted_at    TIMESTAMPTZ,
  held_at        TIMESTAMPTZ,   -- when "Not Right Now" was sent
  fulfilled_at   TIMESTAMPTZ,
  confirmed_at   TIMESTAMPTZ,
  withdrawn_at   TIMESTAMPTZ,

  CONSTRAINT creator_target_differ CHECK (creator_id <> target_id)
);

-- Enforce the single-slot rule:
-- only one unresolved (non-terminal) wish per partnership at a time.
-- A new wish can be created only after the current one reaches
-- 'confirmed' or 'withdrawn'.
CREATE UNIQUE INDEX one_active_wish_per_partnership
  ON wishes (partnership_id)
  WHERE status IN ('active', 'accepted', 'on_hold', 'fulfilled');

CREATE INDEX wishes_partnership_id_idx ON wishes (partnership_id);
CREATE INDEX wishes_creator_id_idx     ON wishes (creator_id);
CREATE INDEX wishes_target_id_idx      ON wishes (target_id);
CREATE INDEX wishes_status_idx         ON wishes (partnership_id, status);
CREATE INDEX wishes_confirmed_at_idx   ON wishes (partnership_id, confirmed_at)
  WHERE status = 'confirmed';  -- used by tree score calculation

-- ============================================================
-- Step 2: Add related_wish_id to notifications
-- ============================================================

ALTER TABLE notifications
  ADD COLUMN related_wish_id UUID REFERENCES wishes(id) ON DELETE SET NULL;

-- ============================================================
-- Step 3: Overloaded create_notification for wish/partnership context
--
-- The original 6-param version (used by IOU/friend triggers) is
-- unchanged and continues to work with NULLs for new columns.
-- This 7-param version explicitly sets related_wish_id and
-- related_partnership_id when relevant.
-- ============================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id                UUID,
  p_type                   TEXT,
  p_related_user_id        UUID,
  p_related_wish_id        UUID,
  p_related_partnership_id UUID,
  p_title                  TEXT,
  p_message                TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (
    user_id, type, related_user_id,
    related_wish_id, related_partnership_id,
    title, message
  ) VALUES (
    p_user_id, p_type, p_related_user_id,
    p_related_wish_id, p_related_partnership_id,
    p_title, p_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Step 4: Auto-set updated_at and status timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION handle_wish_status_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();

  IF NEW.status = 'accepted' AND OLD.status = 'active' THEN
    NEW.accepted_at := NOW();
  ELSIF NEW.status = 'on_hold' AND OLD.status = 'active' THEN
    NEW.held_at := NOW();
  ELSIF NEW.status = 'fulfilled' AND OLD.status = 'accepted' THEN
    NEW.fulfilled_at := NOW();
  ELSIF NEW.status = 'confirmed' AND OLD.status = 'fulfilled' THEN
    NEW.confirmed_at := NOW();
  ELSIF NEW.status = 'withdrawn' THEN
    NEW.withdrawn_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wishes_status_timestamps
  BEFORE UPDATE ON wishes
  FOR EACH ROW EXECUTE FUNCTION handle_wish_status_change();

-- ============================================================
-- Step 5: Row Level Security
-- ============================================================

ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;

-- Both partners can read wishes in their partnership
CREATE POLICY "wishes: participant read"
  ON wishes FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid() OR target_id = auth.uid());

-- Only Fertilizer (creator) can create a wish
CREATE POLICY "wishes: creator insert"
  ON wishes FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Both can update:
--   User A: active → accepted/on_hold, accepted → fulfilled
--   User B: active/on_hold → withdrawn, fulfilled → confirmed
-- Status transition logic is enforced in the app layer.
CREATE POLICY "wishes: participant update"
  ON wishes FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid() OR target_id = auth.uid())
  WITH CHECK (creator_id = auth.uid() OR target_id = auth.uid());

-- ============================================================
-- Step 6: Notification triggers for wish events
-- ============================================================

-- Wish created → notify User A (target/Water)
CREATE OR REPLACE FUNCTION notify_wish_created()
RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
BEGIN
  SELECT display_name INTO creator_name FROM profiles WHERE id = NEW.creator_id;

  PERFORM create_notification(
    NEW.target_id,
    'wish_created',
    NEW.creator_id,
    NEW.id,
    NULL,
    creator_name || ' made a wish ✨',
    '"' || NEW.text || '"'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_wish_created
  AFTER INSERT ON wishes
  FOR EACH ROW EXECUTE FUNCTION notify_wish_created();

-- Wish status changes → various notifications
CREATE OR REPLACE FUNCTION notify_wish_status_change()
RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
  target_name  TEXT;
  message_text TEXT;
BEGIN
  SELECT display_name INTO creator_name FROM profiles WHERE id = NEW.creator_id;
  SELECT display_name INTO target_name  FROM profiles WHERE id = NEW.target_id;

  -- active → accepted: notify User B (creator)
  IF NEW.status = 'accepted' AND OLD.status = 'active' THEN
    PERFORM create_notification(
      NEW.creator_id,
      'wish_accepted',
      NEW.target_id,
      NEW.id,
      NULL,
      target_name || ' accepted your wish 🌸',
      'They''re on it!'
    );

  -- active → on_hold: notify User B (creator) with decline note
  ELSIF NEW.status = 'on_hold' AND OLD.status = 'active' THEN
    message_text := CASE
      WHEN NEW.decline_text IS NOT NULL AND NEW.decline_text <> ''
        THEN '"' || NEW.decline_text || '"'
      ELSE 'They''ll get to it when the time is right.'
    END;
    PERFORM create_notification(
      NEW.creator_id,
      'wish_not_right_now',
      NEW.target_id,
      NEW.id,
      NULL,
      target_name || ' says not right now 💛',
      message_text
    );

  -- accepted → fulfilled: notify User B (creator) to confirm
  ELSIF NEW.status = 'fulfilled' AND OLD.status = 'accepted' THEN
    PERFORM create_notification(
      NEW.creator_id,
      'wish_fulfilled',
      NEW.target_id,
      NEW.id,
      NULL,
      target_name || ' made your wish come true ✨',
      'Can you confirm?'
    );

  -- fulfilled → confirmed: notify User A (target) with thank you note
  ELSIF NEW.status = 'confirmed' AND OLD.status = 'fulfilled' THEN
    message_text := CASE
      WHEN NEW.thank_you_note IS NOT NULL AND NEW.thank_you_note <> ''
        THEN '"' || NEW.thank_you_note || '"'
      ELSE creator_name || ' confirmed your fulfillment.'
    END;
    PERFORM create_notification(
      NEW.target_id,
      'wish_confirmed',
      NEW.creator_id,
      NEW.id,
      NULL,
      creator_name || ' confirmed 🌟',
      message_text
    );

  -- → withdrawn: notify User A (target) so they know the slot is free
  ELSIF NEW.status = 'withdrawn' AND OLD.status IN ('active', 'on_hold') THEN
    PERFORM create_notification(
      NEW.target_id,
      'wish_withdrawn',
      NEW.creator_id,
      NEW.id,
      NULL,
      creator_name || ' withdrew their wish',
      'The wish slot is open again.'
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_wish_status_changed
  AFTER UPDATE ON wishes
  FOR EACH ROW EXECUTE FUNCTION notify_wish_status_change();
