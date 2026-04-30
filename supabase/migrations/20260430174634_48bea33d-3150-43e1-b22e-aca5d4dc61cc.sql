
-- =========================================================================
-- HARDEN COORDINATOR POLICIES: require coordinator OR admin role
-- =========================================================================

-- Helper expression used: (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator') OR has_role(auth.uid(),'admin')))

-- ---------- simulados ----------
DROP POLICY IF EXISTS "Coordinators can insert simulados" ON public.simulados;
DROP POLICY IF EXISTS "Coordinators can update simulados" ON public.simulados;
DROP POLICY IF EXISTS "Coordinators can delete simulados" ON public.simulados;

CREATE POLICY "Coordinators can insert simulados" ON public.simulados
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "Coordinators can update simulados" ON public.simulados
  FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "Coordinators can delete simulados" ON public.simulados
  FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

-- ---------- simulado_subjects ----------
DROP POLICY IF EXISTS "Coordinators can insert simulado_subjects" ON public.simulado_subjects;
DROP POLICY IF EXISTS "Coordinators can delete simulado_subjects" ON public.simulado_subjects;

CREATE POLICY "Coordinators can insert simulado_subjects" ON public.simulado_subjects
  FOR INSERT TO authenticated
  WITH CHECK (
    simulado_id IN (SELECT id FROM simulados WHERE company_id = get_my_company_id())
    AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  );
CREATE POLICY "Coordinators can delete simulado_subjects" ON public.simulado_subjects
  FOR DELETE TO authenticated
  USING (
    simulado_id IN (SELECT id FROM simulados WHERE company_id = get_my_company_id())
    AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  );

-- ---------- simulado_results ----------
DROP POLICY IF EXISTS "Coordinators can insert results" ON public.simulado_results;
DROP POLICY IF EXISTS "Coordinators can update results" ON public.simulado_results;
DROP POLICY IF EXISTS "Coordinators can delete results" ON public.simulado_results;

CREATE POLICY "Coordinators can insert results" ON public.simulado_results
  FOR INSERT TO authenticated
  WITH CHECK (
    simulado_id IN (SELECT id FROM simulados WHERE company_id = get_my_company_id())
    AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  );
CREATE POLICY "Coordinators can update results" ON public.simulado_results
  FOR UPDATE TO authenticated
  USING (
    simulado_id IN (SELECT id FROM simulados WHERE company_id = get_my_company_id())
    AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  );
CREATE POLICY "Coordinators can delete results" ON public.simulado_results
  FOR DELETE TO authenticated
  USING (
    simulado_id IN (SELECT id FROM simulados WHERE company_id = get_my_company_id())
    AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  );

-- ---------- students ----------
DROP POLICY IF EXISTS "Coordinators can insert students" ON public.students;
DROP POLICY IF EXISTS "Coordinators can update students" ON public.students;
DROP POLICY IF EXISTS "Coordinators can delete students" ON public.students;

CREATE POLICY "Coordinators can insert students" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "Coordinators can update students" ON public.students
  FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "Coordinators can delete students" ON public.students
  FOR DELETE TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

-- ---------- demands ----------
DROP POLICY IF EXISTS "Coordinators can insert demands" ON public.demands;
DROP POLICY IF EXISTS "Coordinators can update demands" ON public.demands;

CREATE POLICY "Coordinators can insert demands" ON public.demands
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "Coordinators can update demands" ON public.demands
  FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

-- ---------- segments / series / shifts / subjects / class_groups / teachers / questions ----------
DROP POLICY IF EXISTS "Coordinators can manage segments" ON public.segments;
CREATE POLICY "Coordinators can manage segments" ON public.segments
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)))
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

DROP POLICY IF EXISTS "Coordinators can manage series" ON public.series;
CREATE POLICY "Coordinators can manage series" ON public.series
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)))
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

DROP POLICY IF EXISTS "Coordinators can manage shifts" ON public.shifts;
CREATE POLICY "Coordinators can manage shifts" ON public.shifts
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)))
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

DROP POLICY IF EXISTS "Coordinators can manage subjects" ON public.subjects;
CREATE POLICY "Coordinators can manage subjects" ON public.subjects
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)))
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

DROP POLICY IF EXISTS "Coordinators can manage class_groups" ON public.class_groups;
CREATE POLICY "Coordinators can manage class_groups" ON public.class_groups
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)))
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

DROP POLICY IF EXISTS "Coordinators can manage teachers" ON public.teachers;
CREATE POLICY "Coordinators can manage teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)))
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

DROP POLICY IF EXISTS "Coordinators can manage questions" ON public.questions;
CREATE POLICY "Coordinators can manage questions" ON public.questions
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)))
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

-- =========================================================================
-- editor-images bucket: require authentication for read
-- =========================================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (qual LIKE '%editor-images%' OR with_check LIKE '%editor-images%')
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can read editor-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'editor-images');
