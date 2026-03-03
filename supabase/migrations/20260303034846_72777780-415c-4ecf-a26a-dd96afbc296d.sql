
-- =============================================
-- FIX 1: Teachers - Restrict CPF/phone access
-- Only admins/coordinators/super_admins can see all teacher data
-- Professors can only see their own teacher record
-- =============================================
DROP POLICY IF EXISTS "Users can view own company teachers" ON public.teachers;

CREATE POLICY "Admins coordinators can view company teachers"
ON public.teachers FOR SELECT
USING (
  (company_id = get_my_company_id() AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'coordinator'::app_role)
  )) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Professors can view own teacher record"
ON public.teachers FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role) AND
  company_id = get_my_company_id() AND
  name = (SELECT full_name FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- =============================================
-- FIX 2: Students - Restrict email/data access
-- Only admins/coordinators can see student data
-- =============================================
DROP POLICY IF EXISTS "Users can view own company students" ON public.students;

CREATE POLICY "Admins coordinators can view company students"
ON public.students FOR SELECT
USING (
  (company_id = get_my_company_id() AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'coordinator'::app_role)
  )) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- =============================================
-- FIX 3: Simulado Results - Restrict to coordinators/admins
-- Prevents professors from seeing all student exam answers
-- =============================================
DROP POLICY IF EXISTS "Users can view own company results" ON public.simulado_results;

CREATE POLICY "Admins coordinators can view company results"
ON public.simulado_results FOR SELECT
USING (
  (simulado_id IN (
    SELECT id FROM simulados WHERE company_id = get_my_company_id()
  ) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'coordinator'::app_role)
  )) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- =============================================
-- FIX 4: Chat Attachments Bucket - Make private
-- Only authenticated users can access attachments
-- =============================================
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Storage policies for chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
