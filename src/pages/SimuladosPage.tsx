import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { saveExamContent } from "@/data/examContentStore";
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
  DialogFooter,
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
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileEdit,
  Settings2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

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

interface DocumentFormat {
  fontFamily: string;
  fontSize: string;
  columns: "1" | "2";
  margins: "normal" | "narrow" | "wide";
  headerEnabled: boolean;
  footerEnabled: boolean;
  pageNumbering: boolean;
  questionSpacing: "compact" | "normal" | "wide";
}

const defaultFormat: DocumentFormat = {
  fontFamily: "Times New Roman",
  fontSize: "12",
  columns: "1",
  margins: "normal",
  headerEnabled: true,
  footerEnabled: true,
  pageNumbering: true,
  questionSpacing: "normal",
};

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
  format: DocumentFormat;
}

const availableSubjects = [
  "Inglês", "Gramática", "Interpretação Textual", "Literatura", "Arte",
  "Educação Física", "Redação", "Geografia", "História", "Filosofia",
  "Sociologia", "Matemática", "Física", "Química", "Biologia", "Português",
];

const mockTeachers = [
  { id: "prof-1", name: "Carlos Oliveira" },
  { id: "prof-2", name: "Ana Santos" },
  { id: "prof-3", name: "Roberto Lima" },
  { id: "prof-4", name: "Fernanda Costa" },
  { id: "prof-5", name: "Paulo Mendes" },
];

const fontFamilies = [
  "Times New Roman", "Arial", "Calibri", "Courier New", "Georgia",
  "Verdana", "Tahoma", "Garamond", "Comic Sans MS",
];

const fontSizes = ["10", "11", "12", "13", "14", "16", "18"];

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
    format: defaultFormat,
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
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function buildRanges(subjects: SimuladoDisciplina[]) {
  let current = 1;
  return subjects.map((s) => {
    if (s.type === "discursiva") return { ...s, rangeLabel: "Discursiva" };
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
  const navigate = useNavigate();
  const [simulados, setSimulados] = useState<Simulado[]>(initialSimulados);
  const [expandedId, setExpandedId] = useState<string | null>("sim-1");

  /* ---------- New simulado form state ---------- */
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClassGroups, setNewClassGroups] = useState("");
  const [newAppDate, setNewAppDate] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newSubjects, setNewSubjects] = useState<SimuladoDisciplina[]>([]);
  const [newFormat, setNewFormat] = useState<DocumentFormat>({ ...defaultFormat });

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
      format: newFormat,
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
    setNewFormat({ ...defaultFormat });
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

  /* ---------- Generate editable file ---------- */
  const generateEditableFile = (sim: Simulado) => {
    const ranged = buildRanges(sim.subjects);
    const fmt = sim.format;

    // Build TipTap-compatible HTML content
    let html = "";

    // Header
    if (fmt.headerEnabled) {
      html += `<h1 style="text-align: center">${sim.title}</h1>`;
      html += `<p style="text-align: center"><strong>Turma(s):</strong> ${sim.classGroups.join(", ")} &nbsp;&nbsp; <strong>Data:</strong> ${sim.applicationDate || "___/___/______"}</p>`;
      html += `<p style="text-align: center"><strong>Aluno(a):</strong> _________________________________ &nbsp;&nbsp; <strong>Nº:</strong> _______</p>`;
      html += `<hr>`;
    }

    // Instructions
    html += `<h2>Instruções</h2>`;
    html += `<ul><li>Leia atentamente cada questão antes de responder.</li><li>Utilize caneta azul ou preta para as respostas.</li><li>Não é permitido o uso de corretivo.</li></ul>`;
    html += `<hr>`;

    // Questions per subject
    for (const s of ranged) {
      html += `<h2>${s.subjectName}</h2>`;
      if (s.type === "discursiva") {
        html += `<p><strong>Questão Discursiva</strong></p>`;
        html += `<p><em>[Escreva o enunciado da questão discursiva aqui]</em></p>`;
        html += `<p></p><p></p><p></p>`;
      } else {
        const start = parseInt(s.rangeLabel?.split(" a ")[0] || "1");
        for (let q = 0; q < s.questionCount; q++) {
          const num = start + q;
          html += `<p><strong>${num})</strong> [Enunciado da questão]</p>`;
          html += `<p>a) [Alternativa A]</p>`;
          html += `<p>b) [Alternativa B]</p>`;
          html += `<p>c) [Alternativa C]</p>`;
          html += `<p>d) [Alternativa D]</p>`;
          html += `<p></p>`;
        }
      }
    }

    // Footer
    if (fmt.footerEnabled) {
      html += `<hr>`;
      html += `<p style="text-align: center"><em>Boa prova!</em></p>`;
    }

    // Save to content store and navigate to editor
    const editorId = `simulado-${sim.id}`;
    saveExamContent(editorId, html);
    navigate(`/provas/editor/${editorId}`);
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

  const updateFormat = (key: keyof DocumentFormat, value: any) => {
    setNewFormat((prev) => ({ ...prev, [key]: value }));
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Simulados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Crie e gerencie simulados multidisciplinares</p>
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

            {/* ===== DOCUMENT FORMAT OPTIONS ===== */}
            <div>
              <Label className="mb-3 block font-semibold flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" /> Formatação do Documento
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border border-border bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fonte</Label>
                  <Select value={newFormat.fontFamily} onValueChange={(v) => updateFormat("fontFamily", v)}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((f) => (
                        <SelectItem key={f} value={f}><span style={{ fontFamily: f }}>{f}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tamanho (pt)</Label>
                  <Select value={newFormat.fontSize} onValueChange={(v) => updateFormat("fontSize", v)}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fontSizes.map((s) => (
                        <SelectItem key={s} value={s}>{s} pt</SelectItem>
                      ))}
                    </SelectContent>
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
                      <SelectItem value="narrow">Estreita (1,27cm)</SelectItem>
                      <SelectItem value="normal">Normal (2,5cm)</SelectItem>
                      <SelectItem value="wide">Larga (3,18cm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Espaçamento entre questões</Label>
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
                  <Switch checked={newFormat.headerEnabled} onCheckedChange={(v) => updateFormat("headerEnabled", v)} id="header-toggle" />
                  <Label htmlFor="header-toggle" className="text-xs">Cabeçalho</Label>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch checked={newFormat.footerEnabled} onCheckedChange={(v) => updateFormat("footerEnabled", v)} id="footer-toggle" />
                  <Label htmlFor="footer-toggle" className="text-xs">Rodapé</Label>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch checked={newFormat.pageNumbering} onCheckedChange={(v) => updateFormat("pageNumbering", v)} id="page-num-toggle" />
                  <Label htmlFor="page-num-toggle" className="text-xs">Nº de Página</Label>
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

              {isExpanded && (
                <div className="border-t border-border">
                  {/* Format summary */}
                  <div className="px-5 py-2.5 bg-muted/10 border-b border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Fonte: <strong className="text-foreground">{sim.format.fontFamily}</strong></span>
                    <span>Tamanho: <strong className="text-foreground">{sim.format.fontSize}pt</strong></span>
                    <span>Colunas: <strong className="text-foreground">{sim.format.columns}</strong></span>
                    <span>Margens: <strong className="text-foreground capitalize">{sim.format.margins === "narrow" ? "Estreita" : sim.format.margins === "wide" ? "Larga" : "Normal"}</strong></span>
                  </div>

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

                  <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Total: {totalQuestions(sim.subjects)} questões objetivas
                      {sim.subjects.some((s) => s.type === "discursiva") ? " + discursivas" : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => generateEditableFile(sim)}>
                        <FileEdit className="h-3.5 w-3.5" /> Gerar Arquivo Editável
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => openAnnouncement(sim)}>
                        <MessageSquare className="h-3.5 w-3.5" /> Comunicado
                      </Button>
                    </div>
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
