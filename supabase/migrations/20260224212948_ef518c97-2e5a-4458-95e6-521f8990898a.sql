
-- Storage buckets for template headers and documents
INSERT INTO storage.buckets (id, name, public) VALUES ('template-headers', 'template-headers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('template-documents', 'template-documents', true);

-- Allow public read access
CREATE POLICY "Public read template-headers" ON storage.objects FOR SELECT USING (bucket_id = 'template-headers');
CREATE POLICY "Allow upload template-headers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'template-headers');
CREATE POLICY "Allow delete template-headers" ON storage.objects FOR DELETE USING (bucket_id = 'template-headers');

CREATE POLICY "Public read template-documents" ON storage.objects FOR SELECT USING (bucket_id = 'template-documents');
CREATE POLICY "Allow upload template-documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'template-documents');
CREATE POLICY "Allow delete template-documents" ON storage.objects FOR DELETE USING (bucket_id = 'template-documents');

-- Table for header image metadata
CREATE TABLE public.template_headers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT,
  grade TEXT,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.template_headers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access template_headers" ON public.template_headers FOR ALL USING (true) WITH CHECK (true);

-- Table for document template metadata
CREATE TABLE public.template_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  segment TEXT,
  grade TEXT,
  category TEXT DEFAULT 'geral',
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.template_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access template_documents" ON public.template_documents FOR ALL USING (true) WITH CHECK (true);
