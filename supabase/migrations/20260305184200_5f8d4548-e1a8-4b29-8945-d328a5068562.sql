
-- Allow participants to delete (remove) members from their group conversations
CREATE POLICY "Users can delete participants in own group conversations"
  ON public.chat_conversation_participants
  FOR DELETE
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.chat_conversation_participants
      WHERE user_id = (auth.uid())::text
    )
  );

-- Allow updating group_name by group members
-- (already covered by existing update policy on chat_conversations)
