-- ============================================================
-- Migration: Tree-dull quality gates + friend onboarding nudge
--
-- Problems fixed:
--   1. maybe_notify_tree_dull fires immediately for brand-new
--      friendships with 0 activity (state = "dead").
--      Added three gates (Option C):
--        a. Friendship must be ≥ 14 days old
--        b. All-time completed IOU count ≥ 1 (tree was ever alive)
--        c. 7-day dedup unchanged
--
--   2. New notification type 'friend_onboarding' for the nudge
--      sent to friends who have not yet logged a single IOU:
--        - 24 h tier: sent ~1 day after friendship accepted
--        - 7 d tier:  sent ~7 days after friendship accepted
--      Both tiers stop permanently once any IOU is created.
--      Fired by the client calling maybe_notify_friend_onboarding().
-- ============================================================

-- ── 1. Add friend_onboarding to the type CHECK ───────────────

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
    'tree_dull',
    'friend_onboarding'
  ));

-- ── 2. Replace maybe_notify_tree_dull with gated version ─────

CREATE OR REPLACE FUNCTION maybe_notify_tree_dull(p_friendship_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_a_id       UUID;
  v_user_b_id       UUID;
  v_name_a          TEXT;
  v_name_b          TEXT;
  v_created_at      TIMESTAMPTZ;
  v_completed_count INT;
  v_recent          BOOLEAN;
BEGIN
  SELECT f.user_a_id, f.user_b_id, f.created_at
  INTO   v_user_a_id, v_user_b_id, v_created_at
  FROM   friendships f
  WHERE  f.id = p_friendship_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Gate A: friendship must be at least 14 days old.
  -- New friendships with zero activity read as "dead" on the
  -- client, but that is expected — they haven't started yet.
  IF v_created_at > NOW() - INTERVAL '14 days' THEN RETURN; END IF;

  -- Gate B: at least one IOU must have been completed ever.
  -- A friendship with zero all-time completions is just getting
  -- started, not neglected.
  SELECT COUNT(*) INTO v_completed_count
  FROM   ious
  WHERE  friendship_id = p_friendship_id
    AND  status = 'completed';

  IF v_completed_count < 1 THEN RETURN; END IF;

  -- Gate C: dedup — don't fire more than once per 7 days.
  SELECT EXISTS(
    SELECT 1 FROM notifications
    WHERE  related_friendship_id = p_friendship_id
      AND  type = 'tree_dull'
      AND  created_at > NOW() - INTERVAL '7 days'
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

-- ── 3. Create maybe_notify_friend_onboarding ─────────────────
--
-- Called by the client whenever the friend detail screen is
-- opened. The function self-deduplicates so it is safe to call
-- on every visit.
--
-- Tier dedup: we insert 2 rows per tier (one per user).
--   notif count = 0 → neither tier sent
--   notif count = 2 → 24 h sent, 7 d not yet
--   notif count = 4 → both tiers sent, done forever
--
-- The function exits immediately once any IOU exists for the
-- friendship — the user no longer needs the nudge.

CREATE OR REPLACE FUNCTION maybe_notify_friend_onboarding(p_friendship_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_a_id   UUID;
  v_user_b_id   UUID;
  v_name_a      TEXT;
  v_name_b      TEXT;
  v_created_at  TIMESTAMPTZ;
  v_age         INTERVAL;
  v_iou_count   INT;
  v_notif_count INT;
BEGIN
  SELECT f.user_a_id, f.user_b_id, f.created_at
  INTO   v_user_a_id, v_user_b_id, v_created_at
  FROM   friendships f
  WHERE  f.id = p_friendship_id;

  IF NOT FOUND THEN RETURN; END IF;

  v_age := NOW() - v_created_at;

  -- Stop once any IOU has been logged (user doesn't need the nudge)
  SELECT COUNT(*) INTO v_iou_count
  FROM   ious
  WHERE  friendship_id = p_friendship_id;

  IF v_iou_count > 0 THEN RETURN; END IF;

  -- Count how many onboarding notifications have already been sent
  SELECT COUNT(*) INTO v_notif_count
  FROM   notifications
  WHERE  related_friendship_id = p_friendship_id
    AND  type = 'friend_onboarding';

  -- Both tiers already fired — nothing left to do
  IF v_notif_count >= 4 THEN RETURN; END IF;

  SELECT display_name INTO v_name_a FROM profiles WHERE id = v_user_a_id;
  SELECT display_name INTO v_name_b FROM profiles WHERE id = v_user_b_id;

  -- ── 24 h tier ──────────────────────────────────────────────
  -- Window: 23 h → 3 days after friendship created.
  -- Fires only if the 24 h notif has not been sent yet (count = 0).
  IF v_notif_count = 0
     AND v_age >= INTERVAL '23 hours'
     AND v_age <  INTERVAL '3 days'
  THEN
    INSERT INTO notifications (
      user_id, type, related_user_id, related_friendship_id, title, message
    ) VALUES
      (v_user_a_id, 'friend_onboarding', v_user_b_id, p_friendship_id,
       'Log your first IOU with ' || v_name_b || ' 🌱',
       'Start small — a coffee, a favour, anything counts.'),
      (v_user_b_id, 'friend_onboarding', v_user_a_id, p_friendship_id,
       'Log your first IOU with ' || v_name_a || ' 🌱',
       'Start small — a coffee, a favour, anything counts.');
    RETURN;
  END IF;

  -- ── 7 d tier ───────────────────────────────────────────────
  -- Window: 6 d 23 h → 14 days after friendship created.
  -- Fires only if the 24 h notif was already sent (count = 2)
  -- but the 7 d notif has not been sent yet.
  IF v_notif_count = 2
     AND v_age >= INTERVAL '6 days 23 hours'
     AND v_age <  INTERVAL '14 days'
  THEN
    INSERT INTO notifications (
      user_id, type, related_user_id, related_friendship_id, title, message
    ) VALUES
      (v_user_a_id, 'friend_onboarding', v_user_b_id, p_friendship_id,
       'Your tree with ' || v_name_b || ' is still a seed 🌿',
       'Log your first IOU — it only takes a second.'),
      (v_user_b_id, 'friend_onboarding', v_user_a_id, p_friendship_id,
       'Your tree with ' || v_name_a || ' is still a seed 🌿',
       'Log your first IOU — it only takes a second.');
    RETURN;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
