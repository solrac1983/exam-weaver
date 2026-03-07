import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface Grade {
  id: string;
  student_id: string;
  company_id: string;
  subject_id: string | null;
  class_group: string;
  grade_type: string;
  bimester: string;
  score: number;
  max_score: number;
  evaluation_name: string;
  simulado_result_id: string | null;
  notes: string;
  recorded_by: string;
  created_at: string;
  updated_at: string;
  // joined
  student_name?: string;
  subject_name?: string;
}

interface UseGradesOptions {
  companyId: string;
  classGroup?: string;
  subjectId?: string;
  bimester?: string;
}

export function useGrades({ companyId, classGroup, subjectId, bimester }: UseGradesOptions) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchGrades = useCallback(async () => {
    if (!companyId) { setGrades([]); setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from("grades")
      .select("*, students!inner(name), subjects(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (classGroup) query = query.eq("class_group", classGroup);
    if (subjectId) query = query.eq("subject_id", subjectId);
    if (bimester) query = query.eq("bimester", bimester);

    const { data, error } = await query.limit(500);
    if (error) {
      console.error("Error fetching grades:", error);
      setGrades([]);
    } else {
      setGrades((data || []).map((g: any) => ({
        ...g,
        student_name: g.students?.name || "",
        subject_name: g.subjects?.name || "",
      })));
    }
    setLoading(false);
  }, [companyId, classGroup, subjectId, bimester]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const addGrade = async (grade: Omit<Grade, "id" | "created_at" | "updated_at" | "student_name" | "subject_name">) => {
    const { error } = await supabase.from("grades").insert(grade as any);
    if (error) {
      toast({ title: "Erro ao salvar nota", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Nota registrada com sucesso!" });
    fetchGrades();
    return true;
  };

  const addGradesBatch = async (gradesList: Omit<Grade, "id" | "created_at" | "updated_at" | "student_name" | "subject_name">[]) => {
    const { error } = await supabase.from("grades").insert(gradesList as any[]);
    if (error) {
      toast({ title: "Erro ao salvar notas", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: `${gradesList.length} nota(s) registrada(s) com sucesso!` });
    fetchGrades();
    return true;
  };

  const deleteGrade = async (id: string) => {
    const { error } = await supabase.from("grades").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir nota", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Nota excluída!" });
    fetchGrades();
    return true;
  };

  return { grades, loading, fetchGrades, addGrade, addGradesBatch, deleteGrade };
}
