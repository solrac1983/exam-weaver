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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, X, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BulkSubjectImport from "./BulkSubjectImport";

interface Subject {
  id: string;
  name: string;
  code: string;
  area: string;
}

const areaOptions = ["Linguagens", "Matemática", "Ciências da Natureza", "Ciências Humanas"];

interface SubjectsTabProps {
  companyId: string;
}

export default function SubjectsTab({ companyId }: SubjectsTabProps) {
  const [items, setItems] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", code: "", area: "" });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, code, area")
      .eq("company_id", companyId)
      .order("name");
    if (error) { toast.error("Erro ao carregar disciplinas."); console.error(error); }
    setItems((data || []).map((d: any) => ({ id: d.id, name: d.name, code: d.code || "", area: d.area || "" })));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { if (companyId) fetchItems(); }, [companyId, fetchItems]);

  const filtered = useMemo(() => {
    let r = items;
    if (filterArea !== "all") r = r.filter((s) => s.area === filterArea);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.area.toLowerCase().includes(q));
    }
    return r;
  }, [items, search, filterArea]);

  const openNew = () => { setEditing(null); setForm({ name: "", code: "", area: "" }); setFormOpen(true); };
  const openEdit = (s: Subject) => { setEditing(s); setForm({ name: s.name, code: s.code, area: s.area }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error("Preencha nome e código."); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("subjects").update({ name: form.name.trim(), code: form.code.trim(), area: form.area }).eq("id", editing.id);
      if (error) { toast.error(error.message); } else { toast.success("Disciplina atualizada!"); }
    } else {
      const { error } = await supabase.from("subjects").insert({ name: form.name.trim(), code: form.code.trim(), area: form.area, company_id: companyId });
      if (error) { toast.error(error.message); } else { toast.success("Disciplina cadastrada!"); }
    }
    setSaving(false);
    setFormOpen(false);
    fetchItems();
  };

  const handleDelete = async () => {
    if (deleting) {
      const { error } = await supabase.from("subjects").delete().eq("id", deleting.id);
      if (error) { toast.error(error.message); } else { toast.success("Disciplina excluída."); fetchItems(); }
    }
    setDeleteOpen(false); setDeleting(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} disciplina(s)</p>
        <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Nova Disciplina</Button>
      </div>

      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar disciplina..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas áreas</SelectItem>
              {areaOptions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || filterArea !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterArea("all"); }} className="text-xs gap-1"><X className="h-3 w-3" />Limpar</Button>
          )}
        </div>
      </div>

      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Código</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Área do conhecimento</th>
              <th className="text-right px-4 py-3 font-semibold text-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-mono font-medium">{s.code}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{s.area || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(s)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setDeleting(s); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Nenhuma disciplina encontrada.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
            <DialogDescription>{editing ? "Atualize as informações." : "Preencha os dados da nova disciplina."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Matemática" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Código *</Label><Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="Ex: MAT" maxLength={5} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Área do conhecimento</Label>
                <Select value={form.area} onValueChange={(v) => setForm((p) => ({ ...p, area: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{areaOptions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
            <AlertDialogTitle>Excluir disciplina</AlertDialogTitle>
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
