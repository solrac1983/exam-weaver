ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS print_settings jsonb NOT NULL DEFAULT '{"orientation":"portrait","margin":"normal"}'::jsonb;