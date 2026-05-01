CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL CHECK (document_type IN ('standalone_exam', 'simulado_subject')),
  document_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL,
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_versions_doc ON public.document_versions(document_type, document_id, version_number DESC);
CREATE INDEX idx_document_versions_company ON public.document_versions(company_id);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view document versions"
ON public.document_versions FOR SELECT
TO authenticated
USING (company_id = public.get_my_company_id() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Company users can create document versions"
ON public.document_versions FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_my_company_id() AND created_by = auth.uid());

CREATE POLICY "Authors can delete their own versions"
ON public.document_versions FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));