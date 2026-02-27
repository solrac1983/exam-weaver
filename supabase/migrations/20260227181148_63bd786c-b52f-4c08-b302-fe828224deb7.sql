
-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  roll_number TEXT NOT NULL DEFAULT '',
  class_group TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company students" ON public.students
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Coordinators can insert students" ON public.students
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Coordinators can update students" ON public.students
  FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "Coordinators can delete students" ON public.students
  FOR DELETE USING (company_id = get_my_company_id());

CREATE POLICY "Super admins can manage all students" ON public.students
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- Create simulado_results table
CREATE TABLE public.simulado_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulado_id UUID NOT NULL REFERENCES public.simulados(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  score NUMERIC NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(simulado_id, student_id)
);

ALTER TABLE public.simulado_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company results" ON public.simulado_results
  FOR SELECT USING (simulado_id IN (
    SELECT id FROM public.simulados WHERE company_id = get_my_company_id()
  ));

CREATE POLICY "Coordinators can insert results" ON public.simulado_results
  FOR INSERT WITH CHECK (simulado_id IN (
    SELECT id FROM public.simulados WHERE company_id = get_my_company_id()
  ));

CREATE POLICY "Coordinators can update results" ON public.simulado_results
  FOR UPDATE USING (simulado_id IN (
    SELECT id FROM public.simulados WHERE company_id = get_my_company_id()
  ));

CREATE POLICY "Coordinators can delete results" ON public.simulado_results
  FOR DELETE USING (simulado_id IN (
    SELECT id FROM public.simulados WHERE company_id = get_my_company_id()
  ));

CREATE POLICY "Super admins can manage all results" ON public.simulado_results
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));
