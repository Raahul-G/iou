-- ============================================================
-- Migration 002: friend_requests + friendships
--
-- friend_requests: tracks pending/accepted/rejected requests.
-- friendships: the live connection between two users.
--   Canonical order enforced: user_a_id < user_b_id (UUID compare).
--   A trigger swaps the IDs on insert so the constraint always holds.
--   This prevents duplicate pairs (Alice,Bob) and (Bob,Alice).
-- ============================================================

-- ------------------------------------------------------------
-- Friend Requests
-- ------------------------------------------------------------
CREATE TABLE friend_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_request    CHECK (from_user_id <> to_user_id),
  CONSTRAINT unique_request     UNIQUE (from_user_id, to_user_id)
);

-- ------------------------------------------------------------
-- Friendships
-- ------------------------------------------------------------
CREATE TABLE friendships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Each user stores their own nickname for the other (private, never shared)
  user_a_nickname TEXT,   -- user_a's nickname for user_b
  user_b_nickname TEXT,   -- user_b's nickname for user_a
  status          TEXT NOT NULL DEFAULT 'connected'
                  CHECK (status IN ('connected', 'archived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_friendship CHECK (user_a_id <> user_b_id),
  CONSTRAINT canonical_order    CHECK (user_a_id < user_b_id),
  CONSTRAINT unique_friendship  UNIQUE (user_a_id, user_b_id)
);

-- Enforce canonical order: always store the lower UUID as user_a_id
CREATE OR REPLACE FUNCTION enforce_friendship_order()
RETURNS TRIGGER AS $$
DECLARE
  a UUID;
  b UUID;
BEGIN
  IF NEW.user_a_id > NEW.user_b_id THEN
    a := NEW.user_b_id;
    b := NEW.user_a_id;
    NEW.user_a_id := a;
    NEW.user_b_id := b;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friendships_canonical_order
  BEFORE INSERT ON friendships
  FOR EACH ROW EXECUTE FUNCTION enforce_friendship_order();

-- When a friend_request is accepted, create the friendship row
CREATE OR REPLACE FUNCTION handle_friend_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO friendships (user_a_id, user_b_id)
    VALUES (NEW.from_user_id, NEW.to_user_id)
    ON CONFLICT (user_a_id, user_b_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION handle_friend_request_accepted();
