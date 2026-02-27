
-- =============================================
-- FASE 1: Corrigir políticas RLS permissivas
-- =============================================

-- 1. chat_conversations: restringir ao participante autenticado
DROP POLICY IF EXISTS "Public access chat_conversations" ON public.chat_conversations;

CREATE POLICY "Users can view own conversations"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (
    participant_1 = auth.uid()::text
    OR participant_2 = auth.uid()::text
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can insert conversations"
  ON public.chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    participant_1 = auth.uid()::text
    OR participant_2 = auth.uid()::text
  );

CREATE POLICY "Users can update own conversations"
  ON public.chat_conversations FOR UPDATE
  TO authenticated
  USING (
    participant_1 = auth.uid()::text
    OR participant_2 = auth.uid()::text
  );

-- 2. chat_messages: restringir a participantes da conversa
DROP POLICY IF EXISTS "Public access chat_messages" ON public.chat_messages;

CREATE POLICY "Users can view messages in own conversations"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.chat_conversations
      WHERE participant_1 = auth.uid()::text
         OR participant_2 = auth.uid()::text
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = auth.uid()::text
    AND conversation_id IN (
      SELECT id FROM public.chat_conversations
      WHERE participant_1 = auth.uid()::text
         OR participant_2 = auth.uid()::text
    )
  );

CREATE POLICY "Users can update messages in own conversations"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.chat_conversations
      WHERE participant_1 = auth.uid()::text
         OR participant_2 = auth.uid()::text
    )
  );

-- 3. exam_comments: restringir a empresa via demand
DROP POLICY IF EXISTS "Public access exam_comments" ON public.exam_comments;

CREATE POLICY "Users can view exam comments for own company"
  ON public.exam_comments FOR SELECT
  TO authenticated
  USING (
    demand_id IN (
      SELECT id::text FROM public.demands
      WHERE company_id = get_my_company_id()
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can insert exam comments"
  ON public.exam_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    demand_id IN (
      SELECT id::text FROM public.demands
      WHERE company_id = get_my_company_id()
    )
  );

CREATE POLICY "Users can update exam comments"
  ON public.exam_comments FOR UPDATE
  TO authenticated
  USING (
    demand_id IN (
      SELECT id::text FROM public.demands
      WHERE company_id = get_my_company_id()
    )
  );

-- 4. template_documents: restringir a autenticados (leitura) e admins (escrita)
DROP POLICY IF EXISTS "Public access template_documents" ON public.template_documents;

CREATE POLICY "Authenticated users can view template_documents"
  ON public.template_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage template_documents"
  ON public.template_documents FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
  );

-- 5. template_headers: mesma lógica
DROP POLICY IF EXISTS "Public access template_headers" ON public.template_headers;

CREATE POLICY "Authenticated users can view template_headers"
  ON public.template_headers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage template_headers"
  ON public.template_headers FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
  );

-- 6. Adicionar políticas de CUD faltantes para tabelas de cadastro
-- class_groups: falta INSERT/UPDATE/DELETE para coordenadores
CREATE POLICY "Coordinators can manage class_groups"
  ON public.class_groups FOR ALL
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- subjects: falta INSERT/UPDATE/DELETE para coordenadores  
CREATE POLICY "Coordinators can manage subjects"
  ON public.subjects FOR ALL
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- segments: falta CUD
CREATE POLICY "Coordinators can manage segments"
  ON public.segments FOR ALL
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- series: falta CUD
CREATE POLICY "Coordinators can manage series"
  ON public.series FOR ALL
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- shifts: falta CUD
CREATE POLICY "Coordinators can manage shifts"
  ON public.shifts FOR ALL
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- teachers: falta CUD para coordenadores
CREATE POLICY "Coordinators can manage teachers"
  ON public.teachers FOR ALL
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());
