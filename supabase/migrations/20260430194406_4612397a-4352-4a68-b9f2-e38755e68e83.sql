UPDATE public.user_roles
SET role = 'coordinator'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'cord@provafacil.com');