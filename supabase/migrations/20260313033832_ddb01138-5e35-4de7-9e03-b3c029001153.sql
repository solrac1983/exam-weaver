
-- Student feedback table for teacher comments, self-assessment, and peer feedback
CREATE TABLE public.student_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  feedback_type TEXT NOT NULL DEFAULT 'teacher_comment',
  category TEXT NOT NULL DEFAULT 'geral',
  bimester TEXT NOT NULL DEFAULT '1',
  content TEXT NOT NULL DEFAULT '',
  rating INTEGER,
  subject_id UUID REFERENCES public.subjects(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

-- Admins can manage all feedback in their company
CREATE POLICY "Admins can manage company feedback"
ON public.student_feedback
FOR ALL
TO authenticated
USING (
  ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Professors can manage their own feedback
CREATE POLICY "Professors can manage own feedback"
ON public.student_feedback
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND company_id = get_my_company_id()
  AND author_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'professor'::app_role)
  AND company_id = get_my_company_id()
  AND author_id = auth.uid()
);

-- All authenticated company users can view feedback
CREATE POLICY "Company users can view feedback"
ON public.student_feedback
FOR SELECT
TO authenticated
USING (
  company_id = get_my_company_id()
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Super admins full access
CREATE POLICY "Super admins can manage all feedback"
ON public.student_feedback
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Updated at trigger
CREATE TRIGGER update_student_feedback_updated_at
  BEFORE UPDATE ON public.student_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_student_feedback_student ON public.student_feedback(student_id);
CREATE INDEX idx_student_feedback_company ON public.student_feedback(company_id);
