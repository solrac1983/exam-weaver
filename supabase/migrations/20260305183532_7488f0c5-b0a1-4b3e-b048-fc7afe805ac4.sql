
-- Add group fields to chat_conversations
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_name text;

-- Create junction table for group participants
CREATE TABLE IF NOT EXISTS public.chat_conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.chat_conversation_participants ENABLE ROW LEVEL SECURITY;

-- RLS: users can view participants of their own conversations
CREATE POLICY "Users can view participants of own conversations"
  ON public.chat_conversation_participants
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.chat_conversations
      WHERE participant_1 = (auth.uid())::text
         OR participant_2 = (auth.uid())::text
    )
    OR
    conversation_id IN (
      SELECT conversation_id FROM public.chat_conversation_participants
      WHERE user_id = (auth.uid())::text
    )
  );

-- RLS: authenticated users can insert participants
CREATE POLICY "Users can insert participants"
  ON public.chat_conversation_participants
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.chat_conversations
      WHERE participant_1 = (auth.uid())::text
         OR participant_2 = (auth.uid())::text
    )
    OR
    conversation_id IN (
      SELECT conversation_id FROM public.chat_conversation_participants
      WHERE user_id = (auth.uid())::text
    )
  );

-- Update chat_conversations RLS to include group participants
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.chat_conversations
  FOR SELECT
  USING (
    participant_1 = (auth.uid())::text
    OR participant_2 = (auth.uid())::text
    OR id IN (
      SELECT conversation_id FROM public.chat_conversation_participants
      WHERE user_id = (auth.uid())::text
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Users can insert conversations" ON public.chat_conversations;
CREATE POLICY "Users can insert conversations"
  ON public.chat_conversations
  FOR INSERT
  WITH CHECK (
    participant_1 = (auth.uid())::text
    OR participant_2 = (auth.uid())::text
    OR is_group = true
  );

DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
CREATE POLICY "Users can update own conversations"
  ON public.chat_conversations
  FOR UPDATE
  USING (
    participant_1 = (auth.uid())::text
    OR participant_2 = (auth.uid())::text
    OR id IN (
      SELECT conversation_id FROM public.chat_conversation_participants
      WHERE user_id = (auth.uid())::text
    )
  );

-- Update chat_messages RLS to include group conversations
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages in own conversations"
  ON public.chat_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.chat_conversations
      WHERE participant_1 = (auth.uid())::text
         OR participant_2 = (auth.uid())::text
    )
    OR conversation_id IN (
      SELECT conversation_id FROM public.chat_conversation_participants
      WHERE user_id = (auth.uid())::text
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON public.chat_messages;
CREATE POLICY "Users can insert messages in own conversations"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender = (auth.uid())::text
    AND (
      conversation_id IN (
        SELECT id FROM public.chat_conversations
        WHERE participant_1 = (auth.uid())::text
           OR participant_2 = (auth.uid())::text
      )
      OR conversation_id IN (
        SELECT conversation_id FROM public.chat_conversation_participants
        WHERE user_id = (auth.uid())::text
      )
    )
  );

DROP POLICY IF EXISTS "Users can update messages in own conversations" ON public.chat_messages;
CREATE POLICY "Users can update messages in own conversations"
  ON public.chat_messages
  FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM public.chat_conversations
      WHERE participant_1 = (auth.uid())::text
         OR participant_2 = (auth.uid())::text
    )
    OR conversation_id IN (
      SELECT conversation_id FROM public.chat_conversation_participants
      WHERE user_id = (auth.uid())::text
    )
  );

-- Enable realtime for participants table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversation_participants;
