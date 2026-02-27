
-- Simulados table
CREATE TABLE public.simulados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  coordinator_id uuid NOT NULL,
  title text NOT NULL,
  class_groups text[] NOT NULL DEFAULT '{}',
  application_date date,
  deadline date,
  status text NOT NULL DEFAULT 'draft',
  announcement text DEFAULT '',
  format jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company simulados"
  ON public.simulados FOR SELECT
  USING (company_id = get_my_company_id() OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Coordinators can insert simulados"
  ON public.simulados FOR INSERT
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Coordinators can update simulados"
  ON public.simulados FOR UPDATE
  USING (company_id = get_my_company_id());

CREATE POLICY "Coordinators can delete simulados"
  ON public.simulados FOR DELETE
  USING (company_id = get_my_company_id());

-- Simulado subjects table
CREATE TABLE public.simulado_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulado_id uuid NOT NULL REFERENCES public.simulados(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  question_count integer NOT NULL DEFAULT 5,
  type text NOT NULL DEFAULT 'objetiva',
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  content text DEFAULT '',
  answer_key text DEFAULT '',
  revision_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulado_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company simulado_subjects"
  ON public.simulado_subjects FOR SELECT
  USING (
    simulado_id IN (SELECT id FROM public.simulados WHERE company_id = get_my_company_id())
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Coordinators can insert simulado_subjects"
  ON public.simulado_subjects FOR INSERT
  WITH CHECK (
    simulado_id IN (SELECT id FROM public.simulados WHERE company_id = get_my_company_id())
  );

CREATE POLICY "Company users can update simulado_subjects"
  ON public.simulado_subjects FOR UPDATE
  USING (
    simulado_id IN (SELECT id FROM public.simulados WHERE company_id = get_my_company_id())
  );

CREATE POLICY "Coordinators can delete simulado_subjects"
  ON public.simulado_subjects FOR DELETE
  USING (
    simulado_id IN (SELECT id FROM public.simulados WHERE company_id = get_my_company_id())
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.simulados;
ALTER PUBLICATION supabase_realtime ADD TABLE public.simulado_subjects;
