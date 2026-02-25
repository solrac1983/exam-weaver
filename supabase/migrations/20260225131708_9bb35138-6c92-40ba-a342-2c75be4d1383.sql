
CREATE TABLE public.exam_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_id TEXT NOT NULL,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow public access (no auth yet)
ALTER TABLE public.exam_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access exam_comments" ON public.exam_comments
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_comments;
