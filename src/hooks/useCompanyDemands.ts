import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mockDemands, mockQuestions } from "@/data/mockData";
import { Demand, QuestionBankItem } from "@/types";

/**
 * Hook that filters mock demands and questions by the user's company.
 * - super_admin: sees everything
 * - admin/coordinator/professor: sees only data from teachers in their company
 * - professor additionally sees only their own data
 */
export function useCompanyDemands() {
  const { role, profile } = useAuth();
  const [companyTeacherNames, setCompanyTeacherNames] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === "super_admin") {
      setCompanyTeacherNames(null); // null = no filter
      setLoading(false);
      return;
    }

    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    const fetchTeachers = async () => {
      const { data } = await supabase
        .from("teachers")
        .select("name")
        .eq("company_id", profile.company_id!);
      
      if (data) {
        setCompanyTeacherNames(data.map((t) => t.name.toLowerCase()));
      }
      setLoading(false);
    };

    fetchTeachers();
  }, [role, profile?.company_id]);

  const companyDemands = useMemo((): Demand[] => {
    let base = mockDemands;

    // Filter by company teachers (admin, coordinator, professor)
    if (companyTeacherNames !== null) {
      base = base.filter((d) =>
        companyTeacherNames.includes(d.teacherName.toLowerCase())
      );
    }

    // Professor sees only their own
    if (role === "professor" && profile?.full_name) {
      base = base.filter(
        (d) => d.teacherName.toLowerCase() === profile.full_name.toLowerCase()
      );
    }

    return base;
  }, [companyTeacherNames, role, profile?.full_name]);

  const companyQuestions = useMemo((): QuestionBankItem[] => {
    let base = mockQuestions;

    if (companyTeacherNames !== null) {
      base = base.filter((q) =>
        companyTeacherNames.includes(q.authorName.toLowerCase())
      );
    }

    if (role === "professor" && profile?.full_name) {
      base = base.filter(
        (q) => q.authorName.toLowerCase() === profile.full_name.toLowerCase()
      );
    }

    return base;
  }, [companyTeacherNames, role, profile?.full_name]);

  return { companyDemands, companyQuestions, loading };
}
