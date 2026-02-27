
-- Allow users to view profiles from their same company (for chat contacts)
CREATE POLICY "Users can view same company profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
