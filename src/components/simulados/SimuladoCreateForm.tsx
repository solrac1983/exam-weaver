import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, GripVertical, Trash2, ArrowUp, ArrowDown, Save, ClipboardList, Settings2, Loader2 } from "lucide-react";
import { DocumentFormat, defaultFormat } from "@/hooks/useSimulados";
import { availableSubjects, fontFamilies, fontSizes } from "./SimuladoConstants";

interface Teacher { id: string; name: string; }

interface Props {
  teachers: Teacher[];
  onCancel: () => void;
  onCreate: (data: {
    title: string;
    class_groups: string[];
    application_date?: string;
    deadline?: string;
    format: DocumentFormat;
    subjects: { subject_name: string; question_count: number; type: string; teacher_id: string | null; sort_order: number }[];
  }) => Promise<any>;
}

export default function SimuladoCreateForm({ teachers, onCancel, onCreate }: Props) {
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClassGroups, setNewClassGroups] = useState("");
  const [newAppDate, setNewAppDate] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newFormat, setNewFormat] = useState<DocumentFormat>({ ...defaultFormat });
  const [newSubjects, setNewSubjects] = useState<{ id: string; subject_name: string; question_count: number; type: string; teacher_id: string }[]>([]);

  const [addSubjectName, setAddSubjectName] = useState("");
  const [addSubjectCount, setAddSubjectCount] = useState("5");
  const [addSubjectType, setAddSubjectType] = useState<"objetiva" | "discursiva">("objetiva");
  const [addSubjectTeacher, setAddSubjectTeacher] = useState("");

  const addSubjectToNew = () => {
    if (!addSubjectName) return;
    setNewSubjects((prev) => [...prev, {
      id: `ns-${Date.now()}`,
      subject_name: addSubjectName,
      question_count: addSubjectType === "discursiva" ? 1 : Math.max(1, parseInt(addSubjectCount) || 1),
      type: addSubjectType,
      teacher_id: addSubjectTeacher,
    }]);
    setAddSubjectName("");
    setAddSubjectCount("5");
    setAddSubjectType("objetiva");
    setAddSubjectTeacher("");
  };

  const removeSubject = (id: string) => setNewSubjects((prev) => prev.filter((s) => s.id !== id));

  const moveSubject = (index: number, dir: -1 | 1) => {
    setNewSubjects((prev) => {
      const list = [...prev];
      const target = index + dir;
      if (target < 0 || target >= list.length) return list;
      [list[index], list[target]] = [list[target], list[index]];
      return list;
    });
  };

  const updateFormat = (key: keyof DocumentFormat, value: any) => {
    setNewFormat((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!newTitle || newSubjects.length === 0) return;
    setSaving(true);
    await onCreate({
      title: newTitle,
      class_groups: newClassGroups.split(",").map((s) => s.trim()).filter(Boolean),
      application_date: newAppDate || undefined,
      deadline: newDeadline || undefined,
      format: newFormat,
      subjects: newSubjects.map((s, i) => ({
        subject_name: s.subject_name,
        question_count: s.question_count,
        type: s.type,
        teacher_id: s.teacher_id || null,
        sort_order: i,
      })),
    });
    setSaving(false);
  };

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" /> Criar Simulado
        </CardTitle>
        <CardDescription>Defina as disciplinas, a sequência e o número de questões.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input placeholder="Ex: Simulado ENEM – 2º Bimestre" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Turma(s)</Label>
            <Input placeholder="Ex: 3ºA, 3ºB" value={newClassGroups} onChange={(e) => setNewClassGroups(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data de Aplicação</Label>
            <Input type="date" value={newAppDate} onChange={(e) => setNewAppDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Prazo para Envio</Label>
            <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
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
              <Select value={newFormat.fontFamily} onValueChange={(v) => updateFormat("fontFamily", v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{fontFamilies.map((f) => <SelectItem key={f} value={f}><span style={{ fontFamily: f }}>{f}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tamanho (pt)</Label>
              <Select value={newFormat.fontSize} onValueChange={(v) => updateFormat("fontSize", v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{fontSizes.map((s) => <SelectItem key={s} value={s}>{s} pt</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Colunas</Label>
              <Select value={newFormat.columns} onValueChange={(v) => updateFormat("columns", v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Coluna</SelectItem>
                  <SelectItem value="2">2 Colunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Margens</Label>
              <Select value={newFormat.margins} onValueChange={(v) => updateFormat("margins", v)}>
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
              <Select value={newFormat.questionSpacing} onValueChange={(v) => updateFormat("questionSpacing", v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compacto</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="wide">Espaçado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={newFormat.headerEnabled} onCheckedChange={(v) => updateFormat("headerEnabled", v)} />
              <Label className="text-xs">Cabeçalho</Label>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={newFormat.footerEnabled} onCheckedChange={(v) => updateFormat("footerEnabled", v)} />
              <Label className="text-xs">Rodapé</Label>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={newFormat.pageNumbering} onCheckedChange={(v) => updateFormat("pageNumbering", v)} />
              <Label className="text-xs">Nº de Página</Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Add subject */}
        <div>
          <Label className="mb-2 block font-semibold">Adicionar Disciplina</Label>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[180px] flex-1">
              <Label className="text-xs text-muted-foreground">Disciplina</Label>
              <Select value={addSubjectName} onValueChange={setAddSubjectName}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{availableSubjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
            <Button type="button" onClick={addSubjectToNew} size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </div>

        {/* Subject list */}
        {newSubjects.length > 0 && (
          <div className="space-y-2">
            <Label className="font-semibold">
              Sequência de Disciplinas ({newSubjects.reduce((s, x) => s + (x.type === "discursiva" ? 0 : x.question_count), 0)} questões objetivas)
            </Label>
            <div className="rounded-lg border border-border overflow-hidden">
              {newSubjects.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 bg-card even:bg-muted/30 border-b last:border-b-0 border-border">
                  <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                  <span className="text-sm font-semibold text-muted-foreground w-6">{i + 1}.</span>
                  <span className="text-sm font-medium flex-1">{s.subject_name}</span>
                  <Badge variant="outline" className="text-xs">{s.type === "discursiva" ? "Discursiva" : `${s.question_count} questões`}</Badge>
                  {s.teacher_id && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">→ {teachers.find((t) => t.id === s.teacher_id)?.name}</span>
                  )}
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSubject(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSubject(i, 1)} disabled={i === newSubjects.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeSubject(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleCreate} className="gap-2" disabled={saving || !newTitle || newSubjects.length === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Criar Simulado
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
