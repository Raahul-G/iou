-- ============================================================
-- Migration 006: Row Level Security (RLS)
--
-- Enables RLS on all tables and defines per-table access policies.
-- Every table is locked down by default; policies grant minimum
-- required access to authenticated users.
--
-- Key helper: auth.uid() → the currently authenticated user's UUID.
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read any profile (needed for search, friend cards)
CREATE POLICY "profiles: authenticated read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert is handled by the handle_new_user trigger (SECURITY DEFINER)
-- No direct INSERT policy needed from the client

-- ------------------------------------------------------------
-- friend_requests
-- ------------------------------------------------------------
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Users can see requests they sent or received
CREATE POLICY "friend_requests: participant read"
  ON friend_requests FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Users can only send requests (insert where they are the sender)
CREATE POLICY "friend_requests: sender insert"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- Only the receiver can accept/reject (update status)
-- Sender cannot modify after sending
CREATE POLICY "friend_requests: receiver update"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- Either party can delete (sender cancels, receiver cleans up)
CREATE POLICY "friend_requests: participant delete"
  ON friend_requests FOR DELETE
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- ------------------------------------------------------------
-- friendships
-- ------------------------------------------------------------
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Only participants can read their friendship
CREATE POLICY "friendships: participant read"
  ON friendships FOR SELECT
  TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Friendships are created by trigger (SECURITY DEFINER), not directly by client
-- But allow participant update for: nickname changes, archive
CREATE POLICY "friendships: participant update"
  ON friendships FOR UPDATE
  TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid())
  WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- ------------------------------------------------------------
-- ious
-- ------------------------------------------------------------
ALTER TABLE ious ENABLE ROW LEVEL SECURITY;

-- Only creator and receiver can see an IOU
CREATE POLICY "ious: participant read"
  ON ious FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid() OR receiver_id = auth.uid());

-- Only the creator can create an IOU
CREATE POLICY "ious: creator insert"
  ON ious FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Status updates:
--   receiver: pending→accepted, pending→declined, completion_requested→completed, completion_requested→accepted
--   creator:  accepted→completion_requested
-- Both are participants, so we allow participant update and enforce logic in the app layer
-- (RLS cannot easily enforce specific status transitions — that's application logic)
CREATE POLICY "ious: participant update"
  ON ious FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid() OR receiver_id = auth.uid())
  WITH CHECK (creator_id = auth.uid() OR receiver_id = auth.uid());

-- Only creator can delete a pending IOU (receiver can't delete)
CREATE POLICY "ious: creator delete"
  ON ious FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid() AND status = 'pending');

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications: owner read"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Notifications are inserted by triggers (SECURITY DEFINER), not directly by client
-- Allow owner to update (mark as read)
CREATE POLICY "notifications: owner update"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Owner can delete their own notifications
CREATE POLICY "notifications: owner delete"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
