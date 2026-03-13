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
import BulkClassGroupImport from "./BulkClassGroupImport";

interface ClassGroup {
  id: string;
  name: string;
  segment: string;
  grade: string;
  shift: string;
  year: number;
}

interface ClassGroupsTabProps {
  companyId: string;
}

export default function ClassGroupsTab({ companyId }: ClassGroupsTabProps) {
  const [items, setItems] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSegment, setFilterSegment] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<ClassGroup | null>(null);
  const [deleting, setDeleting] = useState<ClassGroup | null>(null);
  const [form, setForm] = useState({ name: "", segment: "", grade: "", shift: "", year: 2026 });
  const [bulkOpen, setBulkOpen] = useState(false);

  // Fetch dynamic options from company data
  const [segmentOptions, setSegmentOptions] = useState<string[]>([]);
  const [gradeOptions, setGradeOptions] = useState<string[]>([]);
  const [shiftOptions, setShiftOptions] = useState<string[]>([]);

  const fetchOptions = useCallback(async () => {
    const [segRes, serRes, shRes] = await Promise.all([
      supabase.from("segments").select("name").eq("company_id", companyId).order("name"),
      supabase.from("series").select("name").eq("company_id", companyId).order("name"),
      supabase.from("shifts").select("name").eq("company_id", companyId).order("name"),
    ]);
    setSegmentOptions((segRes.data || []).map((d: any) => d.name));
    setGradeOptions((serRes.data || []).map((d: any) => d.name));
    setShiftOptions((shRes.data || []).map((d: any) => d.name));
  }, [companyId]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("class_groups")
      .select("id, name, segment, grade, shift, year")
      .eq("company_id", companyId)
      .order("name");
    if (error) { toast.error("Erro ao carregar turmas."); console.error(error); }
    setItems((data || []).map((d: any) => ({ id: d.id, name: d.name, segment: d.segment || "", grade: d.grade || "", shift: d.shift || "", year: d.year })));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { if (companyId) { fetchItems(); fetchOptions(); } }, [companyId, fetchItems, fetchOptions]);

  const filtered = useMemo(() => {
    let r = items;
    if (filterSegment !== "all") r = r.filter((c) => c.segment === filterSegment);
    if (filterGrade !== "all") r = r.filter((c) => c.grade === filterGrade);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((c) => c.name.toLowerCase().includes(s) || c.grade.toLowerCase().includes(s) || c.shift.toLowerCase().includes(s) || c.segment.toLowerCase().includes(s));
    }
    return r;
  }, [items, search, filterGrade, filterSegment]);

  const openNew = () => { setEditing(null); setForm({ name: "", segment: "", grade: "", shift: "", year: 2026 }); setFormOpen(true); };
  const openEdit = (c: ClassGroup) => { setEditing(c); setForm({ name: c.name, segment: c.segment, grade: c.grade, shift: c.shift, year: c.year }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.segment || !form.grade || !form.shift) { toast.error("Preencha todos os campos."); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("class_groups").update({ name: form.name.trim(), segment: form.segment, grade: form.grade, shift: form.shift, year: form.year }).eq("id", editing.id);
      if (error) { toast.error(error.message); } else { toast.success("Turma atualizada!"); }
    } else {
      const { error } = await supabase.from("class_groups").insert({ name: form.name.trim(), segment: form.segment, grade: form.grade, shift: form.shift, year: form.year, company_id: companyId });
      if (error) { toast.error(error.message); } else { toast.success("Turma cadastrada!"); }
    }
    setSaving(false);
    setFormOpen(false);
    fetchItems();
  };

  const handleDelete = async () => {
    if (deleting) {
      const { error } = await supabase.from("class_groups").delete().eq("id", deleting.id);
      if (error) { toast.error(error.message); } else { toast.success("Turma excluída."); fetchItems(); }
    }
    setDeleteOpen(false); setDeleting(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} turma(s)</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} className="gap-1.5"><FileSpreadsheet className="h-4 w-4" />Importar Planilha</Button>
          <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Nova Turma</Button>
        </div>
      </div>

      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar turma..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterSegment} onValueChange={setFilterSegment}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos segmentos</SelectItem>
              {segmentOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Série" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas séries</SelectItem>
              {gradeOptions.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || filterGrade !== "all" || filterSegment !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterGrade("all"); setFilterSegment("all"); }} className="text-xs gap-1"><X className="h-3 w-3" />Limpar</Button>
          )}
        </div>
      </div>

      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Segmento</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Série</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Turno</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Ano</th>
              <th className="text-right px-4 py-3 font-semibold text-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px]">{c.segment}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{c.grade}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">{c.shift}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{c.year}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(c)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setDeleting(c); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhuma turma encontrada.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Turma" : "Nova Turma"}</DialogTitle>
            <DialogDescription>{editing ? "Atualize as informações da turma." : "Preencha os dados da nova turma."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: 1ºA" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Segmento *</Label>
              <Select value={form.segment} onValueChange={(v) => setForm((p) => ({ ...p, segment: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{segmentOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Série *</Label>
                <Select value={form.grade} onValueChange={(v) => setForm((p) => ({ ...p, grade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{gradeOptions.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Turno *</Label>
                <Select value={form.shift} onValueChange={(v) => setForm((p) => ({ ...p, shift: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{shiftOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Ano letivo</Label><Input type="number" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))} /></div>
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
            <AlertDialogTitle>Excluir turma</AlertDialogTitle>
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
