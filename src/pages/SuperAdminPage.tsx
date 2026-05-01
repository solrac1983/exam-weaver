import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Crown, Loader2, Search, UserPlus, ShieldCheck, Pencil, Trash2, Brain } from "lucide-react";
import { toast } from "sonner";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { parseManageUserError } from "@/lib/manageUserErrors";
import CompaniesSection from "@/components/super-admin/CompaniesSection";
import AIManagementSection from "@/components/super-admin/AIManagementSection";

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
  const { role, user: currentUser } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCompanyFilter, setUserCompanyFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 10;

  // Create user dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "admin" as string, company_id: "" });
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit user dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", role: "professor" as string, company_id: "", password: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete user dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    super_admin: "Super Admin", admin: "Administrador", professor: "Professor",
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) { toast.error("Preencha todos os campos obrigatórios."); return; }
    if (newUser.password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres."); return; }
    if ((newUser.role === "admin" || newUser.role === "professor") && !newUser.company_id) {
      toast.error("Administradores e professores devem estar vinculados a uma escola.");
      return;
    }
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

  // Edit user
  const openEditUser = (u: UserWithRole) => {
    setEditUser(u);
    setEditForm({ full_name: u.full_name, email: u.email, role: u.role, company_id: u.company_id || "", password: "" });
    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!editUser || !editForm.full_name || !editForm.email) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if ((editForm.role === "admin" || editForm.role === "professor") && !editForm.company_id) {
      toast.error("Administradores e professores devem estar vinculados a uma escola.");
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSavingEdit(true);
    const body: Record<string, unknown> = {
      action: "update",
      user_id: editUser.id,
      full_name: editForm.full_name,
      email: editForm.email,
      role: editForm.role,
      company_id: editForm.company_id || null,
    };
    if (editForm.password) {
      body.password = editForm.password;
    }
    const { data, error } = await supabase.functions.invoke("manage-user", { body });
    setSavingEdit(false);
    if (error || data?.error) {
      const parsed = parseManageUserError(error, data);
      toast.error(parsed.message, {
        description: `Código: ${parsed.code}${parsed.field ? ` • Campo: ${parsed.field}` : ""}`,
      });
    } else {
      toast.success("Usuário atualizado com sucesso!");
      setEditDialogOpen(false);
      setEditUser(null);
      fetchData();
    }
  };

  // Delete user
  const openDeleteUser = (u: UserWithRole) => {
    setUserToDelete(u);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("manage-user", {
      body: { action: "delete", user_id: userToDelete.id },
    });
    setDeleting(false);
    if (error || data?.error) {
      const parsed = parseManageUserError(error, data);
      toast.error(parsed.message, {
        description: `Código: ${parsed.code}`,
      });
    } else {
      toast.success("Usuário excluído com sucesso!");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
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

      <Tabs defaultValue="empresas" className="w-full">
        <TabsList>
          <TabsTrigger value="empresas" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários ({users.length})
          </TabsTrigger>
          <TabsTrigger value="ia" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            IA & Tokens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresas">
          <CompaniesSection companies={companies} loading={loading} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="usuarios">
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
                          <SelectItem value="professor">Professor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Empresa vinculada {(newUser.role === "admin" || newUser.role === "professor") && <span className="text-destructive">*</span>}</Label>
                      <Select value={newUser.company_id || "none"} onValueChange={(v) => setNewUser({ ...newUser, company_id: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
                        <SelectContent>
                          {newUser.role === "super_admin" && <SelectItem value="none">Nenhuma</SelectItem>}
                          {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      {(newUser.role === "admin" || newUser.role === "professor") && !newUser.company_id && (
                        <p className="text-xs text-destructive">Obrigatório para este perfil</p>
                      )}
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
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Select value={u.role} onValueChange={(v) => handleChangeRole(u.id, v as AppRole)}>
                                <SelectTrigger className="w-[150px] h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="super_admin">Super Admin</SelectItem>
                                  <SelectItem value="admin">Administrador</SelectItem>
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
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(u)} title="Editar usuário">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => openDeleteUser(u)}
                                  title="Excluir usuário"
                                  disabled={isSelf}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
        </TabsContent>

        <TabsContent value="ia">
          <AIManagementSection />
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Editar usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nova senha <span className="text-muted-foreground text-xs">(deixe em branco para manter a atual)</span></Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empresa vinculada {(editForm.role === "admin" || editForm.role === "professor") && <span className="text-destructive">*</span>}</Label>
              <Select value={editForm.company_id || "none"} onValueChange={(v) => setEditForm({ ...editForm, company_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  {editForm.role === "super_admin" && <SelectItem value="none">Nenhuma</SelectItem>}
                  {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
              {(editForm.role === "admin" || editForm.role === "professor") && !editForm.company_id && (
                <p className="text-xs text-destructive">Obrigatório para este perfil</p>
              )}
            </div>
            <Button onClick={handleEditUser} className="w-full" disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.full_name || userToDelete?.email}</strong>? Esta ação não pode ser desfeita e todos os dados associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
