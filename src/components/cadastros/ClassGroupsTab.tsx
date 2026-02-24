import { useState, useMemo } from "react";
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
import { Search, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface ClassGroup {
  id: string;
  name: string;
  segment: string;
  grade: string;
  shift: string;
  year: number;
}

const segmentOptions = ["Educação Infantil", "Anos Iniciais", "Anos Finais", "Ensino Médio", "Integral"];
const gradeOptions = ["1º ano", "2º ano", "3º ano"];
const shiftOptions = ["Manhã", "Tarde", "Integral"];

const initialClasses: ClassGroup[] = [
  { id: "cg-1", name: "1ºA", segment: "Ensino Médio", grade: "1º ano", shift: "Manhã", year: 2026 },
  { id: "cg-2", name: "1ºB", segment: "Ensino Médio", grade: "1º ano", shift: "Manhã", year: 2026 },
  { id: "cg-3", name: "2ºA", segment: "Ensino Médio", grade: "2º ano", shift: "Manhã", year: 2026 },
  { id: "cg-4", name: "2ºB", segment: "Ensino Médio", grade: "2º ano", shift: "Tarde", year: 2026 },
  { id: "cg-5", name: "2ºC", segment: "Ensino Médio", grade: "2º ano", shift: "Tarde", year: 2026 },
  { id: "cg-6", name: "3ºA", segment: "Ensino Médio", grade: "3º ano", shift: "Manhã", year: 2026 },
  { id: "cg-7", name: "3ºB", segment: "Ensino Médio", grade: "3º ano", shift: "Manhã", year: 2026 },
  { id: "cg-8", name: "3ºC", segment: "Ensino Médio", grade: "3º ano", shift: "Tarde", year: 2026 },
];

export default function ClassGroupsTab() {
  const [items, setItems] = useState<ClassGroup[]>(initialClasses);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSegment, setFilterSegment] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<ClassGroup | null>(null);
  const [deleting, setDeleting] = useState<ClassGroup | null>(null);
  const [form, setForm] = useState({ name: "", segment: "", grade: "", shift: "", year: 2026 });

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

  const handleSave = () => {
    if (!form.name.trim() || !form.segment || !form.grade || !form.shift) { toast.error("Preencha todos os campos."); return; }
    if (editing) {
      setItems((p) => p.map((c) => (c.id === editing.id ? { ...c, ...form } : c)));
      toast.success("Turma atualizada!");
    } else {
      setItems((p) => [...p, { id: `cg-${Date.now()}`, ...form }]);
      toast.success("Turma cadastrada!");
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (deleting) setItems((p) => p.filter((c) => c.id !== deleting.id));
    setDeleteOpen(false); setDeleting(null);
    toast.success("Turma excluída.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} turma(s)</p>
        <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Nova Turma</Button>
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
            <Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button>
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
