
-- Grades table: manual grades + can link to simulado results
CREATE TABLE public.grades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_group text NOT NULL DEFAULT '',
  grade_type text NOT NULL DEFAULT 'manual', -- 'manual', 'simulado', 'recuperacao'
  bimester text NOT NULL DEFAULT '1',
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 10,
  evaluation_name text NOT NULL DEFAULT '',
  simulado_result_id uuid REFERENCES public.simulado_results(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Attendance table
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  class_group text NOT NULL DEFAULT '',
  date date NOT NULL,
  status text NOT NULL DEFAULT 'present', -- 'present', 'absent', 'justified', 'late'
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, date, subject_id)
);

-- Enable RLS
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grades
CREATE POLICY "Admins can manage company grades" ON public.grades
  FOR ALL TO authenticated
  USING ((company_id = get_my_company_id() AND has_role(auth.uid(), 'admin')) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((company_id = get_my_company_id() AND has_role(auth.uid(), 'admin')) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Professors can manage own grades" ON public.grades
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'professor') AND company_id = get_my_company_id() AND recorded_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'professor') AND company_id = get_my_company_id() AND recorded_by = auth.uid());

CREATE POLICY "Super admins can manage all grades" ON public.grades
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for attendance
CREATE POLICY "Admins can manage company attendance" ON public.attendance
  FOR ALL TO authenticated
  USING ((company_id = get_my_company_id() AND has_role(auth.uid(), 'admin')) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK ((company_id = get_my_company_id() AND has_role(auth.uid(), 'admin')) OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Professors can manage own attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'professor') AND company_id = get_my_company_id() AND recorded_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'professor') AND company_id = get_my_company_id() AND recorded_by = auth.uid());

CREATE POLICY "Super admins can manage all attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- Triggers for updated_at
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
