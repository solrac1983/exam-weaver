
-- Drop all existing RESTRICTIVE policies on chat tables and recreate as PERMISSIVE

-- chat_messages: Drop restrictive policies
DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update messages in own conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.chat_messages;

-- chat_messages: Recreate as PERMISSIVE
CREATE POLICY "Users can insert messages in own conversations"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
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

CREATE POLICY "Users can update messages in own conversations"
ON public.chat_messages FOR UPDATE TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM chat_conversations
    WHERE participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text
  )
  OR conversation_id IN (
    SELECT conversation_id FROM chat_conversation_participants
    WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can view messages in own conversations"
ON public.chat_messages FOR SELECT TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM chat_conversations
    WHERE participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text
  )
  OR conversation_id IN (
    SELECT conversation_id FROM chat_conversation_participants
    WHERE user_id = auth.uid()::text
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- chat_conversations: Drop restrictive policies
DROP POLICY IF EXISTS "Users can insert conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;

-- chat_conversations: Recreate as PERMISSIVE
CREATE POLICY "Users can insert conversations"
ON public.chat_conversations FOR INSERT TO authenticated
WITH CHECK (
  participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text OR is_group = true
);

CREATE POLICY "Users can update own conversations"
ON public.chat_conversations FOR UPDATE TO authenticated
USING (
  participant_1 = auth.uid()::text
  OR participant_2 = auth.uid()::text
  OR id IN (
    SELECT conversation_id FROM chat_conversation_participants
    WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can view own conversations"
ON public.chat_conversations FOR SELECT TO authenticated
USING (
  participant_1 = auth.uid()::text
  OR participant_2 = auth.uid()::text
  OR id IN (
    SELECT conversation_id FROM chat_conversation_participants
    WHERE user_id = auth.uid()::text
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- chat_conversation_participants: Drop restrictive policies
DROP POLICY IF EXISTS "Users can delete participants in own group conversations" ON public.chat_conversation_participants;
DROP POLICY IF EXISTS "Users can insert participants" ON public.chat_conversation_participants;
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON public.chat_conversation_participants;

-- chat_conversation_participants: Recreate as PERMISSIVE
CREATE POLICY "Users can delete participants in own group conversations"
ON public.chat_conversation_participants FOR DELETE TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id FROM chat_conversation_participants
    WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert participants"
ON public.chat_conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id FROM chat_conversations
    WHERE participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text
  )
  OR conversation_id IN (
    SELECT conversation_id FROM chat_conversation_participants
    WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can view participants of own conversations"
ON public.chat_conversation_participants FOR SELECT TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM chat_conversations
    WHERE participant_1 = auth.uid()::text OR participant_2 = auth.uid()::text
  )
  OR conversation_id IN (
    SELECT conversation_id FROM chat_conversation_participants
    WHERE user_id = auth.uid()::text
  )
);
