
-- Add billing_blocked column to companies
ALTER TABLE public.companies ADD COLUMN billing_blocked boolean NOT NULL DEFAULT false;

-- Function to block companies with overdue invoices
CREATE OR REPLACE FUNCTION public.check_and_block_overdue_companies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark invoices as overdue if past due_date and still pending
  UPDATE public.invoices
  SET status = 'overdue'
  WHERE status = 'pending' AND due_date < CURRENT_DATE;

  -- Block companies that have overdue invoices
  UPDATE public.companies
  SET billing_blocked = true
  WHERE id IN (
    SELECT DISTINCT company_id FROM public.invoices WHERE status = 'overdue'
  ) AND billing_blocked = false;

  -- Unblock companies that no longer have overdue invoices
  UPDATE public.companies
  SET billing_blocked = false
  WHERE billing_blocked = true
  AND id NOT IN (
    SELECT DISTINCT company_id FROM public.invoices WHERE status = 'overdue'
  );
END;
$$;

-- Security definer function to check if user's company is blocked
CREATE OR REPLACE FUNCTION public.is_company_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT c.billing_blocked 
     FROM public.companies c
     JOIN public.profiles p ON p.company_id = c.id
     WHERE p.id = _user_id
     LIMIT 1),
    false
  )
$$;
