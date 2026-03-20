import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Shield, Search, UserCog } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyUser {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  coordinator: "Coordenador(a)",
  professor: "Professor(a)",
};

const roleBadgeVariant: Record<AppRole, "default" | "secondary" | "outline" | "destructive"> = {
  super_admin: "destructive",
  admin: "default",
  coordinator: "secondary",
  professor: "outline",
};

const editableRoles: AppRole[] = ["admin", "professor"];

export default function PermissionsTab({ companyId }: { companyId: string }) {
  const { role: myRole, user } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = myRole === "admin" || myRole === "super_admin";

  useEffect(() => {
    if (!companyId) return;
    fetchUsers();
  }, [companyId]);

  const fetchUsers = async () => {
    setLoading(true);
    // Get profiles for the company
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", companyId)
      .order("full_name");

    if (error || !profiles) {
      setLoading(false);
      return;
    }

    // Batch fetch roles
    const userIds = profiles.map((p) => p.id);
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const roleMap = new Map<string, AppRole>();
    rolesData?.forEach((r) => roleMap.set(r.user_id, r.role as AppRole));

    const mapped: CompanyUser[] = profiles.map((p) => ({
      id: p.id,
      full_name: p.full_name || p.email,
      email: p.email,
      role: roleMap.get(p.id) ?? "professor",
    }));

    setUsers(mapped);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingId(userId);
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Erro ao atualizar permissão", description: error.message, variant: "destructive" });
    } else {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast({ title: "Permissão atualizada com sucesso!" });
    }
    setUpdatingId(null);
  };

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="gap-1">
          <Shield className="h-3 w-3" />
          {users.length} usuário(s)
        </Badge>
      </div>

      {filtered.length === 0 ? (
        <Card className="py-12 flex flex-col items-center justify-center text-center">
          <UserCog className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const isSelf = u.id === user?.id;
            const isSuperAdmin = u.role === "super_admin";
            const canEdit = isAdmin && !isSelf && !isSuperAdmin;

            return (
              <Card key={u.id} className="flex items-center justify-between p-4 gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {u.full_name}
                    {isSelf && <span className="text-muted-foreground ml-1">(você)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>

                {canEdit ? (
                  <Select
                    value={u.role}
                    onValueChange={(v) => handleRoleChange(u.id, v as AppRole)}
                    disabled={updatingId === u.id}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {editableRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabels[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={roleBadgeVariant[u.role]} className="shrink-0">
                    {roleLabels[u.role]}
                  </Badge>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
