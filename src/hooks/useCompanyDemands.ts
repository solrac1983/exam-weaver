import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Demand } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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
  content: string | null;
  created_at: string;
  updated_at: string;
  teachers: { id: string; name: string } | null;
  subjects: { id: string; name: string } | null;
}

function mapDemands(data: DbDemand[]): Demand[] {
  return data.map((d) => ({
    id: d.id,
    coordinatorId: d.coordinator_id,
    coordinatorName: "",
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
}

async function fetchDemandsFromDb(): Promise<Demand[]> {
  const { data, error } = await supabase
    .from("demands")
    .select("*, teachers(id, name), subjects(id, name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching demands:", error);
    return [];
  }

  return mapDemands(data as unknown as DbDemand[]);
}

export function useCompanyDemands() {
  const { role, profile, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allDemands = [], isLoading } = useQuery({
    queryKey: ["company-demands", user?.id],
    queryFn: fetchDemandsFromDb,
    enabled: !!user,
    staleTime: 30_000, // 30s — avoid re-fetching on navigation
    gcTime: 5 * 60_000, // 5min cache
  });

  // Subscribe to realtime changes and invalidate cache
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("demands-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demands" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["company-demands"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // RLS already filters demands for professors, no need for client-side filter
  const companyDemands = useMemo(() => {
    return allDemands;
  }, [allDemands]);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["company-demands"] });

  return { companyDemands, loading: isLoading, refetch };
}
