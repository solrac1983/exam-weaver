
-- Drop ALL existing policies on chat tables and recreate as PERMISSIVE

-- chat_messages
DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON public.chat_messages;

CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT TO authenticated USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text
    )
    OR conversation_id IN (
      SELECT conversation_id FROM chat_conversation_participants
      WHERE user_id = auth.uid()::text
    )
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender = auth.uid()::text
    AND (
      conversation_id IN (
        SELECT id FROM chat_conversations
        WHERE participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text
      )
      OR conversation_id IN (
        SELECT conversation_id FROM chat_conversation_participants
        WHERE user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "chat_messages_update" ON public.chat_messages
  FOR UPDATE TO authenticated USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text
    )
    OR conversation_id IN (
      SELECT conversation_id FROM chat_conversation_participants
      WHERE user_id = auth.uid()::text
    )
  );

-- chat_conversations
DROP POLICY IF EXISTS "chat_conversations_insert" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_select" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_update" ON public.chat_conversations;

CREATE POLICY "chat_conversations_select" ON public.chat_conversations
  FOR SELECT TO authenticated USING (
    participant_1 = auth.uid()::text
    OR participant_2 = auth.uid()::text
    OR id IN (
      SELECT conversation_id FROM chat_conversation_participants
      WHERE user_id = auth.uid()::text
    )
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
    OR id IN (
      SELECT conversation_id FROM chat_conversation_participants
      WHERE user_id = auth.uid()::text
    )
  );

-- chat_conversation_participants
DROP POLICY IF EXISTS "chat_participants_select" ON public.chat_conversation_participants;
DROP POLICY IF EXISTS "chat_participants_insert" ON public.chat_conversation_participants;
DROP POLICY IF EXISTS "chat_participants_delete" ON public.chat_conversation_participants;

CREATE POLICY "chat_participants_select" ON public.chat_conversation_participants
  FOR SELECT TO authenticated USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text
    )
    OR conversation_id IN (
      SELECT conversation_id FROM chat_conversation_participants cp
      WHERE cp.user_id = auth.uid()::text
    )
  );

CREATE POLICY "chat_participants_insert" ON public.chat_conversation_participants
  FOR INSERT TO authenticated WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text
    )
    OR conversation_id IN (
      SELECT conversation_id FROM chat_conversation_participants cp
      WHERE cp.user_id = auth.uid()::text
    )
  );

CREATE POLICY "chat_participants_delete" ON public.chat_conversation_participants
  FOR DELETE TO authenticated USING (
    conversation_id IN (
      SELECT conversation_id FROM chat_conversation_participants cp
      WHERE cp.user_id = auth.uid()::text
    )
  );
