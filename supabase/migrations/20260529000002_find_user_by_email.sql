-- ============================================================
-- Migration 009: find_user_by_email RPC
-- Allows searching for a user by their auth email to send
-- a friend request. Returns id + profile data.
-- SECURITY DEFINER so it can query auth.users safely.
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_user_by_email(search_email TEXT)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  profile_pic_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.display_name, p.profile_pic_url
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE LOWER(u.email) = LOWER(search_email)
  LIMIT 1;
END;
$$;

-- Only authenticated users can call this
REVOKE ALL ON FUNCTION public.find_user_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO authenticated;
