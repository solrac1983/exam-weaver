ALTER TABLE public.companies ALTER COLUMN plan SET DEFAULT 'basic';
UPDATE public.companies SET plan = 'basic' WHERE plan = 'free';