import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Demand, QuestionBankItem } from "@/types";
import { mockQuestions } from "@/data/mockData";

interface DbDemand {
  id: string;
  company_id: string;
  coordinator_id: string;
  teacher_id: string;
  subject_id: string;
  class_groups: string[];
  exam_type: string;
  deadline: string;
  application_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  teachers: { id: string; name: string } | null;
  subjects: { id: string; name: string } | null;
}

export function useCompanyDemands() {
  const { role, profile, user } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDemands = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("demands")
      .select("*, teachers(id, name), subjects(id, name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching demands:", error);
      setLoading(false);
      return;
    }

    const mapped: Demand[] = (data as unknown as DbDemand[]).map((d) => ({
      id: d.id,
      coordinatorId: d.coordinator_id,
      coordinatorName: "", // could be enriched later
      teacherId: d.teacher_id,
      teacherName: d.teachers?.name ?? "—",
      subjectId: d.subject_id,
      subjectName: d.subjects?.name ?? "—",
      classGroups: d.class_groups ?? [],
      examType: d.exam_type as Demand["examType"],
      applicationDate: d.application_date ?? undefined,
      deadline: d.deadline,
      status: d.status as Demand["status"],
      notes: d.notes ?? undefined,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    // Professor sees only their own demands (by teacher_id matching their profile)
    // RLS already filters by company, but professor needs extra filter
    if (role === "professor" && profile?.full_name) {
      setDemands(
        mapped.filter(
          (d) => d.teacherName.toLowerCase() === profile.full_name.toLowerCase()
        )
      );
    } else {
      setDemands(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchDemands();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("demands-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demands" },
        () => {
          fetchDemands();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role, profile?.full_name]);

  // Keep companyQuestions from mock for now
  const companyQuestions = useMemo((): QuestionBankItem[] => {
    return mockQuestions;
  }, []);

  return { companyDemands: demands, companyQuestions, loading, refetch: fetchDemands };
}
