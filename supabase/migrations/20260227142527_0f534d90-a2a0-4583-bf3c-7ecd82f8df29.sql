
-- Create demands table
CREATE TABLE public.demands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  coordinator_id uuid NOT NULL,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id),
  subject_id uuid NOT NULL REFERENCES public.subjects(id),
  class_groups text[] NOT NULL DEFAULT '{}',
  exam_type text NOT NULL DEFAULT 'mensal',
  deadline date NOT NULL,
  application_date date,
  status text NOT NULL DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all demands"
  ON public.demands FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Users can view demands from their company
CREATE POLICY "Users can view own company demands"
  ON public.demands FOR SELECT
  USING (company_id = get_my_company_id());

-- Coordinators/admins can insert demands for their company
CREATE POLICY "Coordinators can insert demands"
  ON public.demands FOR INSERT
  WITH CHECK (company_id = get_my_company_id());

-- Coordinators/admins can update demands for their company
CREATE POLICY "Coordinators can update demands"
  ON public.demands FOR UPDATE
  USING (company_id = get_my_company_id());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.demands;
