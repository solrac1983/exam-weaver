
-- Chat conversations table
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 text NOT NULL,
  participant_2 text NOT NULL,
  last_message_text text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access chat_conversations" ON public.chat_conversations
  FOR ALL USING (true) WITH CHECK (true);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  sender text NOT NULL,
  text text,
  attachment_url text,
  attachment_type text,
  attachment_name text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access chat_messages" ON public.chat_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

CREATE POLICY "Public upload chat-attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Public read chat-attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-attachments');
