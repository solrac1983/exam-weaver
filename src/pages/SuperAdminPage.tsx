import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Crown, Loader2, Search, UserPlus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth, AppRole } from "@/hooks/useAuth";
import CompaniesSection from "@/components/super-admin/CompaniesSection";

interface Company {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_users: number;
  active: boolean;
  created_at: string;
}

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  company_id: string | null;
  role: AppRole;
}

export default function SuperAdminPage() {
  const { role } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCompanyFilter, setUserCompanyFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 10;

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "admin" as string, company_id: "" });
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [compRes, profRes] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, company_id"),
    ]);
    if (compRes.data) setCompanies(compRes.data);
    if (profRes.data) {
      const rolesRes = await supabase.from("user_roles").select("user_id, role");
      const rolesMap: Record<string, AppRole> = {};
      rolesRes.data?.forEach((r: any) => { rolesMap[r.user_id] = r.role; });
      setUsers(profRes.data.map((p: any) => ({ ...p, role: rolesMap[p.id] || "professor" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleChangeRole = async (userId: string, newRole: AppRole) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    if (error) { toast.error(error.message); } else {
      toast.success("Perfil atualizado!");
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  const handleAssignCompany = async (userId: string, companyId: string | null) => {
    const { error } = await supabase.from("profiles").update({ company_id: companyId }).eq("id", userId);
    if (error) { toast.error(error.message); } else {
      toast.success("Empresa vinculada!");
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, company_id: companyId } : u));
    }
  };

  const roleLabel: Record<string, string> = {
    super_admin: "Super Admin", admin: "Administrador", coordinator: "Coordenador", professor: "Professor",
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) { toast.error("Preencha todos os campos obrigatórios."); return; }
    if (newUser.password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres."); return; }
    setCreatingUser(true);
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { email: newUser.email, password: newUser.password, full_name: newUser.full_name, role: newUser.role, company_id: newUser.company_id || null },
    });
    setCreatingUser(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Erro ao criar usuário."); } else {
      toast.success(`Usuário ${newUser.full_name} criado com sucesso!`);
      setUserDialogOpen(false);
      setNewUser({ full_name: "", email: "", password: "", role: "admin", company_id: "" });
      fetchData();
    }
  };

  if (role !== "super_admin") return null;

  const q = userSearch.toLowerCase();
  const filteredUsers = users.filter((u) => {
    const matchesCompany = userCompanyFilter === "all" ? true : userCompanyFilter === "none" ? !u.company_id : u.company_id === userCompanyFilter;
    const matchesSearch = !q || (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    return matchesCompany && matchesSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const safePage = Math.min(userPage, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <Crown className="h-6 w-6 text-accent" />
          Painel Super Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie empresas, planos e usuários do sistema</p>
      </div>

      <CompaniesSection companies={companies} loading={loading} onRefresh={fetchData} />

      {/* Users Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Usuários ({users.length})
          </CardTitle>
          <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Criar usuário</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Criar novo usuário
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo *</Label>
                  <Input placeholder="Nome do usuário" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input type="email" placeholder="email@empresa.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" placeholder="Mínimo 6 caracteres" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="coordinator">Coordenador</SelectItem>
                      <SelectItem value="professor">Professor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Empresa vinculada</Label>
                  <Select value={newUser.company_id || "none"} onValueChange={(v) => setNewUser({ ...newUser, company_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateUser} className="w-full" disabled={creatingUser}>
                  {creatingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar usuário
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou e-mail..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }} className="pl-9 h-9" />
            </div>
            <Select value={userCompanyFilter} onValueChange={(v) => { setUserCompanyFilter(v); setUserPage(1); }}>
              <SelectTrigger className="w-[220px] h-9">
                <Building2 className="h-4 w-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                <SelectItem value="none">Sem empresa</SelectItem>
                {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário encontrado</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Empresa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => handleChangeRole(u.id, v as AppRole)}>
                          <SelectTrigger className="w-[150px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="coordinator">Coordenador</SelectItem>
                            <SelectItem value="professor">Professor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={u.company_id || "none"} onValueChange={(v) => handleAssignCompany(u.id, v === "none" ? null : v)}>
                          <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">{filteredUsers.length} usuário(s) — Página {safePage} de {totalPages}</p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setUserPage(safePage - 1)}>Anterior</Button>
                    <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setUserPage(safePage + 1)}>Próxima</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
