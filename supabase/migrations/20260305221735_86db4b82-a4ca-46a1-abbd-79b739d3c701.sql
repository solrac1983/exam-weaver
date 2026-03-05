
-- Delete messages from test conversations with non-UUID participant IDs
DELETE FROM chat_messages WHERE conversation_id IN (
  SELECT id FROM chat_conversations 
  WHERE participant_1 NOT LIKE '________-____-____-____-____________'
     OR participant_2 NOT LIKE '________-____-____-____-____________'
);

-- Delete test conversations with non-UUID participant IDs
DELETE FROM chat_conversations 
WHERE participant_1 NOT LIKE '________-____-____-____-____________'
   OR participant_2 NOT LIKE '________-____-____-____-____________';
