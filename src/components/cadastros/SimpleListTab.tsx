import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SimpleItem {
  id: string;
  name: string;
}

interface SimpleListTabProps {
  label: string;
  labelPlural: string;
  tableName: "series" | "segments" | "shifts";
  companyId: string;
}

export default function SimpleListTab({ label, labelPlural, tableName, companyId }: SimpleListTabProps) {
  const [items, setItems] = useState<SimpleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<SimpleItem | null>(null);
  const [deleting, setDeleting] = useState<SimpleItem | null>(null);
  const [name, setName] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(tableName)
      .select("id, name")
      .eq("company_id", companyId)
      .order("name");
    if (error) { toast.error("Erro ao carregar dados."); console.error(error); }
    setItems(data || []);
    setLoading(false);
  }, [tableName, companyId]);

  useEffect(() => { if (companyId) fetchItems(); }, [companyId, fetchItems]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(s));
  }, [items, search]);

  const openNew = () => { setEditing(null); setName(""); setFormOpen(true); };
  const openEdit = (i: SimpleItem) => { setEditing(i); setName(i.name); setFormOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Preencha o nome."); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from(tableName).update({ name: name.trim() }).eq("id", editing.id);
      if (error) { toast.error(error.message); } else { toast.success(`${label} atualizado(a)!`); }
    } else {
      const { error } = await supabase.from(tableName).insert({ name: name.trim(), company_id: companyId });
      if (error) { toast.error(error.message); } else { toast.success(`${label} cadastrado(a)!`); }
    }
    setSaving(false);
    setFormOpen(false);
    fetchItems();
  };

  const handleDelete = async () => {
    if (deleting) {
      const { error } = await supabase.from(tableName).delete().eq("id", deleting.id);
      if (error) { toast.error(error.message); } else { toast.success(`${label} excluído(a).`); fetchItems(); }
    }
    setDeleteOpen(false);
    setDeleting(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} {labelPlural.toLowerCase()}</p>
        <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Novo(a) {label}</Button>
      </div>

      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={`Buscar ${label.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="text-xs gap-1"><X className="h-3 w-3" />Limpar</Button>
          )}
        </div>
      </div>

      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-foreground">Nome</th>
              <th className="text-right px-4 py-3 font-semibold text-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{i.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(i)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setDeleting(i); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={2} className="px-4 py-12 text-center text-muted-foreground">Nenhum(a) {label.toLowerCase()} encontrado(a).</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${label}` : `Novo(a) ${label}`}</DialogTitle>
            <DialogDescription>{editing ? "Atualize o nome." : `Preencha o nome do(a) novo(a) ${label.toLowerCase()}.`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nome do(a) ${label.toLowerCase()}`} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {label.toLowerCase()}</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{deleting?.name}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
