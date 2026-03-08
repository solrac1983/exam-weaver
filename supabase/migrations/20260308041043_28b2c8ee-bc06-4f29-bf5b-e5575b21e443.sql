CREATE TABLE public.standalone_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.standalone_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own standalone exams"
  ON public.standalone_exams FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view company standalone exams"
  ON public.standalone_exams FOR SELECT
  TO authenticated
  USING (
    (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );