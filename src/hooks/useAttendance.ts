import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AttendanceRecord {
  id: string;
  student_id: string;
  company_id: string;
  class_group: string;
  date: string;
  status: string;
  subject_id: string | null;
  notes: string;
  recorded_by: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  subject_name?: string;
}

interface UseAttendanceOptions {
  companyId: string;
  classGroup?: string;
  date?: string;
  subjectId?: string;
}

export function useAttendance({ companyId, classGroup, date, subjectId }: UseAttendanceOptions) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!companyId) { setRecords([]); setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from("attendance")
      .select("*, students!inner(name), subjects(name)")
      .eq("company_id", companyId)
      .order("date", { ascending: false });

    if (classGroup) query = query.eq("class_group", classGroup);
    if (date) query = query.eq("date", date);
    if (subjectId) query = query.eq("subject_id", subjectId);

    const { data, error } = await query.limit(500);
    if (error) {
      console.error("Error fetching attendance:", error);
      setRecords([]);
    } else {
      setRecords((data || []).map((r: any) => ({
        ...r,
        student_name: r.students?.name || "",
        subject_name: r.subjects?.name || "",
      })));
    }
    setLoading(false);
  }, [companyId, classGroup, date, subjectId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const upsertBatch = async (items: Omit<AttendanceRecord, "id" | "created_at" | "updated_at" | "student_name" | "subject_name">[]) => {
    const { error } = await supabase.from("attendance").upsert(items as any[], {
      onConflict: "student_id,date,subject_id",
    });
    if (error) {
      toast({ title: "Erro ao salvar frequência", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: `${items.length} registro(s) de frequência salvo(s)!` });
    fetchRecords();
    return true;
  };

  return { records, loading, fetchRecords, upsertBatch };
}
