-- ============================================================
-- Migration: wish_symmetric_roles
--
-- Both Water and Fertilizer can now create and receive Wishes.
-- Roles are purely cosmetic labels — all functionality is symmetric.
--
-- Changes:
--   1. Replace "wishes: creator insert" RLS policy with a stricter
--      version that validates partnership participation (ensures the
--      creator and target are the two actual partners in the
--      referenced active partnership). No role restriction.
-- ============================================================

DROP POLICY IF EXISTS "wishes: creator insert" ON wishes;

CREATE POLICY "wishes: creator insert"
  ON wishes FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partnership_id
        AND p.status = 'active'
        AND (
          (p.water_id      = auth.uid() AND p.fertilizer_id = target_id)
          OR
          (p.fertilizer_id = auth.uid() AND p.water_id      = target_id)
        )
    )
  );
