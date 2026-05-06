CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(_user_id = auth.uid(), false)
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(_user_id = auth.uid(), false) THEN (
      SELECT role
      FROM public.user_roles
      WHERE user_id = _user_id
      LIMIT 1
    )
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.is_chat_member(_user_id text, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(_user_id = auth.uid()::text, false)
    AND (
      EXISTS (
        SELECT 1
        FROM public.chat_conversations
        WHERE id = _conversation_id
          AND (participant_1 = _user_id OR participant_2 = _user_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.chat_conversation_participants
        WHERE user_id = _user_id
          AND conversation_id = _conversation_id
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id text, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(_user_id = auth.uid()::text, false)
    AND EXISTS (
      SELECT 1
      FROM public.chat_conversation_participants
      WHERE user_id = _user_id
        AND conversation_id = _conversation_id
    )
$$;

CREATE OR REPLACE FUNCTION public.is_company_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE WHEN COALESCE(_user_id = auth.uid(), false) THEN (
      SELECT c.billing_blocked
      FROM public.companies c
      JOIN public.profiles p ON p.company_id = c.id
      WHERE p.id = _user_id
      LIMIT 1
    ) ELSE false END,
    false
  )
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_block_overdue_companies() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_company_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_chat_member(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_company_blocked(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_member(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_blocked(uuid) TO authenticated;