import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSimulados, defaultFormat, DocumentFormat, SimuladoSubject, Simulado } from "@/hooks/useSimulados";
import { saveExamContent, saveExamTitle } from "@/data/examContentStore";
import { useSimuladoNotifications } from "@/hooks/useSimuladoNotifications";
// Notifications are handled by the provider in AppLayout
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Plus, GripVertical, Trash2, ArrowUp, ArrowDown, Send, Save,
  FileText, ClipboardList, MessageSquare, ChevronDown, ChevronUp,
  BookOpen, FileEdit, Settings2, CheckCircle2, RotateCcw, Eye,
  Loader2, Printer, FileSpreadsheet, Trophy,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import AnswerSheetGenerator from "@/components/simulados/AnswerSheetGenerator";
import AnswerKeyEditor from "@/components/simulados/AnswerKeyEditor";
import CorrectionsTab from "@/components/simulados/CorrectionsTab";

const availableSubjects = [
  "Inglês", "Gramática", "Interpretação Textual", "Literatura", "Arte",
  "Educação Física", "Redação", "Geografia", "História", "Filosofia",
  "Sociologia", "Matemática", "Física", "Química", "Biologia", "Português",
];

const fontFamilies = [
  "Times New Roman", "Arial", "Calibri", "Courier New", "Georgia",
  "Verdana", "Tahoma", "Garamond",
];
const fontSizes = ["10", "11", "12", "13", "14", "16", "18"];

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  complete: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};
const statusLabels: Record<string, string> = {
  draft: "Rascunho", sent: "Enviado", in_progress: "Em andamento", complete: "Completo",
};

const subjectStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  submitted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  revision_requested: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};
const subjectStatusLabels: Record<string, string> = {
  pending: "Pendente", in_progress: "Em andamento", submitted: "Enviada",
  approved: "Aprovada", revision_requested: "Revisão solicitada",
};

function buildRanges(subjects: SimuladoSubject[]) {
  let current = 1;
  return subjects.map((s) => {
    if (s.type === "discursiva") return { ...s, rangeLabel: "Discursiva" };
    const start = current;
    const end = current + s.question_count - 1;
    current = end + 1;
    return { ...s, rangeLabel: `${start} a ${end}` };
  });
}

function totalQuestions(subjects: SimuladoSubject[]) {
  return subjects.reduce((sum, s) => sum + (s.type === "discursiva" ? 0 : s.question_count), 0);
}

export default function SimuladosPage() {
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const {
    simulados, teachers, loading, createSimulado,
    updateSubjectStatus, submitSubject, updateSubjectContent,
    updateAnnouncement, updateSimuladoStatus,
  } = useSimulados();

  const isCoordinator = role === "admin" || role === "coordinator" || role === "super_admin";
  const isProfessor = role === "professor";

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New simulado form
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClassGroups, setNewClassGroups] = useState("");
  const [newAppDate, setNewAppDate] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newSubjects, setNewSubjects] = useState<{ id: string; subject_name: string; question_count: number; type: string; teacher_id: string }[]>([]);
  const [newFormat, setNewFormat] = useState<DocumentFormat>({ ...defaultFormat });

  // Add subject helpers
  const [addSubjectName, setAddSubjectName] = useState("");
  const [addSubjectCount, setAddSubjectCount] = useState("5");
  const [addSubjectType, setAddSubjectType] = useState<"objetiva" | "discursiva">("objetiva");
  const [addSubjectTeacher, setAddSubjectTeacher] = useState("");

  // Announcement
  const [announcementSimId, setAnnouncementSimId] = useState<string | null>(null);
  const [announcementText, setAnnouncementText] = useState("");

  // Professor edit dialog
  const [editingSubject, setEditingSubject] = useState<SimuladoSubject | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editAnswerKey, setEditAnswerKey] = useState("");

  // Coordinator revision dialog
  const [revisionSubject, setRevisionSubject] = useState<SimuladoSubject | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");

  // Saving state
  const [saving, setSaving] = useState(false);

  // Answer sheet dialog
  const [answerSheetSim, setAnswerSheetSim] = useState<Simulado | null>(null);

  // Answer key editor dialog
  const [answerKeySim, setAnswerKeySim] = useState<Simulado | null>(null);

  if (loading) return <DashboardSkeleton />;

  /* ---- New simulado form ---- */
  const addSubjectToNew = () => {
    if (!addSubjectName) return;
    const item = {
      id: `ns-${Date.now()}`,
      subject_name: addSubjectName,
      question_count: addSubjectType === "discursiva" ? 1 : Math.max(1, parseInt(addSubjectCount) || 1),
      type: addSubjectType,
      teacher_id: addSubjectTeacher,
    };
    setNewSubjects((prev) => [...prev, item]);
    setAddSubjectName("");
    setAddSubjectCount("5");
    setAddSubjectType("objetiva");
    setAddSubjectTeacher("");
  };

  const removeSubjectFromNew = (id: string) => setNewSubjects((prev) => prev.filter((s) => s.id !== id));

  const moveNewSubject = (index: number, dir: -1 | 1) => {
    setNewSubjects((prev) => {
      const list = [...prev];
      const target = index + dir;
      if (target < 0 || target >= list.length) return list;
      [list[index], list[target]] = [list[target], list[index]];
      return list;
    });
  };

  const handleCreateSimulado = async () => {
    if (!newTitle || newSubjects.length === 0) {
      toast({ title: "Preencha o título e adicione ao menos uma disciplina.", variant: "destructive" });
      return;
    }
    setSaving(true);
    await createSimulado({
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
    setShowNew(false);
    setNewTitle(""); setNewClassGroups(""); setNewAppDate(""); setNewDeadline("");
    setNewSubjects([]); setNewFormat({ ...defaultFormat });
    toast({ title: "Simulado criado com sucesso!" });
  };

  const updateFormat = (key: keyof DocumentFormat, value: any) => {
    setNewFormat((prev) => ({ ...prev, [key]: value }));
  };

  /* ---- Professor: edit & submit ---- */
  const openProfessorEdit = (sub: SimuladoSubject) => {
    setEditingSubject(sub);
    setEditContent(sub.content);
    setEditAnswerKey(sub.answer_key);
  };

  const handleSaveDraft = async () => {
    if (!editingSubject) return;
    setSaving(true);
    await updateSubjectContent(editingSubject.id, editContent, editAnswerKey);
    await updateSubjectStatus(editingSubject.id, "in_progress");
    setSaving(false);
    setEditingSubject(null);
    toast({ title: "Rascunho salvo!" });
  };

  const handleSubmitToReview = async () => {
    if (!editingSubject) return;
    if (!editContent.trim()) {
      toast({ title: "Escreva as questões antes de enviar.", variant: "destructive" });
      return;
    }
    setSaving(true);
    await submitSubject(editingSubject.id, editContent, editAnswerKey);
    setSaving(false);
    setEditingSubject(null);
    toast({ title: "Questões enviadas para revisão!" });
  };

  /* ---- Coordinator: approve/revision ---- */
  const handleApprove = async (subjectId: string) => {
    await updateSubjectStatus(subjectId, "approved");
    toast({ title: "Disciplina aprovada!" });
  };

  const openRevisionDialog = (sub: SimuladoSubject) => {
    setRevisionSubject(sub);
    setRevisionNotes("");
  };

  const handleRequestRevision = async () => {
    if (!revisionSubject) return;
    await updateSubjectStatus(revisionSubject.id, "revision_requested", revisionNotes);
    setRevisionSubject(null);
    toast({ title: "Revisão solicitada ao professor." });
  };

  /* ---- Coordinator: approve all & mark complete ---- */
  const handleApproveAll = async (sim: Simulado) => {
    for (const sub of sim.subjects.filter((s) => s.status === "submitted")) {
      await updateSubjectStatus(sub.id, "approved");
    }
    await updateSimuladoStatus(sim.id, "complete");
    toast({ title: "Simulado aprovado e finalizado!" });
  };

  /* ---- Announcement ---- */
  const openAnnouncement = (sim: Simulado) => {
    setAnnouncementSimId(sim.id);
    setAnnouncementText(sim.announcement || "");
  };
  const saveAnnouncementHandler = async () => {
    if (!announcementSimId) return;
    await updateAnnouncement(announcementSimId, announcementText);
    toast({ title: "Comunicado salvo!" });
  };
  const sendAnnouncementHandler = async () => {
    await saveAnnouncementHandler();
    toast({ title: "Comunicado enviado aos professores!" });
    setAnnouncementSimId(null);
  };

  /* ---- Generate editable file ---- */
  const generateEditableFile = (sim: Simulado) => {
    const ranged = buildRanges(sim.subjects);
    const fmt = sim.format;
    let html = "";
    if (fmt.headerEnabled) {
      html += `<h1 style="text-align: center">${sim.title}</h1>`;
      html += `<p style="text-align: center"><strong>Turma(s):</strong> ${sim.class_groups.join(", ")} &nbsp;&nbsp; <strong>Data:</strong> ${sim.application_date || "___/___/______"}</p>`;
      html += `<p style="text-align: center"><strong>Aluno(a):</strong> _________________________________ &nbsp;&nbsp; <strong>Nº:</strong> _______</p>`;
      html += `<hr>`;
    }
    html += `<h2>Instruções</h2><ul><li>Leia atentamente cada questão antes de responder.</li><li>Utilize caneta azul ou preta para as respostas.</li></ul><hr>`;
    for (const s of ranged) {
      html += `<h2>${s.subject_name}</h2>`;
      if (s.content) {
        html += s.content;
      } else if (s.type === "discursiva") {
        html += `<p><strong>Questão Discursiva</strong></p><p><em>[Aguardando envio do professor]</em></p>`;
      } else {
        const start = parseInt(s.rangeLabel?.split(" a ")[0] || "1");
        for (let q = 0; q < s.question_count; q++) {
          html += `<p><strong>${start + q})</strong> [Aguardando envio]</p><p>a) ___</p><p>b) ___</p><p>c) ___</p><p>d) ___</p><p></p>`;
        }
      }
    }
    if (fmt.footerEnabled) html += `<hr><p style="text-align: center"><em>Boa prova!</em></p>`;
    const editorId = `simulado-${sim.id}`;
    saveExamContent(editorId, html);
    saveExamTitle(editorId, sim.title);
    navigate(`/provas/editor/${editorId}`);
  };

  /* ---- Generate consolidated PDF ---- */
  const generateConsolidatedPDF = (sim: Simulado) => {
    const approvedSubjects = sim.subjects.filter((s) => s.status === "approved");
    if (approvedSubjects.length === 0) {
      toast({ title: "Nenhuma disciplina aprovada para gerar o PDF.", variant: "destructive" });
      return;
    }

    const fmt = sim.format;
    const ranged = buildRanges(sim.subjects);
    const approvedRanged = ranged.filter((s) => s.status === "approved");

    const marginMap = { narrow: "10mm 15mm", normal: "15mm 25mm", wide: "20mm 30mm" };
    const spacingMap = { compact: "1mm", normal: "3mm", wide: "6mm" };

    let questionsHTML = "";
    for (const s of approvedRanged) {
      questionsHTML += `<div class="subject-section"><h2 class="subject-title">${s.subject_name}</h2>`;
      if (s.content) {
        questionsHTML += `<div class="subject-content">${s.content}</div>`;
      }
      questionsHTML += `</div>`;
    }

    // Build answer key from approved subjects
    let answerKeyHTML = "";
    const hasAnswerKeys = approvedRanged.some((s) => s.answer_key?.trim());
    if (hasAnswerKeys) {
      answerKeyHTML = `<div class="answer-key-section"><h2 class="ak-title">Gabarito</h2>`;
      for (const s of approvedRanged) {
        if (s.answer_key?.trim()) {
          answerKeyHTML += `<div class="ak-subject"><strong>${s.subject_name}:</strong> ${s.answer_key}</div>`;
        }
      }
      answerKeyHTML += `</div>`;
    }

    const pendingCount = sim.subjects.filter((s) => s.status !== "approved").length;
    const pendingNote = pendingCount > 0
      ? `<div class="pending-note">⚠ ${pendingCount} disciplina(s) ainda não aprovada(s) — não incluída(s) neste documento.</div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${sim.title}</title>
  <style>
    @page {
      size: A4;
      margin: ${marginMap[fmt.margins] || marginMap.normal};
    }
    @media print {
      body { margin: 0; padding: 0; }
      .subject-section { break-inside: avoid; page-break-inside: avoid; }
      .answer-key-section { break-before: page; page-break-before: always; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: '${fmt.fontFamily}', serif;
      font-size: ${fmt.fontSize}pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm 0;
      ${fmt.columns === "2" ? "column-count: 2; column-gap: 8mm;" : ""}
    }

    /* Header */
    .doc-header {
      text-align: center;
      border-bottom: 2px solid #2c3e50;
      padding-bottom: 4mm;
      margin-bottom: 5mm;
      ${fmt.columns === "2" ? "column-span: all;" : ""}
    }
    .doc-header h1 {
      font-size: ${parseInt(fmt.fontSize) + 4}pt;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 2mm 0;
    }
    .doc-header p {
      font-size: ${parseInt(fmt.fontSize) - 1}pt;
      color: #374151;
      margin: 1mm 0;
    }
    .student-line {
      display: flex;
      justify-content: space-between;
      font-size: ${parseInt(fmt.fontSize) - 1}pt;
      color: #374151;
      padding: 2mm 0;
      margin-bottom: 4mm;
      border-bottom: 1px solid #e5e7eb;
      ${fmt.columns === "2" ? "column-span: all;" : ""}
    }

    /* Instructions */
    .instructions {
      margin-bottom: 4mm;
      padding: 2mm 4mm;
      border: 1px solid #d1d5db;
      border-radius: 1.5mm;
      background: #f9fafb;
      font-size: ${parseInt(fmt.fontSize) - 1}pt;
      ${fmt.columns === "2" ? "column-span: all;" : ""}
    }
    .instructions h2 {
      font-size: ${parseInt(fmt.fontSize) + 1}pt;
      margin: 0 0 1mm 0;
      color: #2c3e50;
    }
    .instructions ul { margin: 1mm 0; padding-left: 6mm; }
    .instructions li { margin: 0.5mm 0; }

    /* Subjects */
    .subject-section { margin-bottom: ${spacingMap[fmt.questionSpacing] || spacingMap.normal}; }
    .subject-title {
      font-size: ${parseInt(fmt.fontSize) + 2}pt;
      font-weight: 700;
      color: #2c3e50;
      border-bottom: 1.5px solid #2c3e50;
      padding-bottom: 1.5mm;
      margin: 4mm 0 3mm 0;
    }
    .subject-content {
      font-size: ${fmt.fontSize}pt;
      line-height: 1.7;
    }
    .subject-content p { margin: 1mm 0; }
    .subject-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 2mm 0;
    }
    .subject-content table th,
    .subject-content table td {
      border: 1px solid #d1d5db;
      padding: 1.5mm 3mm;
      text-align: left;
    }
    .subject-content table th { background: #f3f4f6; font-weight: 600; }

    /* Pending note */
    .pending-note {
      padding: 2mm 4mm;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 1.5mm;
      font-size: ${parseInt(fmt.fontSize) - 2}pt;
      color: #92400e;
      margin-top: 4mm;
      ${fmt.columns === "2" ? "column-span: all;" : ""}
    }

    /* Answer Key */
    .answer-key-section {
      padding-top: 5mm;
      ${fmt.columns === "2" ? "column-span: all;" : ""}
    }
    .ak-title {
      font-size: ${parseInt(fmt.fontSize) + 2}pt;
      font-weight: 700;
      color: #2c3e50;
      text-align: center;
      margin-bottom: 4mm;
      border-bottom: 2px solid #2c3e50;
      padding-bottom: 2mm;
    }
    .ak-subject {
      font-size: ${parseInt(fmt.fontSize) - 1}pt;
      padding: 1.5mm 0;
      border-bottom: 1px solid #e5e7eb;
    }

    /* Footer */
    .doc-footer {
      text-align: center;
      font-size: ${parseInt(fmt.fontSize) - 3}pt;
      color: #9ca3af;
      margin-top: 8mm;
      padding-top: 3mm;
      border-top: 1px solid #e5e7eb;
      ${fmt.columns === "2" ? "column-span: all;" : ""}
    }
  </style>
</head>
<body>
  ${fmt.headerEnabled ? `
  <div class="doc-header">
    <h1>${sim.title}</h1>
    <p><strong>Turma(s):</strong> ${sim.class_groups.join(", ")} &nbsp;&nbsp; <strong>Data:</strong> ${sim.application_date || "___/___/______"}</p>
  </div>
  <div class="student-line">
    <span>Aluno(a): _________________________________________</span>
    <span>Nº: _______</span>
  </div>
  ` : ""}

  <div class="instructions">
    <h2>Instruções</h2>
    <ul>
      <li>Leia atentamente cada questão antes de responder.</li>
      <li>Utilize caneta azul ou preta para as respostas.</li>
      <li>Total de ${approvedSubjects.length} disciplina(s) com ${totalQuestions(approvedSubjects.filter(s => s.type !== "discursiva"))} questões objetivas.</li>
    </ul>
  </div>

  ${questionsHTML}
  ${pendingNote}
  ${answerKeyHTML}

  ${fmt.footerEnabled ? `
  <div class="doc-footer">
    ProvaFácil — Documento gerado em ${new Date().toLocaleDateString("pt-BR")}
  </div>` : ""}
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Permita pop-ups para exportar o PDF.", variant: "destructive" });
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => printWindow.print(), 500);
    };
  };

  /* ---- Generate answer key only PDF ---- */
  const generateAnswerKeyPDF = (sim: Simulado) => {
    const approved = sim.subjects.filter((s) => s.status === "approved");
    if (approved.length === 0) {
      toast({ title: "Nenhuma disciplina aprovada para gerar gabarito.", variant: "destructive" });
      return;
    }

    const fmt = sim.format;
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Gabarito — ${sim.title}</title>
  <style>
    @page { size: A4; margin: 15mm 25mm 20mm 25mm; }
    @media print { body { margin: 0; padding: 0; } }
    * { box-sizing: border-box; }
    body {
      font-family: '${fmt.fontFamily}', serif;
      font-size: ${fmt.fontSize}pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm 0;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #2c3e50;
      padding-bottom: 4mm;
      margin-bottom: 6mm;
    }
    .header h1 {
      font-size: ${parseInt(fmt.fontSize) + 4}pt;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 1mm 0;
    }
    .header p {
      font-size: ${parseInt(fmt.fontSize) - 1}pt;
      color: #6b7280;
      margin: 0;
    }
    .subject-block {
      margin-bottom: 5mm;
    }
    .subject-name {
      font-size: ${parseInt(fmt.fontSize) + 1}pt;
      font-weight: 700;
      color: #2c3e50;
      border-bottom: 1.5px solid #d1d5db;
      padding-bottom: 1.5mm;
      margin: 3mm 0 2mm 0;
    }
    .answer-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${fmt.fontSize}pt;
    }
    .answer-table th {
      background: #2c3e50;
      color: #fff;
      padding: 2mm 3mm;
      text-align: left;
      font-size: ${parseInt(fmt.fontSize) - 1}pt;
      font-weight: 600;
    }
    .answer-table td {
      border-bottom: 1px solid #e5e7eb;
      padding: 1.5mm 3mm;
    }
    .answer-table tr:nth-child(even) td { background: #f9fafb; }
    .footer {
      text-align: center;
      font-size: ${parseInt(fmt.fontSize) - 3}pt;
      color: #9ca3af;
      margin-top: 8mm;
      padding-top: 3mm;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Gabarito</h1>
    <p>${sim.title} — Turma(s): ${sim.class_groups.join(", ")}</p>
  </div>
  ${approved.map((s) => `
    <div class="subject-block">
      <div class="subject-name">${s.subject_name}</div>
      <table class="answer-table">
        <thead><tr><th style="width:60%">Respostas</th></tr></thead>
        <tbody><tr><td>${s.answer_key?.trim() ? s.answer_key : '<em style="color:#9ca3af">Sem gabarito informado para esta disciplina.</em>'}</td></tr></tbody>
      </table>
    </div>
  `).join("")}
  <div class="footer">
    ProvaFácil — Gabarito gerado em ${new Date().toLocaleDateString("pt-BR")}
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Permita pop-ups para exportar.", variant: "destructive" });
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  const renderSimuladosList = () => (
    <div className="space-y-4">
      {/* ============ NEW SIMULADO FORM (Coordinator only) ============ */}
      {showNew && isCoordinator && (
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveNewSubject(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveNewSubject(i, 1)} disabled={i === newSubjects.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeSubjectFromNew(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowNew(false); setNewSubjects([]); }}>Cancelar</Button>
              <Button onClick={handleCreateSimulado} className="gap-2" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Criar Simulado
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ LIST OF SIMULADOS ============ */}
      {simulados.length === 0 && !showNew && (
        <Card className="py-16 flex flex-col items-center justify-center text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            {isProfessor ? "Nenhum simulado atribuído a você." : "Nenhum simulado criado ainda."}
          </p>
          {isCoordinator && (
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" /> Criar primeiro simulado
            </Button>
          )}
        </Card>
      )}

      <div className="space-y-4">
        {simulados.map((sim) => {
          const isExpanded = expandedId === sim.id;
          const ranged = buildRanges(sim.subjects);
          const submitted = sim.subjects.filter((s) => ["submitted", "approved"].includes(s.status)).length;
          const approved = sim.subjects.filter((s) => s.status === "approved").length;
          const total = sim.subjects.length;
          const allSubmitted = sim.subjects.every((s) => ["submitted", "approved"].includes(s.status));
          const allApproved = sim.subjects.every((s) => s.status === "approved");

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
                      {sim.class_groups.join(", ")} · {sim.subjects.length} disciplina(s) · Prazo: {sim.deadline || "—"}
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
                  {/* Announcement banner for professor */}
                  {isProfessor && sim.announcement && (
                    <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-border">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" /> Comunicado da Coordenação:
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-200 mt-1">{sim.announcement}</p>
                    </div>
                  )}

                  {/* Format summary (coordinator) */}
                  {isCoordinator && (
                    <div className="px-5 py-2.5 bg-muted/10 border-b border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Fonte: <strong className="text-foreground">{sim.format.fontFamily}</strong></span>
                      <span>Tamanho: <strong className="text-foreground">{sim.format.fontSize}pt</strong></span>
                      <span>Colunas: <strong className="text-foreground">{sim.format.columns}</strong></span>
                    </div>
                  )}

                  {/* Subjects table */}
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
                            <td className="px-3 py-2.5 font-medium">{s.subject_name}</td>
                            <td className="px-3 py-2.5">
                              <Badge variant="outline" className="text-xs font-normal">
                                {s.type === "discursiva" ? "Discursiva" : `${s.rangeLabel} (${s.question_count})`}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">{s.teacher_name || "—"}</td>
                            <td className="px-3 py-2.5">
                              <Badge className={`${subjectStatusColors[s.status]} text-xs`}>
                                {subjectStatusLabels[s.status]}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                {/* Professor actions */}
                                {isProfessor && ["pending", "in_progress", "revision_requested"].includes(s.status) && (
                                  <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => openProfessorEdit(s)}>
                                    <FileEdit className="h-3 w-3" /> Elaborar
                                  </Button>
                                )}
                                {isProfessor && s.status === "revision_requested" && s.revision_notes && (
                                  <span className="text-xs text-destructive max-w-[150px] truncate" title={s.revision_notes}>
                                    ⚠ {s.revision_notes}
                                  </span>
                                )}

                                {/* Coordinator actions */}
                                {isCoordinator && s.status === "submitted" && (
                                  <>
                                    <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => openRevisionDialog(s)}>
                                      <Eye className="h-3 w-3" /> Revisar
                                    </Button>
                                    <Button size="sm" className="gap-1 text-xs h-7 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(s.id)}>
                                      <CheckCircle2 className="h-3 w-3" /> Aprovar
                                    </Button>
                                  </>
                                )}
                                {isCoordinator && s.status === "approved" && (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">✓ Aprovada</Badge>
                                )}
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
                      {approved}/{total} aprovadas · {totalQuestions(sim.subjects)} questões objetivas
                    </span>
                    <div className="flex items-center gap-2">
                      {isCoordinator && (
                        <>
                          {allSubmitted && !allApproved && (
                            <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleApproveAll(sim)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar Tudo e Finalizar
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => generateEditableFile(sim)}>
                            <FileEdit className="h-3.5 w-3.5" /> Gerar Arquivo
                          </Button>
                          {sim.subjects.some((s) => s.status === "approved") && (
                            <>
                              <Button size="sm" className="gap-2" onClick={() => generateConsolidatedPDF(sim)}>
                                <Printer className="h-3.5 w-3.5" /> Imprimir PDF
                              </Button>
                              <Button variant="outline" size="sm" className="gap-2" onClick={() => generateAnswerKeyPDF(sim)}>
                                <FileText className="h-3.5 w-3.5" /> Gabarito
                              </Button>
                          </>
                          )}
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => setAnswerSheetSim(sim)}>
                            <FileSpreadsheet className="h-3.5 w-3.5" /> Folha de Respostas
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => setAnswerKeySim(sim)}>
                            <ClipboardList className="h-3.5 w-3.5" /> Preencher Gabarito
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => openAnnouncement(sim)}>
                            <MessageSquare className="h-3.5 w-3.5" /> Comunicado
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ============ PROFESSOR EDIT DIALOG ============ */}
      <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              {editingSubject?.subject_name} — {editingSubject?.question_count} questão(ões)
            </DialogTitle>
          </DialogHeader>
          {editingSubject?.revision_notes && editingSubject.status === "revision_requested" && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                <RotateCcw className="h-3.5 w-3.5" /> Nota da coordenação:
              </p>
              <p className="text-sm text-destructive mt-1">{editingSubject.revision_notes}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Questões (HTML)</Label>
              <Textarea
                rows={12}
                placeholder="Cole ou escreva as questões aqui..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Gabarito</Label>
              <Textarea
                rows={4}
                placeholder="1-A, 2-B, 3-C..."
                value={editAnswerKey}
                onChange={(e) => setEditAnswerKey(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar Rascunho
            </Button>
            <Button onClick={handleSubmitToReview} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar para Revisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ COORDINATOR REVISION DIALOG ============ */}
      <Dialog open={!!revisionSubject} onOpenChange={(open) => !open && setRevisionSubject(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Revisar: {revisionSubject?.subject_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Questões enviadas</Label>
              <div className="mt-1 p-4 rounded-lg border border-border bg-muted/20 prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: revisionSubject?.content || "<p>Sem conteúdo</p>" }} />
            </div>
            {revisionSubject?.answer_key && (
              <div>
                <Label className="text-xs text-muted-foreground">Gabarito</Label>
                <p className="mt-1 p-3 rounded-lg border border-border bg-muted/20 text-sm">{revisionSubject.answer_key}</p>
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <Label>Nota de revisão (para devolver ao professor)</Label>
              <Textarea rows={3} placeholder="Descreva o que precisa ser ajustado..." value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleRequestRevision} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
              <RotateCcw className="h-4 w-4" /> Devolver para Revisão
            </Button>
            <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => { handleApprove(revisionSubject!.id); setRevisionSubject(null); }}>
              <CheckCircle2 className="h-4 w-4" /> Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Textarea rows={6} placeholder="Escreva o comunicado..." value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={saveAnnouncementHandler} className="gap-2"><Save className="h-4 w-4" /> Salvar</Button>
            <Button onClick={sendAnnouncementHandler} className="gap-2"><Send className="h-4 w-4" /> Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Simulados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isProfessor ? "Simulados atribuídos a você" : "Crie e gerencie simulados multidisciplinares"}
          </p>
        </div>
        {isCoordinator && (
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Simulado
          </Button>
        )}
      </div>

      {isCoordinator ? (
        <Tabs defaultValue="simulados" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="simulados" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Simulados</TabsTrigger>
            <TabsTrigger value="correcoes" className="gap-1.5"><Trophy className="h-3.5 w-3.5" />Correções</TabsTrigger>
          </TabsList>
          <TabsContent value="simulados">
            {renderSimuladosList()}
          </TabsContent>
          <TabsContent value="correcoes">
            <CorrectionsTab simulados={simulados} />
          </TabsContent>
        </Tabs>
      ) : (
        renderSimuladosList()
      )}

      {/* Answer Sheet Generator */}
      {answerSheetSim && (
        <AnswerSheetGenerator
          sim={answerSheetSim}
          open={!!answerSheetSim}
          onOpenChange={(open) => !open && setAnswerSheetSim(null)}
        />
      )}

      {/* Answer Key Editor */}
      {answerKeySim && (
        <AnswerKeyEditor
          sim={answerKeySim}
          open={!!answerKeySim}
          onOpenChange={(open) => !open && setAnswerKeySim(null)}
          onSaved={() => {
            // Refetch to update the simulado data
            setAnswerKeySim(null);
          }}
        />
      )}
    </div>
  );
}
