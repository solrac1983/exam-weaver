-- Create public bucket for editor images
INSERT INTO storage.buckets (id, name, public)
VALUES ('editor-images', 'editor-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload editor images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'editor-images');

-- Allow public read access
CREATE POLICY "Public read access for editor images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'editor-images');

-- Allow authenticated users to delete their own images
CREATE POLICY "Authenticated users can delete editor images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'editor-images');