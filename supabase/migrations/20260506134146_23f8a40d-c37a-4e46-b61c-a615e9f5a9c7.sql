
UPDATE public.page_settings SET scope_id = '__user_default__' WHERE scope_id IS NULL;
ALTER TABLE public.page_settings ALTER COLUMN scope_id SET DEFAULT '__user_default__';
ALTER TABLE public.page_settings ALTER COLUMN scope_id SET NOT NULL;
DROP INDEX IF EXISTS page_settings_user_scope_uidx;
ALTER TABLE public.page_settings ADD CONSTRAINT page_settings_user_scope_unique UNIQUE (user_id, scope_id);
