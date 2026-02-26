import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Company {
  id: string;
  name: string;
}

export function useCadastroCompany() {
  const { role, profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = role === "super_admin";

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      if (isSuperAdmin) {
        const { data } = await supabase.from("companies").select("id, name").eq("active", true).order("name");
        setCompanies(data || []);
      } else if (profile?.company_id) {
        setSelectedCompanyId(profile.company_id);
      }
      setLoading(false);
    };
    fetchCompanies();
  }, [isSuperAdmin, profile?.company_id]);

  return { companies, selectedCompanyId, setSelectedCompanyId, loading, isSuperAdmin };
}
