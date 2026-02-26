
-- Fix profiles RLS: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix user_roles RLS: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix companies RLS: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Super admins can manage companies" ON public.companies;

CREATE POLICY "Authenticated users can view their company" ON public.companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Super admins can manage companies" ON public.companies
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
