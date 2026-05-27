-- ============================================================
-- Migration 003: ious
--
-- Tracks the full lifecycle of an IOU between two friends.
-- States:
--   pending              → created by creator, awaiting receiver acceptance
--   accepted             → receiver accepted, IOU is active
--   declined             → receiver declined (terminal)
--   completion_requested → creator says "I did it", awaiting receiver confirmation
--   completed            → receiver confirmed (terminal)
--
-- Completion flow:
--   1. creator taps "I did it"   → status: completion_requested
--   2. receiver confirms         → status: completed
--   2. receiver rejects          → status: back to accepted (handled in app layer)
-- ============================================================

CREATE TABLE ious (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id           UUID NOT NULL REFERENCES friendships(id) ON DELETE CASCADE,
  creator_id              UUID NOT NULL REFERENCES profiles(id),
  receiver_id             UUID NOT NULL REFERENCES profiles(id),
  title                   TEXT NOT NULL,
  category                TEXT NOT NULL,
  note                    TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending',
                            'accepted',
                            'declined',
                            'completion_requested',
                            'completed'
                          )),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at             TIMESTAMPTZ,
  completion_requested_at TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,

  CONSTRAINT creator_receiver_differ CHECK (creator_id <> receiver_id)
);

-- Indexes for common query patterns
CREATE INDEX ious_friendship_id_idx ON ious (friendship_id);
CREATE INDEX ious_creator_id_idx    ON ious (creator_id);
CREATE INDEX ious_receiver_id_idx   ON ious (receiver_id);
CREATE INDEX ious_status_idx        ON ious (status);
CREATE INDEX ious_completed_at_idx  ON ious (completed_at);

-- Auto-set timestamps on status transitions
CREATE OR REPLACE FUNCTION handle_iou_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.accepted_at := NOW();
  END IF;

  IF NEW.status = 'completion_requested' AND OLD.status = 'accepted' THEN
    NEW.completion_requested_at := NOW();
  END IF;

  IF NEW.status = 'completed' AND OLD.status = 'completion_requested' THEN
    NEW.completed_at := NOW();
  END IF;

  -- Receiver rejected completion request → revert to accepted, clear timestamp
  IF NEW.status = 'accepted' AND OLD.status = 'completion_requested' THEN
    NEW.completion_requested_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ious_status_timestamps
  BEFORE UPDATE ON ious
  FOR EACH ROW EXECUTE FUNCTION handle_iou_status_change();
