
-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view same company profiles" ON public.profiles;

-- Create a security definer function to get company_id
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$;

-- Recreate policy using the function
CREATE POLICY "Users can view same company profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_my_company_id());
