-- Restore EXECUTE permissions for SECURITY DEFINER functions that are safe and necessary
-- for authenticated users. These functions only return data scoped to the calling user
-- (auth.uid()) or perform read-only checks, so they are safe to expose.

-- is_company_blocked: client calls this via supabase.rpc() to check billing status.
-- It only reads the blocked status of the caller's own company.
GRANT EXECUTE ON FUNCTION public.is_company_blocked(uuid) TO authenticated;

-- has_role: used by RLS policies and client-side role checks.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- get_my_company_id: used extensively in RLS policies; safe (returns only caller's own company id).
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;

-- get_user_role: used in RLS / app code; returns role for a user id (read-only).
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- Chat membership helpers: used by RLS for chat tables.
GRANT EXECUTE ON FUNCTION public.is_chat_member(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(text, uuid) TO authenticated;