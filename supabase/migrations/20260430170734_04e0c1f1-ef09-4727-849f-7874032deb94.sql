REVOKE EXECUTE ON FUNCTION public.check_and_block_overdue_companies() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_my_company_id() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_chat_member(text, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(text, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_company_blocked(uuid) FROM anon, authenticated, public;