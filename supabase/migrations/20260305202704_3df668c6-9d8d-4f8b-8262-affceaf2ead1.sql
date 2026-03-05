-- Drop old name-based policy for professors viewing teachers
DROP POLICY IF EXISTS "Professors can view own teacher record" ON public.teachers;

-- Create new email-based policy (more reliable than name matching)
CREATE POLICY "Professors can view own teacher record"
  ON public.teachers
  FOR SELECT
  USING (
    has_role(auth.uid(), 'professor'::app_role)
    AND company_id = get_my_company_id()
    AND email = (SELECT email FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );