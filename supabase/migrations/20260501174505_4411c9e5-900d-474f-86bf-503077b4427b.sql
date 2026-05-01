-- ===== Security hardening migration =====

-- 1) Make chat-attachments bucket PRIVATE (was public)
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- 2) Create dedicated avatars bucket (public, for profile photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars: public read, owner-only write/delete (path = <user_id>/...)
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) Chat attachments policies: only conversation members can read/upload
-- Path convention: <conversation_id>/<filename>
DROP POLICY IF EXISTS "Chat members can read attachments" ON storage.objects;
CREATE POLICY "Chat members can read attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND public.is_chat_member(auth.uid()::text, ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Chat members can upload attachments" ON storage.objects;
CREATE POLICY "Chat members can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND public.is_chat_member(auth.uid()::text, ((storage.foldername(name))[1])::uuid)
  );

-- 4) editor-images: restrict DELETE to owner (path = <user_id>/...)
DROP POLICY IF EXISTS "Anyone can delete editor images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete editor images" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete editor images" ON storage.objects;
CREATE POLICY "Owner can delete editor images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'editor-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5) Professors can SELECT students of their own company
DROP POLICY IF EXISTS "Professors can view company students" ON public.students;
CREATE POLICY "Professors can view company students"
  ON public.students FOR SELECT TO authenticated
  USING (
    company_id = public.get_my_company_id()
    AND (
      public.has_role(auth.uid(), 'professor'::app_role)
      OR public.has_role(auth.uid(), 'coordinator'::app_role)
    )
  );

-- 6) Coordinators can SELECT attendance of their own company
DROP POLICY IF EXISTS "Coordinators can view company attendance" ON public.attendance;
CREATE POLICY "Coordinators can view company attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (
    company_id = public.get_my_company_id()
    AND public.has_role(auth.uid(), 'coordinator'::app_role)
  );

-- 7) Tighten chat_conversations group INSERT: must include creator and group_name
DROP POLICY IF EXISTS "chat_conversations_insert" ON public.chat_conversations;
CREATE POLICY "chat_conversations_insert"
  ON public.chat_conversations FOR INSERT TO authenticated
  WITH CHECK (
    -- Direct conversation: creator must be one of the two participants
    (
      is_group = false
      AND (
        participant_1 = (auth.uid())::text
        OR participant_2 = (auth.uid())::text
      )
    )
    OR
    -- Group conversation: creator must be participant_1 AND group_name is required
    (
      is_group = true
      AND participant_1 = (auth.uid())::text
      AND group_name IS NOT NULL
      AND length(trim(group_name)) > 0
    )
  );