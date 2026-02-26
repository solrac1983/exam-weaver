
-- Series table
CREATE TABLE public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage all series" ON public.series FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can view own company series" ON public.series FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Segments table
CREATE TABLE public.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage all segments" ON public.segments FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can view own company segments" ON public.segments FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Shifts table
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage all shifts" ON public.shifts FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can view own company shifts" ON public.shifts FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Subjects table
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL DEFAULT '',
  area text DEFAULT '',
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage all subjects" ON public.subjects FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can view own company subjects" ON public.subjects FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Class groups table
CREATE TABLE public.class_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  segment text DEFAULT '',
  grade text DEFAULT '',
  shift text DEFAULT '',
  year integer NOT NULL DEFAULT 2026,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage all class_groups" ON public.class_groups FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can view own company class_groups" ON public.class_groups FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Teachers table
CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  cpf text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  subjects text[] DEFAULT '{}',
  class_groups text[] DEFAULT '{}',
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage all teachers" ON public.teachers FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can view own company teachers" ON public.teachers FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
