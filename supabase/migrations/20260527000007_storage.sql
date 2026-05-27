-- ============================================================
-- Migration 007: Storage — avatars bucket
-- Public bucket for user profile pictures.
-- Users can upload/update/delete only their own avatar file.
-- Anyone can read (public URLs for profile pics in friend cards).
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,           -- 2MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Authenticated upload (only their own file: {user_id}.{ext})
CREATE POLICY "avatars: owner insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can update their own avatar
CREATE POLICY "avatars: owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can delete their own avatar
CREATE POLICY "avatars: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
