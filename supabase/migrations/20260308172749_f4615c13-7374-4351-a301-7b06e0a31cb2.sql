
-- Table for AI usage alert settings
CREATE TABLE public.ai_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Alerta padrão',
  monthly_token_limit bigint NOT NULL DEFAULT 1000000,
  daily_token_limit bigint NOT NULL DEFAULT 50000,
  alert_threshold_pct integer NOT NULL DEFAULT 80,
  alert_email text NOT NULL DEFAULT '',
  notify_in_app boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  last_alert_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_alert_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage ai_alert_settings" ON public.ai_alert_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Table for alert history/notifications
CREATE TABLE public.ai_alert_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL DEFAULT 'threshold',
  message text NOT NULL,
  tokens_used bigint NOT NULL DEFAULT 0,
  token_limit bigint NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_alert_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage ai_alert_notifications" ON public.ai_alert_notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed default alert setting
INSERT INTO public.ai_alert_settings (name, monthly_token_limit, daily_token_limit, alert_threshold_pct, notify_in_app)
VALUES ('Configuração padrão', 1000000, 50000, 80, true);
