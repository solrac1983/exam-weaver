
CREATE TABLE public.student_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  generated_by uuid NOT NULL,
  diagnostic_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage company diagnostics"
  ON public.student_diagnostics FOR ALL
  USING (
    (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Coordinators can manage company diagnostics"
  ON public.student_diagnostics FOR ALL
  USING (
    company_id = get_my_company_id() AND has_role(auth.uid(), 'coordinator'::app_role)
  )
  WITH CHECK (
    company_id = get_my_company_id() AND has_role(auth.uid(), 'coordinator'::app_role)
  );

CREATE POLICY "Professors can view company diagnostics"
  ON public.student_diagnostics FOR SELECT
  USING (
    has_role(auth.uid(), 'professor'::app_role) AND company_id = get_my_company_id()
  );

CREATE POLICY "Super admins can manage all diagnostics"
  ON public.student_diagnostics FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));
