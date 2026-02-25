import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  GripVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
  Send,
  Save,
  FileText,
  ClipboardList,
  MessageSquare,
  Eye,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SimuladoDisciplina {
  id: string;
  subjectName: string;
  questionCount: number;
  type: "objetiva" | "discursiva";
  teacherId?: string;
  teacherName?: string;
  status: "pending" | "submitted";
}

interface Simulado {
  id: string;
  title: string;
  classGroups: string[];
  applicationDate: string;
  deadline: string;
  subjects: SimuladoDisciplina[];
  status: "draft" | "sent" | "in_progress" | "complete";
  announcement?: string;
  createdAt: string;
}

const availableSubjects = [
  "Inglês",
  "Gramática",
  "Interpretação Textual",
  "Literatura",
  "Arte",
  "Educação Física",
  "Redação",
  "Geografia",
  "História",
  "Filosofia",
  "Sociologia",
  "Matemática",
  "Física",
  "Química",
  "Biologia",
  "Português",
];

const mockTeachers = [
  { id: "prof-1", name: "Carlos Oliveira" },
  { id: "prof-2", name: "Ana Santos" },
  { id: "prof-3", name: "Roberto Lima" },
  { id: "prof-4", name: "Fernanda Costa" },
  { id: "prof-5", name: "Paulo Mendes" },
];

/* ------------------------------------------------------------------ */
/*  Mock initial simulado                                              */
/* ------------------------------------------------------------------ */

const initialSimulados: Simulado[] = [
  {
    id: "sim-1",
    title: "Simulado ENEM – 1º Bimestre",
    classGroups: ["3ºA", "3ºB"],
    applicationDate: "2026-04-10",
    deadline: "2026-03-28",
    status: "in_progress",
    createdAt: "2026-02-20",
    subjects: [
      { id: "s1", subjectName: "Inglês", questionCount: 5, type: "objetiva", teacherId: "prof-2", teacherName: "Ana Santos", status: "submitted" },
      { id: "s2", subjectName: "Gramática", questionCount: 10, type: "objetiva", teacherId: "prof-2", teacherName: "Ana Santos", status: "pending" },
      { id: "s3", subjectName: "Geografia", questionCount: 15, type: "objetiva", teacherId: "prof-5", teacherName: "Paulo Mendes", status: "pending" },
      { id: "s4", subjectName: "História", questionCount: 15, type: "objetiva", teacherId: "prof-5", teacherName: "Paulo Mendes", status: "submitted" },
      { id: "s5", subjectName: "Redação", questionCount: 1, type: "discursiva", teacherId: "prof-2", teacherName: "Ana Santos", status: "pending" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helper: build question ranges from ordered list                    */
/* ------------------------------------------------------------------ */

function buildRanges(subjects: SimuladoDisciplina[]) {
  let current = 1;
  return subjects.map((s) => {
    if (s.type === "discursiva") {
      return { ...s, rangeLabel: "Discursiva" };
    }
    const start = current;
    const end = current + s.questionCount - 1;
    current = end + 1;
    return { ...s, rangeLabel: `${start} a ${end}` };
  });
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function SimuladosPage() {
  const [simulados, setSimulados] = useState<Simulado[]>(initialSimulados);
  const [expandedId, setExpandedId] = useState<string | null>("sim-1");

  /* ---------- New simulado form state ---------- */
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClassGroups, setNewClassGroups] = useState("");
  const [newAppDate, setNewAppDate] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newSubjects, setNewSubjects] = useState<SimuladoDisciplina[]>([]);

  /* ---------- Announcement state ---------- */
  const [announcementSimId, setAnnouncementSimId] = useState<string | null>(null);
  const [announcementText, setAnnouncementText] = useState("");

  /* ---------- Subject add helpers ---------- */
  const [addSubjectName, setAddSubjectName] = useState("");
  const [addSubjectCount, setAddSubjectCount] = useState("5");
  const [addSubjectType, setAddSubjectType] = useState<"objetiva" | "discursiva">("objetiva");
  const [addSubjectTeacher, setAddSubjectTeacher] = useState("");

  const addSubjectToNew = () => {
    if (!addSubjectName) return;
    const item: SimuladoDisciplina = {
      id: `ns-${Date.now()}`,
      subjectName: addSubjectName,
      questionCount: addSubjectType === "discursiva" ? 1 : Math.max(1, parseInt(addSubjectCount) || 1),
      type: addSubjectType,
      teacherId: addSubjectTeacher || undefined,
      teacherName: mockTeachers.find((t) => t.id === addSubjectTeacher)?.name,
      status: "pending",
    };
    setNewSubjects((prev) => [...prev, item]);
    setAddSubjectName("");
    setAddSubjectCount("5");
    setAddSubjectType("objetiva");
    setAddSubjectTeacher("");
  };

  const removeSubjectFromNew = (id: string) => setNewSubjects((prev) => prev.filter((s) => s.id !== id));

  const moveSubject = (list: SimuladoDisciplina[], index: number, dir: -1 | 1): SimuladoDisciplina[] => {
    const newList = [...list];
    const target = index + dir;
    if (target < 0 || target >= newList.length) return newList;
    [newList[index], newList[target]] = [newList[target], newList[index]];
    return newList;
  };

  const moveNewSubject = (index: number, dir: -1 | 1) => {
    setNewSubjects((prev) => moveSubject(prev, index, dir));
  };

  const createSimulado = () => {
    if (!newTitle || newSubjects.length === 0) {
      toast({ title: "Preencha o título e adicione ao menos uma disciplina.", variant: "destructive" });
      return;
    }
    const sim: Simulado = {
      id: `sim-${Date.now()}`,
      title: newTitle,
      classGroups: newClassGroups.split(",").map((s) => s.trim()).filter(Boolean),
      applicationDate: newAppDate,
      deadline: newDeadline,
      subjects: newSubjects,
      status: "draft",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setSimulados((prev) => [sim, ...prev]);
    setShowNew(false);
    resetNewForm();
    toast({ title: "Simulado criado com sucesso!" });
  };

  const resetNewForm = () => {
    setNewTitle("");
    setNewClassGroups("");
    setNewAppDate("");
    setNewDeadline("");
    setNewSubjects([]);
  };

  /* ---------- Existing simulado subject reorder ---------- */
  const moveExistingSubject = (simId: string, index: number, dir: -1 | 1) => {
    setSimulados((prev) =>
      prev.map((s) => (s.id === simId ? { ...s, subjects: moveSubject(s.subjects, index, dir) } : s))
    );
  };

  const removeExistingSubject = (simId: string, subjectId: string) => {
    setSimulados((prev) =>
      prev.map((s) =>
        s.id === simId ? { ...s, subjects: s.subjects.filter((sub) => sub.id !== subjectId) } : s
      )
    );
  };

  /* ---------- Announcement ---------- */
  const openAnnouncement = (sim: Simulado) => {
    setAnnouncementSimId(sim.id);
    setAnnouncementText(sim.announcement || "");
  };

  const saveAnnouncement = () => {
    if (!announcementSimId) return;
    setSimulados((prev) =>
      prev.map((s) => (s.id === announcementSimId ? { ...s, announcement: announcementText } : s))
    );
    toast({ title: "Comunicado salvo!" });
  };

  const sendAnnouncement = () => {
    if (!announcementSimId) return;
    saveAnnouncement();
    toast({ title: "Comunicado enviado aos professores!" });
    setAnnouncementSimId(null);
  };

  /* ---------- Status helpers ---------- */
  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    complete: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  };
  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    sent: "Enviado",
    in_progress: "Em andamento",
    complete: "Completo",
  };

  const totalQuestions = (subjects: SimuladoDisciplina[]) =>
    subjects.reduce((sum, s) => sum + (s.type === "discursiva" ? 0 : s.questionCount), 0);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Simulados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crie e gerencie simulados multidisciplinares
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Simulado
        </Button>
      </div>

      {/* ============ NEW SIMULADO FORM ============ */}
      {showNew && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Criar Simulado
            </CardTitle>
            <CardDescription>Defina as disciplinas, a sequência e o número de questões.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Basic info */}
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

            {/* Add subject */}
            <div>
              <Label className="mb-2 block font-semibold">Adicionar Disciplina</Label>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1 min-w-[180px] flex-1">
                  <Label className="text-xs text-muted-foreground">Disciplina</Label>
                  <Select value={addSubjectName} onValueChange={setAddSubjectName}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {availableSubjects.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-[100px]">
                  <Label className="text-xs text-muted-foreground">Questões</Label>
                  <Input
                    type="number"
                    min={1}
                    value={addSubjectType === "discursiva" ? "1" : addSubjectCount}
                    onChange={(e) => setAddSubjectCount(e.target.value)}
                    disabled={addSubjectType === "discursiva"}
                  />
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
                    <SelectContent>
                      {mockTeachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
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
                  Sequência de Disciplinas ({totalQuestions(newSubjects)} questões objetivas
                  {newSubjects.some((s) => s.type === "discursiva") ? " + discursivas" : ""})
                </Label>
                <div className="rounded-lg border border-border overflow-hidden">
                  {buildRanges(newSubjects).map((s, i) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-2.5 bg-card even:bg-muted/30 border-b last:border-b-0 border-border"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                      <span className="text-sm font-semibold text-muted-foreground w-6">{i + 1}.</span>
                      <span className="text-sm font-medium flex-1">{s.subjectName}</span>
                      <Badge variant="outline" className="text-xs">
                        {s.type === "discursiva" ? "Discursiva" : `Questões: ${s.rangeLabel}`}
                      </Badge>
                      {s.questionCount > 0 && s.type !== "discursiva" && (
                        <span className="text-xs text-muted-foreground">({s.questionCount})</span>
                      )}
                      {s.teacherName && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">→ {s.teacherName}</span>
                      )}
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveNewSubject(i, -1)} disabled={i === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveNewSubject(i, 1)} disabled={i === newSubjects.length - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeSubjectFromNew(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowNew(false); resetNewForm(); }}>Cancelar</Button>
              <Button onClick={createSimulado} className="gap-2">
                <Save className="h-4 w-4" /> Criar Simulado
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ LIST OF SIMULADOS ============ */}
      {simulados.length === 0 && !showNew && (
        <Card className="py-16 flex flex-col items-center justify-center text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhum simulado criado ainda.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> Criar primeiro simulado
          </Button>
        </Card>
      )}

      <div className="space-y-4">
        {simulados.map((sim) => {
          const isExpanded = expandedId === sim.id;
          const ranged = buildRanges(sim.subjects);
          const submitted = sim.subjects.filter((s) => s.status === "submitted").length;
          const total = sim.subjects.length;

          return (
            <Card key={sim.id} className="overflow-hidden">
              {/* Card header – clickable */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : sim.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{sim.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {sim.classGroups.join(", ")} · {sim.subjects.length} disciplinas · Prazo: {sim.deadline || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge className={statusColors[sim.status]}>{statusLabels[sim.status]}</Badge>
                  <span className="text-xs text-muted-foreground">{submitted}/{total} enviadas</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border">
                  {/* Subject table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                          <th className="px-5 py-2 text-left w-8">#</th>
                          <th className="px-3 py-2 text-left">Disciplina</th>
                          <th className="px-3 py-2 text-left">Questões</th>
                          <th className="px-3 py-2 text-left">Professor</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranged.map((s, i) => (
                          <tr key={s.id} className="border-b last:border-b-0 border-border hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-2.5 font-semibold text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2.5 font-medium">{s.subjectName}</td>
                            <td className="px-3 py-2.5">
                              <Badge variant="outline" className="text-xs font-normal">
                                {s.type === "discursiva" ? "Discursiva" : `${s.rangeLabel} (${s.questionCount})`}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">{s.teacherName || "—"}</td>
                            <td className="px-3 py-2.5">
                              {s.status === "submitted" ? (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">Enviada</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs">Pendente</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveExistingSubject(sim.id, i, -1)} disabled={i === 0}>
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveExistingSubject(sim.id, i, 1)} disabled={i === ranged.length - 1}>
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeExistingSubject(sim.id, s.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Total: {totalQuestions(sim.subjects)} questões objetivas
                      {sim.subjects.some((s) => s.type === "discursiva") ? " + discursivas" : ""}
                    </span>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => openAnnouncement(sim)}>
                      <MessageSquare className="h-3.5 w-3.5" /> Comunicado
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ============ ANNOUNCEMENT DIALOG ============ */}
      <Dialog open={!!announcementSimId} onOpenChange={(open) => !open && setAnnouncementSimId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Comunicado aos Professores
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Mensagem</Label>
            <Textarea
              rows={6}
              placeholder="Escreva o comunicado que será enviado aos professores vinculados a este simulado..."
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={saveAnnouncement} className="gap-2">
              <Save className="h-4 w-4" /> Salvar
            </Button>
            <Button onClick={sendAnnouncement} className="gap-2">
              <Send className="h-4 w-4" /> Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
