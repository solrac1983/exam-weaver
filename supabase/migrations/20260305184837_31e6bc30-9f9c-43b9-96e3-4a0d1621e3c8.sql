
-- Add columns for edit, forward, and soft-delete support
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_forwarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forwarded_from_name text,
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
