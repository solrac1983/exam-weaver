-- 1. Template buckets: tighten write/delete to admins only
DROP POLICY IF EXISTS "Allow upload template-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete template-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload template-headers" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete template-headers" ON storage.objects;

CREATE POLICY "Admins upload template-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'template-documents'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Admins delete template-documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'template-documents'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Admins upload template-headers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'template-headers'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Admins delete template-headers"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'template-headers'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- 2. chat-attachments: require authenticated for write/delete (drop redundant public policy)
DROP POLICY IF EXISTS "Public upload chat-attachments" ON storage.objects;
-- Existing "Authenticated users can upload chat attachments" + "Users can delete own chat attachments" remain in force

-- 3. Realtime: enable RLS and scope subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant scoped realtime access" ON realtime.messages;

CREATE POLICY "Tenant scoped realtime access"
ON realtime.messages FOR SELECT TO authenticated
USING (
  -- topic begins with the user's company id, their own uid, or a conversation id they belong to
  (realtime.topic() LIKE (public.get_my_company_id())::text || '%')
  OR (realtime.topic() LIKE (auth.uid())::text || '%')
  OR EXISTS (
    SELECT 1 FROM public.chat_conversation_participants p
    WHERE p.user_id = (auth.uid())::text
      AND realtime.topic() LIKE p.conversation_id::text || '%'
  )
  OR EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE (c.participant_1 = (auth.uid())::text OR c.participant_2 = (auth.uid())::text)
      AND realtime.topic() LIKE c.id::text || '%'
  )
);