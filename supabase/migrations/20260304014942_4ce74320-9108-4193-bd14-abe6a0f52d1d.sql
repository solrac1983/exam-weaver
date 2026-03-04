
-- Drop the fragile name-based policy
DROP POLICY IF EXISTS "Professors can view own demands" ON public.demands;

-- Recreate using email matching (more reliable)
CREATE POLICY "Professors can view own demands"
ON public.demands
FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND company_id = get_my_company_id()
  AND teacher_id IN (
    SELECT t.id FROM public.teachers t
    JOIN public.profiles p ON p.email = t.email
    WHERE p.id = auth.uid()
      AND t.company_id = get_my_company_id()
  )
);
