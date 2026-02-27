import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SimuladoSubject {
  id: string;
  simulado_id: string;
  subject_name: string;
  question_count: number;
  type: "objetiva" | "discursiva";
  teacher_id: string | null;
  teacher_name?: string;
  sort_order: number;
  status: "pending" | "in_progress" | "submitted" | "approved" | "revision_requested";
  content: string;
  answer_key: string;
  revision_notes: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFormat {
  fontFamily: string;
  fontSize: string;
  columns: "1" | "2";
  margins: "normal" | "narrow" | "wide";
  headerEnabled: boolean;
  footerEnabled: boolean;
  pageNumbering: boolean;
  questionSpacing: "compact" | "normal" | "wide";
}

export const defaultFormat: DocumentFormat = {
  fontFamily: "Times New Roman",
  fontSize: "12",
  columns: "1",
  margins: "normal",
  headerEnabled: true,
  footerEnabled: true,
  pageNumbering: true,
  questionSpacing: "normal",
};

export interface Simulado {
  id: string;
  company_id: string;
  coordinator_id: string;
  title: string;
  class_groups: string[];
  application_date: string | null;
  deadline: string | null;
  status: "draft" | "sent" | "in_progress" | "complete";
  announcement: string;
  format: DocumentFormat;
  created_at: string;
  updated_at: string;
  subjects: SimuladoSubject[];
}

interface Teacher {
  id: string;
  name: string;
}

export function useSimulados() {
  const { user, profile, role } = useAuth();
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSimulados = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: simData, error: simError } = await supabase
      .from("simulados")
      .select("*")
      .order("created_at", { ascending: false });

    if (simError) {
      console.error("Error fetching simulados:", simError);
      setLoading(false);
      return;
    }

    const simIds = (simData || []).map((s: any) => s.id);

    let subjectsData: any[] = [];
    if (simIds.length > 0) {
      const { data: subs } = await supabase
        .from("simulado_subjects")
        .select("*, teachers(id, name)")
        .in("simulado_id", simIds)
        .order("sort_order", { ascending: true });
      subjectsData = subs || [];
    }

    const mapped: Simulado[] = (simData || []).map((s: any) => ({
      id: s.id,
      company_id: s.company_id,
      coordinator_id: s.coordinator_id,
      title: s.title,
      class_groups: s.class_groups || [],
      application_date: s.application_date,
      deadline: s.deadline,
      status: s.status as Simulado["status"],
      announcement: s.announcement || "",
      format: (s.format as DocumentFormat) || defaultFormat,
      created_at: s.created_at,
      updated_at: s.updated_at,
      subjects: subjectsData
        .filter((sub: any) => sub.simulado_id === s.id)
        .map((sub: any) => ({
          id: sub.id,
          simulado_id: sub.simulado_id,
          subject_name: sub.subject_name,
          question_count: sub.question_count,
          type: sub.type as SimuladoSubject["type"],
          teacher_id: sub.teacher_id,
          teacher_name: sub.teachers?.name || undefined,
          sort_order: sub.sort_order,
          status: sub.status as SimuladoSubject["status"],
          content: sub.content || "",
          answer_key: sub.answer_key || "",
          revision_notes: sub.revision_notes || "",
          created_at: sub.created_at,
          updated_at: sub.updated_at,
        })),
    }));

    // For professors, filter to only show simulados that have at least one subject assigned to them
    if (role === "professor" && profile?.full_name) {
      const profName = profile.full_name.toLowerCase();
      setSimulados(
        mapped
          .map((sim) => ({
            ...sim,
            subjects: sim.subjects.filter(
              (sub) => sub.teacher_name?.toLowerCase() === profName
            ),
          }))
          .filter((sim) => sim.subjects.length > 0)
      );
    } else {
      setSimulados(mapped);
    }

    setLoading(false);
  }, [user, role, profile?.full_name]);

  const fetchTeachers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("teachers").select("id, name").order("name");
    setTeachers(data || []);
  }, [user]);

  useEffect(() => {
    fetchSimulados();
    fetchTeachers();

    const ch1 = supabase
      .channel("simulados-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "simulados" }, () => fetchSimulados())
      .on("postgres_changes", { event: "*", schema: "public", table: "simulado_subjects" }, () => fetchSimulados())
      .subscribe();

    return () => { supabase.removeChannel(ch1); };
  }, [fetchSimulados, fetchTeachers]);

  const createSimulado = async (data: {
    title: string;
    class_groups: string[];
    application_date?: string;
    deadline?: string;
    format: DocumentFormat;
    subjects: { subject_name: string; question_count: number; type: string; teacher_id: string | null; sort_order: number }[];
  }) => {
    if (!profile?.company_id || !user) return null;

    const { data: simRow, error } = await supabase
      .from("simulados")
      .insert({
        company_id: profile.company_id,
        coordinator_id: user.id,
        title: data.title,
        class_groups: data.class_groups,
        application_date: data.application_date || null,
        deadline: data.deadline || null,
        format: data.format as any,
        status: "draft",
      })
      .select()
      .single();

    if (error || !simRow) {
      console.error("Error creating simulado:", error);
      return null;
    }

    if (data.subjects.length > 0) {
      const { error: subError } = await supabase
        .from("simulado_subjects")
        .insert(
          data.subjects.map((s) => ({
            simulado_id: simRow.id,
            subject_name: s.subject_name,
            question_count: s.question_count,
            type: s.type,
            teacher_id: s.teacher_id,
            sort_order: s.sort_order,
            status: "pending",
          }))
        );
      if (subError) console.error("Error creating subjects:", subError);
    }

    await fetchSimulados();
    return simRow.id;
  };

  const updateSimuladoStatus = async (id: string, status: string) => {
    await supabase.from("simulados").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    await fetchSimulados();
  };

  const updateSubjectStatus = async (subjectId: string, status: string, revisionNotes?: string) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (revisionNotes !== undefined) updates.revision_notes = revisionNotes;
    await supabase.from("simulado_subjects").update(updates).eq("id", subjectId);
    await fetchSimulados();
  };

  const updateSubjectContent = async (subjectId: string, content: string, answerKey: string) => {
    await supabase
      .from("simulado_subjects")
      .update({ content, answer_key: answerKey, updated_at: new Date().toISOString() })
      .eq("id", subjectId);
    await fetchSimulados();
  };

  const submitSubject = async (subjectId: string, content: string, answerKey: string) => {
    await supabase
      .from("simulado_subjects")
      .update({ content, answer_key: answerKey, status: "submitted", updated_at: new Date().toISOString() })
      .eq("id", subjectId);
    // Check if all subjects of this simulado are submitted/approved, then update simulado status
    await fetchSimulados();
  };

  const updateAnnouncement = async (simId: string, announcement: string) => {
    await supabase.from("simulados").update({ announcement }).eq("id", simId);
    await fetchSimulados();
  };

  const deleteSimulado = async (id: string) => {
    await supabase.from("simulados").delete().eq("id", id);
    await fetchSimulados();
  };

  return {
    simulados,
    teachers,
    loading,
    createSimulado,
    updateSimuladoStatus,
    updateSubjectStatus,
    updateSubjectContent,
    submitSubject,
    updateAnnouncement,
    deleteSimulado,
    refetch: fetchSimulados,
  };
}
