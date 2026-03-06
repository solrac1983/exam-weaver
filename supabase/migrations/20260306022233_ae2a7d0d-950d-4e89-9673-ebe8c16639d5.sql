
-- Create security definer function to check chat participation without triggering RLS
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id text, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_chat_member(_user_id text, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = _conversation_id
      AND (participant_1 = _user_id OR participant_2 = _user_id)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.chat_conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- Recreate chat_conversations policies using the function
DROP POLICY IF EXISTS "chat_conversations_select" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_insert" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_update" ON public.chat_conversations;

CREATE POLICY "chat_conversations_select" ON public.chat_conversations
  FOR SELECT TO authenticated USING (
    participant_1 = auth.uid()::text
    OR participant_2 = auth.uid()::text
    OR is_chat_participant(auth.uid()::text, id)
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "chat_conversations_insert" ON public.chat_conversations
  FOR INSERT TO authenticated WITH CHECK (
    participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text OR is_group = true
  );

CREATE POLICY "chat_conversations_update" ON public.chat_conversations
  FOR UPDATE TO authenticated USING (
    participant_1 = auth.uid()::text
    OR participant_2 = auth.uid()::text
    OR is_chat_participant(auth.uid()::text, id)
  );

-- Recreate chat_conversation_participants policies using the function
DROP POLICY IF EXISTS "chat_participants_select" ON public.chat_conversation_participants;
DROP POLICY IF EXISTS "chat_participants_insert" ON public.chat_conversation_participants;
DROP POLICY IF EXISTS "chat_participants_delete" ON public.chat_conversation_participants;

CREATE POLICY "chat_participants_select" ON public.chat_conversation_participants
  FOR SELECT TO authenticated USING (
    is_chat_member(auth.uid()::text, conversation_id)
  );

CREATE POLICY "chat_participants_insert" ON public.chat_conversation_participants
  FOR INSERT TO authenticated WITH CHECK (
    is_chat_member(auth.uid()::text, conversation_id)
  );

CREATE POLICY "chat_participants_delete" ON public.chat_conversation_participants
  FOR DELETE TO authenticated USING (
    is_chat_member(auth.uid()::text, conversation_id)
  );

-- Recreate chat_messages policies using the function
DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON public.chat_messages;

CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT TO authenticated USING (
    is_chat_member(auth.uid()::text, conversation_id)
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender = auth.uid()::text
    AND is_chat_member(auth.uid()::text, conversation_id)
  );

CREATE POLICY "chat_messages_update" ON public.chat_messages
  FOR UPDATE TO authenticated USING (
    is_chat_member(auth.uid()::text, conversation_id)
  );
