import { useState } from "react";
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
import { Building2, Plus, Loader2, Trash2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_users: number;
  active: boolean;
  created_at: string;
}

interface CompaniesSectionProps {
  companies: Company[];
  loading: boolean;
  onRefresh: () => void;
}

const planLabel: Record<string, string> = {
  free: "Gratuito",
  basic: "Básico",
  pro: "Profissional",
  enterprise: "Empresarial",
};

export default function CompaniesSection({ companies, loading, onRefresh }: CompaniesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companyPage, setCompanyPage] = useState(1);
  const itemsPerPage = 10;

  // Create form
  const [newCompany, setNewCompany] = useState({ name: "", slug: "", plan: "free", max_users: 50 });

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", plan: "free", max_users: 50, active: true });

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreateCompany = async () => {
    if (!newCompany.name || !newCompany.slug) {
      toast.error("Preencha nome e slug.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("companies").insert(newCompany);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Empresa criada!");
      setDialogOpen(false);
      setNewCompany({ name: "", slug: "", plan: "free", max_users: 50 });
      onRefresh();
    }
  };

  const openEdit = (c: Company) => {
    setEditCompany(c);
    setEditForm({ name: c.name, slug: c.slug, plan: c.plan, max_users: c.max_users, active: c.active });
    setEditDialogOpen(true);
  };

  const handleEditCompany = async () => {
    if (!editCompany || !editForm.name || !editForm.slug) {
      toast.error("Preencha nome e slug.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("companies").update({
      name: editForm.name,
      slug: editForm.slug,
      plan: editForm.plan,
      max_users: editForm.max_users,
      active: editForm.active,
    }).eq("id", editCompany.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Empresa atualizada!");
      setEditDialogOpen(false);
      setEditCompany(null);
      onRefresh();
    }
  };

  const openDelete = (c: Company) => {
    setCompanyToDelete(c);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("companies").delete().eq("id", companyToDelete.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Empresa excluída!");
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
      onRefresh();
    }
  };

  const filtered = companies.filter((c) => {
    const q = companySearch.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(companyPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Empresas
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova empresa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar empresa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Nome da escola" value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Slug (identificador único)</Label>
                <Input placeholder="minha-escola" value={newCompany.slug}
                  onChange={(e) => setNewCompany({ ...newCompany, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={newCompany.plan} onValueChange={(v) => setNewCompany({ ...newCompany, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Gratuito</SelectItem>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="pro">Profissional</SelectItem>
                    <SelectItem value="enterprise">Empresarial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Máx. usuários</Label>
                <Input type="number" min={1} value={newCompany.max_users}
                  onChange={(e) => setNewCompany({ ...newCompany, max_users: Number(e.target.value) })} />
              </div>
              <Button onClick={handleCreateCompany} className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar empresa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa por nome ou slug..."
            value={companySearch}
            onChange={(e) => { setCompanySearch(e.target.value); setCompanyPage(1); }}
            className="pl-9 h-9"
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {companySearch ? `Nenhuma empresa encontrada para "${companySearch}"` : "Nenhuma empresa cadastrada"}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Máx. Usuários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                    <TableCell><Badge variant="secondary">{planLabel[c.plan] || c.plan}</Badge></TableCell>
                    <TableCell>{c.max_users}</TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "default" : "destructive"}>
                        {c.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDelete(c)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} empresa(s) — Página {safePage} de {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCompanyPage(safePage - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCompanyPage(safePage + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar empresa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={editForm.plan} onValueChange={(v) => setEditForm({ ...editForm, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="pro">Profissional</SelectItem>
                  <SelectItem value="enterprise">Empresarial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Máx. usuários</Label>
              <Input type="number" min={1} value={editForm.max_users} onChange={(e) => setEditForm({ ...editForm, max_users: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.active ? "active" : "inactive"} onValueChange={(v) => setEditForm({ ...editForm, active: v === "active" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditCompany} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa <strong>{companyToDelete?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
