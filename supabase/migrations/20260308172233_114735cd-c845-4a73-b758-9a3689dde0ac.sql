
-- Table to log AI token usage per request
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'lovable',
  model text NOT NULL DEFAULT '',
  feature text NOT NULL DEFAULT 'general',
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_estimate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table to manage external AI provider API keys
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  api_key_encrypted text NOT NULL DEFAULT '',
  base_url text NOT NULL DEFAULT '',
  models text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for ai_usage_logs: only super admins
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage ai_usage_logs" ON public.ai_usage_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS for ai_providers: only super admins
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage ai_providers" ON public.ai_providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed default providers
INSERT INTO public.ai_providers (name, slug, base_url, models, is_active) VALUES
  ('Lovable AI (Padrão)', 'lovable', 'https://ai.gateway.lovable.dev/v1', ARRAY['gemini-2.5-flash', 'gemini-2.5-pro', 'gpt-5', 'gpt-5-mini'], true),
  ('Google Gemini', 'gemini', 'https://generativelanguage.googleapis.com/v1beta', ARRAY['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-3-flash-preview'], false),
  ('OpenAI ChatGPT', 'openai', 'https://api.openai.com/v1', ARRAY['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4o'], false),
  ('xAI Grok', 'grok', 'https://api.x.ai/v1', ARRAY['grok-3', 'grok-3-mini'], false),
  ('DeepSeek', 'deepseek', 'https://api.deepseek.com/v1', ARRAY['deepseek-chat', 'deepseek-reasoner'], false);
