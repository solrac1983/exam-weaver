import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, GripVertical, Trash2, ArrowUp, ArrowDown, Save, Settings2, Loader2, ChevronsUpDown, X, Pencil } from "lucide-react";
import { Simulado, SimuladoSubject, DocumentFormat } from "@/hooks/useSimulados";
import { fontFamilies, fontSizes } from "./SimuladoConstants";

interface Teacher { id: string; name: string; }
interface ClassGroup { id: string; name: string; }

interface SubjectRow {
  id: string;
  subject_name: string;
  question_count: number;
  type: string;
  teacher_id: string;
  isNew?: boolean;
}

interface SubjectOption { id: string; name: string; }

interface Props {
  sim: Simulado | null;
  teachers: Teacher[];
  classGroups: ClassGroup[];
  dbSubjects: SubjectOption[];
  onClose: () => void;
  onSave: (simId: string, data: {
    title: string;
    class_groups: string[];
    application_date: string | null;
    deadline: string | null;
    format: DocumentFormat;
    subjects: SubjectRow[];
  }) => Promise<void>;
}

export default function SimuladoEditDialog({ sim, teachers, classGroups, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [classGroupsOpen, setClassGroupsOpen] = useState(false);
  const [appDate, setAppDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [format, setFormat] = useState<DocumentFormat>({} as DocumentFormat);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);

  const [addSubjectName, setAddSubjectName] = useState("");
  const [addSubjectCount, setAddSubjectCount] = useState("5");
  const [addSubjectType, setAddSubjectType] = useState<"objetiva" | "discursiva">("objetiva");
  const [addSubjectTeacher, setAddSubjectTeacher] = useState("");

  useEffect(() => {
    if (sim) {
      setTitle(sim.title);
      setSelectedGroups(sim.class_groups || []);
      setAppDate(sim.application_date || "");
      setDeadline(sim.deadline || "");
      setFormat({ ...sim.format });
      setSubjects(sim.subjects.map(s => ({
        id: s.id,
        subject_name: s.subject_name,
        question_count: s.question_count,
        type: s.type,
        teacher_id: s.teacher_id || "",
      })));
    }
  }, [sim]);

  const updateFormat = (key: keyof DocumentFormat, value: any) => {
    setFormat(prev => ({ ...prev, [key]: value }));
  };

  const addSubject = () => {
    if (!addSubjectName) return;
    setSubjects(prev => [...prev, {
      id: `new-${Date.now()}`,
      subject_name: addSubjectName,
      question_count: addSubjectType === "discursiva" ? 1 : Math.max(1, parseInt(addSubjectCount) || 1),
      type: addSubjectType,
      teacher_id: addSubjectTeacher,
      isNew: true,
    }]);
    setAddSubjectName("");
    setAddSubjectCount("5");
    setAddSubjectType("objetiva");
    setAddSubjectTeacher("");
  };

  const removeSubject = (id: string) => setSubjects(prev => prev.filter(s => s.id !== id));

  const moveSubject = (index: number, dir: -1 | 1) => {
    setSubjects(prev => {
      const list = [...prev];
      const target = index + dir;
      if (target < 0 || target >= list.length) return list;
      [list[index], list[target]] = [list[target], list[index]];
      return list;
    });
  };

  const handleSave = async () => {
    if (!sim || !title) return;
    setSaving(true);
    await onSave(sim.id, {
      title,
      class_groups: selectedGroups,
      application_date: appDate || null,
      deadline: deadline || null,
      format,
      subjects,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={!!sim} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" /> Editar Simulado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Turma(s)</Label>
              <Popover open={classGroupsOpen} onOpenChange={setClassGroupsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-auto min-h-10">
                    {selectedGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedGroups.map((g) => (
                          <Badge key={g} variant="secondary" className="text-xs gap-1">
                            {g}
                            <X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedGroups(prev => prev.filter(x => x !== g)); }} />
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Selecione as turmas...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar turma..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma turma encontrada.</CommandEmpty>
                      <CommandGroup>
                        {classGroups.map((cg) => (
                          <CommandItem key={cg.id} value={cg.name} onSelect={() => {
                            setSelectedGroups(prev => prev.includes(cg.name) ? prev.filter(x => x !== cg.name) : [...prev, cg.name]);
                          }}>
                            <Checkbox checked={selectedGroups.includes(cg.name)} className="mr-2" />
                            {cg.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Data de Aplicação</Label>
              <Input type="date" value={appDate} onChange={(e) => setAppDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Prazo para Envio</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Format */}
          <div>
            <Label className="mb-3 block font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" /> Formatação do Documento
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border border-border bg-muted/20">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fonte</Label>
                <Select value={format.fontFamily} onValueChange={(v) => updateFormat("fontFamily", v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{fontFamilies.map((f) => <SelectItem key={f} value={f}><span style={{ fontFamily: f }}>{f}</span></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tamanho (pt)</Label>
                <Select value={format.fontSize} onValueChange={(v) => updateFormat("fontSize", v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{fontSizes.map((s) => <SelectItem key={s} value={s}>{s} pt</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Colunas</Label>
                <Select value={format.columns} onValueChange={(v) => updateFormat("columns", v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Coluna</SelectItem>
                    <SelectItem value="2">2 Colunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Margens</Label>
                <Select value={format.margins} onValueChange={(v) => updateFormat("margins", v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="narrow">Estreita</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="wide">Larga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Espaçamento</Label>
                <Select value={format.questionSpacing} onValueChange={(v) => updateFormat("questionSpacing", v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compacto</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="wide">Espaçado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch checked={format.headerEnabled} onCheckedChange={(v) => updateFormat("headerEnabled", v)} />
                <Label className="text-xs">Cabeçalho</Label>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch checked={format.footerEnabled} onCheckedChange={(v) => updateFormat("footerEnabled", v)} />
                <Label className="text-xs">Rodapé</Label>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch checked={format.pageNumbering} onCheckedChange={(v) => updateFormat("pageNumbering", v)} />
                <Label className="text-xs">Nº de Página</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Existing subjects */}
          {subjects.length > 0 && (
            <div className="space-y-2">
              <Label className="font-semibold">
                Disciplinas ({subjects.reduce((s, x) => s + (x.type === "discursiva" ? 0 : x.question_count), 0)} questões objetivas)
              </Label>
              <div className="rounded-lg border border-border overflow-hidden">
                {subjects.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 bg-card even:bg-muted/30 border-b last:border-b-0 border-border">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                    <span className="text-sm font-semibold text-muted-foreground w-6">{i + 1}.</span>
                    <span className="text-sm font-medium flex-1">{s.subject_name}</span>
                    <Badge variant="outline" className="text-xs">{s.type === "discursiva" ? "Discursiva" : `${s.question_count} questões`}</Badge>
                    {s.teacher_id && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">→ {teachers.find(t => t.id === s.teacher_id)?.name}</span>
                    )}
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSubject(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSubject(i, 1)} disabled={i === subjects.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeSubject(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add subject */}
          <div>
            <Label className="mb-2 block font-semibold">Adicionar Disciplina</Label>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 min-w-[180px] flex-1">
                <Label className="text-xs text-muted-foreground">Disciplina</Label>
                <Select value={addSubjectName} onValueChange={setAddSubjectName}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{dbSubjects.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-[100px]">
                <Label className="text-xs text-muted-foreground">Questões</Label>
                <Input type="number" min={1} value={addSubjectType === "discursiva" ? "1" : addSubjectCount} onChange={(e) => setAddSubjectCount(e.target.value)} disabled={addSubjectType === "discursiva"} />
              </div>
              <div className="space-y-1 min-w-[140px]">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={addSubjectType} onValueChange={(v) => setAddSubjectType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="objetiva">Objetiva</SelectItem>
                    <SelectItem value="discursiva">Discursiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-[180px]">
                <Label className="text-xs text-muted-foreground">Professor</Label>
                <Select value={addSubjectTeacher} onValueChange={setAddSubjectTeacher}>
                  <SelectTrigger><SelectValue placeholder="Vincular professor" /></SelectTrigger>
                  <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="button" onClick={addSubject} size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !title} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
