
-- Drop the existing broad SELECT policy for company users
DROP POLICY IF EXISTS "Users can view own company demands" ON public.demands;

-- Re-create: Super admins, admins and coordinators see all company demands
CREATE POLICY "Admins and coordinators can view company demands"
ON public.demands
FOR SELECT
USING (
  (company_id = get_my_company_id() AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'coordinator'::app_role)
  ))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Professors only see demands assigned to them (via teacher name match)
CREATE POLICY "Professors can view own demands"
ON public.demands
FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND company_id = get_my_company_id()
  AND teacher_id IN (
    SELECT t.id FROM public.teachers t
    JOIN public.profiles p ON p.full_name = t.name
    WHERE p.id = auth.uid()
    AND t.company_id = get_my_company_id()
  )
);
