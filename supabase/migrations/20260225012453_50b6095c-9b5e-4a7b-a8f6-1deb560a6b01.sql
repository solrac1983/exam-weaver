
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Public access template_headers" ON public.template_headers;
DROP POLICY IF EXISTS "Public access template_documents" ON public.template_documents;

CREATE POLICY "Public access template_headers"
  ON public.template_headers
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access template_documents"
  ON public.template_documents
  FOR ALL
  USING (true)
  WITH CHECK (true);
