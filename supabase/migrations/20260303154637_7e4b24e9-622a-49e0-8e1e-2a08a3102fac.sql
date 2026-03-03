
-- 1. Migrate existing coordinator users to admin
UPDATE public.user_roles SET role = 'admin' WHERE role = 'coordinator';

-- 2. Update RLS policies that reference coordinator

-- demands: "Admins and coordinators can view company demands" -> remove coordinator check
DROP POLICY IF EXISTS "Admins and coordinators can view company demands" ON public.demands;
CREATE POLICY "Admins can view company demands"
  ON public.demands FOR SELECT TO authenticated
  USING (
    (company_id = get_my_company_id() AND (
      has_role(auth.uid(), 'admin'::app_role)
    ))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- user_roles: "Admins can view company user roles" - remove coordinator
DROP POLICY IF EXISTS "Admins can view company user roles" ON public.user_roles;
CREATE POLICY "Admins can view company user roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (SELECT p.id FROM profiles p WHERE p.company_id = get_my_company_id())
  );

-- user_roles: "Admins can update company user roles" - remove coordinator from allowed values
DROP POLICY IF EXISTS "Admins can update company user roles" ON public.user_roles;
CREATE POLICY "Admins can update company user roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id <> auth.uid()
    AND user_id IN (SELECT p.id FROM profiles p WHERE p.company_id = get_my_company_id())
    AND role <> 'super_admin'::app_role
  )
  WITH CHECK (role = ANY(ARRAY['admin'::app_role, 'professor'::app_role]));

-- students: "Admins coordinators can view company students" -> admins only
DROP POLICY IF EXISTS "Admins coordinators can view company students" ON public.students;
CREATE POLICY "Admins can view company students"
  ON public.students FOR SELECT TO authenticated
  USING (
    (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- teachers: "Admins coordinators can view company teachers" -> admins only
DROP POLICY IF EXISTS "Admins coordinators can view company teachers" ON public.teachers;
CREATE POLICY "Admins can view company teachers"
  ON public.teachers FOR SELECT TO authenticated
  USING (
    (company_id = get_my_company_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- simulado_results: "Admins coordinators can view company results" -> admins only
DROP POLICY IF EXISTS "Admins coordinators can view company results" ON public.simulado_results;
CREATE POLICY "Admins can view company results"
  ON public.simulado_results FOR SELECT TO authenticated
  USING (
    (simulado_id IN (SELECT id FROM simulados WHERE company_id = get_my_company_id())
     AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- template_documents: update to remove coordinator
DROP POLICY IF EXISTS "Admins can manage template_documents" ON public.template_documents;
CREATE POLICY "Admins can manage template_documents"
  ON public.template_documents FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- template_headers: update to remove coordinator
DROP POLICY IF EXISTS "Admins can manage template_headers" ON public.template_headers;
CREATE POLICY "Admins can manage template_headers"
  ON public.template_headers FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
