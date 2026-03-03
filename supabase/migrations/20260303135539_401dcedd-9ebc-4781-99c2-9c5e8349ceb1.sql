
-- Allow admins and coordinators to view roles of users in the same company
CREATE POLICY "Admins can view company user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'))
  AND user_id IN (
    SELECT p.id FROM public.profiles p
    WHERE p.company_id = get_my_company_id()
  )
);

-- Allow admins to update roles of users in the same company (not their own, not super_admin)
CREATE POLICY "Admins can update company user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  AND user_id != auth.uid()
  AND user_id IN (
    SELECT p.id FROM public.profiles p
    WHERE p.company_id = get_my_company_id()
  )
  AND role != 'super_admin'
)
WITH CHECK (
  role IN ('admin', 'coordinator', 'professor')
);
