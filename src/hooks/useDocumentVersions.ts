import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type DocumentType = "standalone_exam" | "simulado_subject";

export interface DocumentVersion {
  id: string;
  document_type: DocumentType;
  document_id: string;
  version_number: number;
  title: string;
  content: string;
  label: string;
  created_by: string;
  company_id: string;
  created_at: string;
}

export function useDocumentVersions(documentType: DocumentType | null, documentId: string | null) {
  const { profile } = useAuth();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVersions = useCallback(async () => {
    if (!documentType || !documentId) {
      setVersions([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_type", documentType)
      .eq("document_id", documentId)
      .order("version_number", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar histórico de versões.");
      return;
    }
    setVersions((data as DocumentVersion[]) || []);
  }, [documentType, documentId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const createSnapshot = useCallback(
    async (content: string, title: string, label = "") => {
      if (!documentType || !documentId || !profile?.id || !profile?.company_id) return null;
      const next = (versions[0]?.version_number ?? 0) + 1;
      const { data, error } = await supabase
        .from("document_versions")
        .insert({
          document_type: documentType,
          document_id: documentId,
          version_number: next,
          title,
          content,
          label,
          created_by: profile.id,
          company_id: profile.company_id,
        })
        .select()
        .single();
      if (error) {
        toast.error("Erro ao salvar versão.");
        return null;
      }
      toast.success(`Versão ${next} salva.`);
      await fetchVersions();
      return data as DocumentVersion;
    },
    [documentType, documentId, profile, versions, fetchVersions]
  );

  const deleteVersion = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("document_versions").delete().eq("id", id);
      if (error) {
        toast.error("Não foi possível excluir esta versão.");
        return;
      }
      toast.success("Versão excluída.");
      await fetchVersions();
    },
    [fetchVersions]
  );

  return { versions, loading, createSnapshot, deleteVersion, refresh: fetchVersions };
}
