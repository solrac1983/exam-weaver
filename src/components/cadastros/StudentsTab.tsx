import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Search, Plus, Pencil, Trash2, X, Loader2, Upload, ChevronsUpDown, Check, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import BulkStudentImport from "./BulkStudentImport";

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class_group: string;
  email: string;
}

interface StudentsTabProps {
  companyId: string;
}

const PAGE_SIZE = 20;

export default function StudentsTab({ companyId }: StudentsTabProps) {
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [email, setEmail] = useState("");
  const [classGroups, setClassGroups] = useState<string[]>([]);
  const [classPopoverOpen, setClassPopoverOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterClassGroup, setFilterClassGroup] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = (supabase as any)
      .from("students")
      .select("id, name, roll_number, class_group, email", { count: "exact" })
      .eq("company_id", companyId);

    if (search.trim()) {
      const s = search.trim();
      query = query.or(`name.ilike.%${s}%,class_group.ilike.%${s}%,roll_number.ilike.%${s}%`);
    }

    if (filterClassGroup) {
      query = query.eq("class_group", filterClassGroup);
    }

    const { data, error, count } = await query.order("name").range(from, to);
    if (error) { showInvokeError("Erro ao carregar alunos."); console.error(error); }
    setItems(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [companyId, page, search, filterClassGroup]);

  useEffect(() => { if (companyId) fetchItems(); }, [companyId, fetchItems]);

  // Fetch class_groups from the database
  const fetchClassGroups = useCallback(async () => {
    const { data } = await supabase
      .from("class_groups")
      .select("name")
      .eq("company_id", companyId)
      .order("name");
    setClassGroups((data || []).map((g) => g.name));
  }, [companyId]);

  useEffect(() => { if (companyId) fetchClassGroups(); }, [companyId, fetchClassGroups]);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search, filterClassGroup]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const openNew = () => { setEditing(null); setName(""); setRollNumber(""); setClassGroup(""); setEmail(""); setFormOpen(true); };
  const openEdit = (i: Student) => { setEditing(i); setName(i.name); setRollNumber(i.roll_number); setClassGroup(i.class_group); setEmail(i.email || ""); setFormOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) { showInvokeError("Preencha o nome do aluno."); return; }
    setSaving(true);
    const payload = { name: name.trim(), roll_number: rollNumber.trim(), class_group: classGroup.trim(), email: email.trim() };
    if (editing) {
      const { error } = await (supabase as any).from("students").update(payload).eq("id", editing.id);
      if (error) { showInvokeError(error.message); } else { showInvokeSuccess("Aluno atualizado!"); }
    } else {
      const { error } = await (supabase as any).from("students").insert({ ...payload, company_id: companyId });
      if (error) { showInvokeError(error.message); } else { showInvokeSuccess("Aluno cadastrado!"); }
    }
    setSaving(false);
    setFormOpen(false);
    fetchItems();
  };

  const handleDelete = async () => {
    if (deleting) {
      const { error } = await (supabase as any).from("students").delete().eq("id", deleting.id);
      if (error) { showInvokeError(error.message); } else { showInvokeSuccess("Aluno excluído."); fetchItems(); }
    }
    setDeleteOpen(false);
    setDeleting(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{totalCount} aluno(s)</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} className="gap-1.5"><FileSpreadsheet className="h-4 w-4" />Importar Planilha</Button>
          <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Novo Aluno</Button>
        </div>
      </div>

      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterClassGroup || "all"} onValueChange={(v) => setFilterClassGroup(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classGroups.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || filterClassGroup) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterClassGroup(""); }} className="text-xs gap-1"><X className="h-3 w-3" />Limpar</Button>
          )}
        </div>
      </div>

      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Nº</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Turma</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">E-mail</th>
              <th className="text-right px-4 py-3 font-semibold text-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{i.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.roll_number || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.class_group || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.email || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(i)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setDeleting(i); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Nenhum aluno encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
              let p: number;
              if (totalPages <= 7) {
                p = idx + 1;
              } else if (page <= 4) {
                p = idx + 1;
              } else if (page >= totalPages - 3) {
                p = totalPages - 6 + idx;
              } else {
                p = page - 3 + idx;
              }
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
            <DialogDescription>{editing ? "Atualize os dados do aluno." : "Preencha os dados do novo aluno."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nº (Matrícula)</Label>
                <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="Ex: 001" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Turma</Label>
                <Popover open={classPopoverOpen} onOpenChange={setClassPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {classGroup || "Selecione ou digite..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar turma..."
                        value={classGroup}
                        onValueChange={setClassGroup}
                      />
                      <CommandList>
                        <CommandEmpty className="py-2 px-3 text-xs text-muted-foreground">
                          {classGroup ? `Usar "${classGroup}"` : "Nenhuma turma encontrada."}
                        </CommandEmpty>
                        <CommandGroup>
                          {classGroups.map((g) => (
                            <CommandItem
                              key={g}
                              value={g}
                              onSelect={(val) => {
                                setClassGroup(val);
                                setClassPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", classGroup === g ? "opacity-100" : "opacity-0")} />
                              {g}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aluno@email.com" />
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
            <AlertDialogTitle>Excluir aluno</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{deleting?.name}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BulkStudentImport companyId={companyId} open={bulkOpen} onOpenChange={setBulkOpen} onImported={fetchItems} classGroups={classGroups} />
    </div>
  );
}
