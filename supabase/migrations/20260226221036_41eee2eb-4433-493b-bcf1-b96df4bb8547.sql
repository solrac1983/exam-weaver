ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS installment_number integer DEFAULT NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_installments integer DEFAULT NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS recurring_group_id uuid DEFAULT NULL;