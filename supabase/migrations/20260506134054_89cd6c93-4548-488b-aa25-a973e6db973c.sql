
CREATE TABLE IF NOT EXISTS public.page_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_id text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS page_settings_user_scope_uidx
  ON public.page_settings (user_id, COALESCE(scope_id, '__user_default__'));

ALTER TABLE public.page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own page settings"
  ON public.page_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_page_settings_updated_at
  BEFORE UPDATE ON public.page_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
