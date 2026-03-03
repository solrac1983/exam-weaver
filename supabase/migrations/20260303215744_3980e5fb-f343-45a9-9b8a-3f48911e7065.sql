
-- Create questions table for the Question Bank
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  subject_name text NOT NULL DEFAULT '',
  class_group text NOT NULL DEFAULT '',
  bimester text NOT NULL DEFAULT '',
  topic text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'objetiva',
  difficulty text NOT NULL DEFAULT 'media',
  tags text[] NOT NULL DEFAULT '{}',
  author_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Coordinators/admins can do everything within their company
CREATE POLICY "Coordinators can manage questions"
ON public.questions FOR ALL
USING (company_id = get_my_company_id())
WITH CHECK (company_id = get_my_company_id());

-- Professors can view only their own questions
CREATE POLICY "Professors can view own questions"
ON public.questions FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND company_id = get_my_company_id()
  AND author_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- Professors can insert their own questions
CREATE POLICY "Professors can insert own questions"
ON public.questions FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'professor'::app_role)
  AND company_id = get_my_company_id()
  AND author_id = auth.uid()
);

-- Professors can update their own questions
CREATE POLICY "Professors can update own questions"
ON public.questions FOR UPDATE
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND company_id = get_my_company_id()
  AND author_id = auth.uid()
);

-- Professors can delete their own questions
CREATE POLICY "Professors can delete own questions"
ON public.questions FOR DELETE
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND company_id = get_my_company_id()
  AND author_id = auth.uid()
);

-- Super admins full access
CREATE POLICY "Super admins can manage all questions"
ON public.questions FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Index for performance
CREATE INDEX idx_questions_company_id ON public.questions(company_id);
CREATE INDEX idx_questions_subject_id ON public.questions(subject_id);
CREATE INDEX idx_questions_author_id ON public.questions(author_id);
