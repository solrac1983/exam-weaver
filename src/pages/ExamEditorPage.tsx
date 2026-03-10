import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RichEditor } from "@/components/editor/RichEditor";
import { ChartDataPanel } from "@/components/editor/ChartDataPanel";
import { CommentsPanel } from "@/components/editor/CommentsPanel";
import type { ChartData } from "@/components/editor/ChartEditorTab";
import { defaultExamContent, saveExamContent, getExamContent, getExamTitle, saveStandaloneExamToDB, getStandaloneExam, loadStandaloneExamsFromDB } from "@/data/examContentStore";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { examTypeLabels } from "@/data/constants";
import { useQuestions } from "@/hooks/useQuestions";
import { useAuth } from "@/hooks/useAuth";
import { useExamComments } from "@/hooks/useExamComments";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { exportQuestionsToPDF } from "@/lib/exportQuestionsPDF";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Search,
  Save,
  Send,
  Library,
  X,
  GripVertical,
  Tag,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  ClipboardList,
  PanelTop,
  Brain,
  FileOutput,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { GeneratedQuestion } from "@/pages/AIQuestionGeneratorPage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DemandStatus, QuestionBankItem } from "@/types";
import { exportToDocx } from "@/lib/exportDocx";


export default function ExamEditorPage() {
  const navigate = useNavigate();
  const { demandId } = useParams();
  const { role, profile, user } = useAuth();
  const { questions: bankQuestions } = useQuestions();
  const [demand, setDemand] = useState<any>(null);
  const isSimulado = demandId?.startsWith("simulado-") && !demandId?.startsWith("sim-subject-");
  const isSimSubject = demandId?.startsWith("sim-subject-");
  const simSubjectId = isSimSubject ? demandId!.replace("sim-subject-", "") : null;
  const isStandalone = demandId?.startsWith("standalone-");
  const [isAvulsaExam, setIsAvulsaExam] = useState(!!isStandalone);
  const standaloneExam = demandId ? getStandaloneExam(demandId) : undefined;
  const simuladoTitle = demandId ? getExamTitle(demandId) : undefined;

  const isBlankNew = !demandId;
  const [examId, setExamId] = useState<string | null>(demandId || null);
  const [content, setContent] = useState(() => isBlankNew || isSimSubject ? "" : getExamContent(demandId || ""));
  const [savedContent, setSavedContent] = useState(() => isBlankNew || isSimSubject ? "" : getExamContent(demandId || ""));
  const hasUnsavedChanges = content !== savedContent;
  const [showBank, setShowBank] = useState(false);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [activeChartData, setActiveChartData] = useState<ChartData | null>(null);
  const [chartUpdateFn, setChartUpdateFn] = useState<((data: ChartData) => void) | null>(null);
  const [saved, setSaved] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState(false);
  const { comments, addComment, deleteComment, resolveComment } = useExamComments(demandId, profile?.full_name || "Usuário");
  const [storedAIQuestions, setStoredAIQuestions] = useState<GeneratedQuestion[]>([]);
  const [headerTemplates, setHeaderTemplates] = useState<{ id: string; name: string; file_url: string; segment: string | null; grade: string | null }[]>([]);
  const [headersLoaded, setHeadersLoaded] = useState(false);
  const [showHeadersModal, setShowHeadersModal] = useState(false);
  const [selectedHeaderId, setSelectedHeaderId] = useState<string | null>(null);
  const [headerSegmentFilter, setHeaderSegmentFilter] = useState<string>("all");

  // Simulado subject state
  const [simSubjectData, setSimSubjectData] = useState<{
    subject_name: string;
    question_count: number;
    status: string;
    revision_notes: string | null;
    answer_key: string | null;
    simulado_title?: string;
  } | null>(null);
  const [simSubjectLoading, setSimSubjectLoading] = useState(!!isSimSubject);

  // Load standalone exam from DB if not in memory
  useEffect(() => {
    if (!demandId || isSimulado || isSimSubject || isBlankNew) return;
    // Try loading from standalone_exams table
    const tryLoadStandalone = async () => {
      await loadStandaloneExamsFromDB();
      const exam = getStandaloneExam(demandId);
      if (exam) {
        setContent(exam.content);
        setSavedContent(exam.content);
        setIsAvulsaExam(true);
        return;
      }
      // If not standalone, try loading as a regular demand
      if (isStandalone) return;
      const { data } = await supabase
        .from("demands")
        .select("id, name, status, exam_type, deadline, class_groups, notes, content, subjects(name), teachers(name)")
        .eq("id", demandId)
        .maybeSingle();
      if (data) {
        setDemand({
          id: data.id,
          name: data.name,
          status: data.status,
          examType: data.exam_type,
          deadline: data.deadline,
          classGroups: data.class_groups || [],
          notes: data.notes,
          subjectName: (data as any).subjects?.name || "",
          teacherName: (data as any).teachers?.name || "",
        });
        // Load persisted exam content from DB
        const dbContent = (data as any).content || "";
        if (dbContent) {
          setContent(dbContent);
          setSavedContent(dbContent);
          saveExamContent(demandId, dbContent);
        }
      }
    };
    tryLoadStandalone();
  }, [demandId]);

  // Load simulado subject data from DB
  useEffect(() => {
    if (!simSubjectId) return;
    const load = async () => {
      setSimSubjectLoading(true);
      const { data: subData } = await supabase
        .from("simulado_subjects")
        .select("subject_name, question_count, status, revision_notes, answer_key, content, simulado_id")
        .eq("id", simSubjectId)
        .maybeSingle();
      if (subData) {
        // Also fetch simulado title
        const { data: simData } = await supabase
          .from("simulados")
          .select("title")
          .eq("id", subData.simulado_id)
          .maybeSingle();
        setSimSubjectData({
          subject_name: subData.subject_name,
          question_count: subData.question_count,
          status: subData.status,
          revision_notes: subData.revision_notes,
          answer_key: subData.answer_key,
          simulado_title: simData?.title || "",
        });
        setContent(subData.content || "");
        setSavedContent(subData.content || "");
        setDemandStatus(subData.status as DemandStatus);
        if (subData.revision_notes) setRevisionNote(subData.revision_notes);
      }
      setSimSubjectLoading(false);
    };
    load();
  }, [simSubjectId]);

  const loadHeaderTemplates = useCallback(async () => {
    if (headersLoaded) return;
    setHeadersLoaded(true);
    const { data } = await supabase.from("template_headers").select("id, name, file_url, segment, grade").order("created_at", { ascending: false });
    if (data) setHeaderTemplates(data);
  }, [headersLoaded]);

  // Save name modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [examName, setExamName] = useState("");

  // Pick up template content from sessionStorage
  useEffect(() => {
    const templateContent = sessionStorage.getItem("template-content");
    if (templateContent) {
      sessionStorage.removeItem("template-content");
      setContent(templateContent);
    }
  }, []);

  // Adaptive exam indicator
  const [adaptiveInfo, setAdaptiveInfo] = useState<{ distribution: { facil: number; media: number; dificil: number }; classAverage?: number } | null>(null);

  // Pick up AI-generated questions from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("ai-generated-questions");
    if (stored) {
      sessionStorage.removeItem("ai-generated-questions");
      try {
        const qs: GeneratedQuestion[] = JSON.parse(stored);
        setStoredAIQuestions(prev => [...prev, ...qs]);
        const html = qs.map((q) => {
          let qHtml = q.content;
          if (q.options && q.options.length > 0) {
            qHtml += q.options.map((o, idx) => `<p>${String.fromCharCode(65 + idx)}) ${o}</p>`).join("");
          }
          return qHtml;
        }).join("<hr/>");
        setContent((prev) => prev + html);
      } catch (e) { console.error(e); }
    }
    // Pick up adaptive config
    const adaptiveStored = sessionStorage.getItem("adaptive-exam-config");
    if (adaptiveStored) {
      sessionStorage.removeItem("adaptive-exam-config");
      try { setAdaptiveInfo(JSON.parse(adaptiveStored)); } catch (e) { console.error(e); }
    }
  }, []);

  // Safe navigation guard (no useBlocker needed)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const safeNavigate = (to: string | number) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(typeof to === "number" ? "__back__" : to);
      setShowLeaveDialog(true);
    } else {
      if (typeof to === "number") navigate(to as -1);
      else navigate(to);
    }
  };

  // Browser tab close / refresh warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Workflow state
  const [demandStatus, setDemandStatus] = useState<DemandStatus>("in_progress");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [revisionNote, setRevisionNote] = useState("");

  // Load real demand status from Supabase
  useEffect(() => {
    if (!demandId || isStandalone || isSimulado || isBlankNew || isSimSubject) return;
    supabase.from("demands").select("status, notes").eq("id", demandId).maybeSingle().then(({ data }) => {
      if (data) {
        setDemandStatus(data.status as DemandStatus);
        if (data.notes) setRevisionNote(data.notes);
      }
    });
  }, [demandId, isStandalone, isSimulado, isBlankNew]);

  // Auto-save with 30s debounce
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (isBlankNew && !examId) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const id = examId || demandId;
      if (!id) return;

      if (isSimSubject && simSubjectId) {
        await supabase.from("simulado_subjects").update({
          content: contentRef.current,
          status: demandStatus === "pending" ? "in_progress" : demandStatus,
          updated_at: new Date().toISOString(),
        }).eq("id", simSubjectId);
        if (demandStatus === "pending") setDemandStatus("in_progress" as DemandStatus);
      } else {
        saveExamContent(id, contentRef.current);
        if ((isStandalone || id.startsWith("standalone-") || !!getStandaloneExam(id)) && user && profile?.company_id) {
          const exam = getStandaloneExam(id);
          if (exam) {
            await saveStandaloneExamToDB({ ...exam, content: contentRef.current, updatedAt: new Date().toISOString() }, user.id, profile.company_id);
          }
        }
        // Auto-save regular demand content to DB
        if (!isStandalone && !isSimulado && !isBlankNew && demandId) {
          await supabase.from("demands").update({ content: contentRef.current, updated_at: new Date().toISOString() }).eq("id", demandId);
        }
      }

      setSavedContent(contentRef.current);
      setLastAutoSave(new Date());
      toast.success("Salvo automaticamente", { duration: 2000 });
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [content, hasUnsavedChanges, examId, demandId, isBlankNew, isSimSubject, simSubjectId, demandStatus, isStandalone, user, profile?.company_id]);

  const isCoordinator = role === "admin" || role === "super_admin";
  const isProfessor = role === "professor";

  // Status helpers
  const canSubmit = isSimSubject
    ? ["pending", "in_progress", "revision_requested"].includes(demandStatus)
    : ["in_progress", "revision_requested"].includes(demandStatus);
  const canReview = ["submitted", "review"].includes(demandStatus) && isCoordinator;
  const isApproved = demandStatus === "approved" || demandStatus === "final";
  const isRevisionRequested = demandStatus === "revision_requested";

  const handleSave = async () => {
    // Simulado subject: save to Supabase
    if (isSimSubject && simSubjectId) {
      await supabase.from("simulado_subjects").update({
        content,
        status: demandStatus === "pending" ? "in_progress" : demandStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", simSubjectId);
      if (demandStatus === "pending") setDemandStatus("in_progress" as DemandStatus);
      setSavedContent(content);
      setSaved(true);
      toast.success("Rascunho salvo!");
      setTimeout(() => setSaved(false), 2000);
      return;
    }
    // If blank new exam without an assigned ID, show modal to ask for name
    if (isBlankNew && !examId) {
      setShowNameModal(true);
      return;
    }
    const id = examId || demandId;
    if (id) {
      saveExamContent(id, content);
      // Persist standalone exams to DB
      if ((isStandalone || id.startsWith("standalone-") || !!getStandaloneExam(id)) && user && profile?.company_id) {
        const exam = getStandaloneExam(id);
        if (exam) {
          await saveStandaloneExamToDB({ ...exam, content, updatedAt: new Date().toISOString() }, user.id, profile.company_id);
        }
      }
      // Persist regular demand content to DB
      if (!isStandalone && !isSimulado && !isBlankNew && demandId) {
        await supabase.from("demands").update({ content, updated_at: new Date().toISOString() }).eq("id", demandId);
      }
    }
    setSavedContent(content);
    setSaved(true);
    toast.success("Rascunho salvo!");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConfirmSaveName = async () => {
    if (!examName.trim()) {
      toast.error("Informe o nome da avaliação.");
      return;
    }
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const exam = {
      id: newId,
      title: examName.trim(),
      content,
      createdAt: now,
      updatedAt: now,
      status: "in_progress",
    };
    
    if (user && profile?.company_id) {
      await saveStandaloneExamToDB(exam, user.id, profile.company_id);
    }
    
    setExamId(newId);
    setSavedContent(content);
    setSaved(true);
    setShowNameModal(false);
    setExamName("");
    toast.success("Avaliação salva com sucesso!");
    setTimeout(() => setSaved(false), 2000);
    navigate(`/provas/editor/${newId}`, { replace: true });
  };

  const handleSubmitForReview = async () => {
    // Simulado subject: submit to Supabase
    if (isSimSubject && simSubjectId) {
      await supabase.from("simulado_subjects").update({
        content,
        status: "submitted",
        updated_at: new Date().toISOString(),
      }).eq("id", simSubjectId);
      setDemandStatus("submitted");
      setSavedContent(content);
      setSubmitDialogOpen(false);
      toast.success("Questões enviadas para revisão da coordenação!");
      return;
    }
    if (demandId) saveExamContent(demandId, content);
    // Persist content + status to Supabase if it's a real demand
    if (demandId && !isStandalone && !isSimulado && !isBlankNew) {
      await supabase.from("demands").update({ content, status: "submitted", updated_at: new Date().toISOString() }).eq("id", demandId);
    }
    setDemandStatus("submitted");
    setSubmitDialogOpen(false);
    toast.success("Prova enviada para revisão da coordenação!");
  };

  const handleApprove = async () => {
    if (demandId && !isStandalone && !isAvulsaExam && !isSimulado && !isBlankNew) {
      await supabase.from("demands").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", demandId);
    }
    // For standalone/avulsa exams
    if (isAvulsaExam || isStandalone) {
      const id = examId || demandId;
      if (id) {
        const exam = getStandaloneExam(id);
        if (exam && user && profile?.company_id) {
          await saveStandaloneExamToDB({ ...exam, content, status: "approved", updatedAt: new Date().toISOString() }, user.id, profile.company_id);
        }
      }
    }
    setDemandStatus("approved");
    setApproveDialogOpen(false);
    toast.success("Prova aprovada com sucesso!");
    if (!isAvulsaExam && !isStandalone) navigate("/aprovacoes");
  };

  const handleReject = async () => {
    if (!rejectionNote.trim()) {
      toast.error("Informe o motivo da rejeição.");
      return;
    }
    if (demandId && !isStandalone && !isSimulado && !isBlankNew) {
      await supabase.from("demands").update({ status: "revision_requested", notes: rejectionNote, updated_at: new Date().toISOString() }).eq("id", demandId);
    }
    setDemandStatus("revision_requested");
    setRevisionNote(rejectionNote);
    setRejectDialogOpen(false);
    setRejectionNote("");
    toast.info("Prova devolvida ao professor com observações.");
  };

  if (simSubjectLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Simulado subject info banner */}
      {isSimSubject && simSubjectData && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <ClipboardList className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-medium text-foreground">{simSubjectData.subject_name}</span>
            <span className="text-muted-foreground"> — Elabore </span>
            <span className="font-semibold text-primary">{simSubjectData.question_count} questão(ões)</span>
            <span className="text-muted-foreground"> para o simulado </span>
            <span className="font-medium text-foreground">{simSubjectData.simulado_title}</span>
          </div>
          <StatusBadge status={demandStatus} />
        </div>
      )}

      {/* Adaptive exam indicator */}
      {adaptiveInfo && (
        <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
          <Brain className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-foreground">Prova Adaptativa</span>
            <span className="text-muted-foreground"> — Distribuição: </span>
            <span className="text-emerald-600 font-medium">{adaptiveInfo.distribution.facil}% Fácil</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-amber-600 font-medium">{adaptiveInfo.distribution.media}% Média</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-destructive font-medium">{adaptiveInfo.distribution.dificil}% Difícil</span>
            {adaptiveInfo.classAverage != null && (
              <span className="text-muted-foreground"> · Média da turma: {adaptiveInfo.classAverage}%</span>
            )}
          </div>
          <button onClick={() => setAdaptiveInfo(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => safeNavigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">
              {isSimSubject && simSubjectData ? "Editor de Simulado" : isSimulado ? "Editor de Simulado" : "Editor de Prova"}
              {isSimSubject && simSubjectData && (
                <span className="text-muted-foreground font-normal">
                  {" "}— {simSubjectData.simulado_title} · {simSubjectData.subject_name}
                </span>
              )}
              {isSimulado && simuladoTitle && (
                <span className="text-muted-foreground font-normal">
                  {" "}— {simuladoTitle}
                </span>
              )}
              {isStandalone && standaloneExam && (
                <span className="text-muted-foreground font-normal">
                  {" "}— {standaloneExam.title}
                </span>
              )}
              {!isSimulado && !isStandalone && demand && (
                <span className="text-muted-foreground font-normal">
                  {" "}— {demand.subjectName} ({examTypeLabels[demand.examType]})
                </span>
              )}
            </h1>
            {demand && (
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={demandStatus} />
                <span className="text-xs text-muted-foreground">
                  {demand.classGroups.join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/ai-questoes?return=/provas/editor/${demandId || ""}`)}
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-4 w-4" />
            Gerar com IA
          </Button>
          <DropdownMenu onOpenChange={(open) => { if (open) loadHeaderTemplates(); }}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <PanelTop className="h-4 w-4" />
                Cabeçalhos
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[240px] max-h-[320px] overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Modelos de Cabeçalho</DropdownMenuLabel>
              {headerTemplates.length === 0 && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Nenhum cabeçalho cadastrado
                </DropdownMenuItem>
              )}
              {headerTemplates.map((h) => (
                <DropdownMenuItem
                  key={h.id}
                  onClick={() => {
                    setContent((prev) => {
                      const imgTag = `<img src="${h.file_url}" alt="Cabeçalho: ${h.name}" style="width:100%;max-width:100%;" />`;
                      return imgTag + (prev || "");
                    });
                    toast.success(`Cabeçalho "${h.name}" inserido!`);
                  }}
                  className="flex flex-col items-start gap-0.5 cursor-pointer"
                >
                  <span className="text-xs font-medium">{h.name}</span>
                  {(h.segment || h.grade) && (
                    <span className="text-[10px] text-muted-foreground">
                      {[h.segment, h.grade].filter(Boolean).join(" • ")}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { loadHeaderTemplates(); setShowHeadersModal(true); }} className="text-xs">
                Ver todos os modelos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {storedAIQuestions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportQuestionsToPDF(storedAIQuestions, {
                title: isSimulado ? (simuladoTitle || "Simulado") : (demand ? `${demand.subjectName} — ${examTypeLabels[demand.examType]}` : "Gabarito"),
                author: "",
                institution: "",
                subject: demand?.subjectName || "",
                grade: demand?.classGroups.join(", ") || "",
                logoBase64: null,
                pageBreakPerQuestion: false,
                includeAnswerKey: true,
              })}
              className="gap-1.5"
            >
              <ClipboardList className="h-4 w-4" />
              Gabarito
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBank(!showBank)}
            className="gap-1.5"
          >
            <Library className="h-4 w-4" />
            Banco de Questões
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saved ? "Salvo ✓" : "Salvar"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              try {
                const title = isSimSubject && simSubjectData
                  ? `${simSubjectData.simulado_title} - ${simSubjectData.subject_name}`
                  : isStandalone && standaloneExam
                    ? standaloneExam.title
                    : demand
                      ? `${demand.subjectName} - ${examTypeLabels[demand.examType]}`
                      : "Avaliação";
                exportToDocx(content, title);
                toast.success("Documento exportado com sucesso!");
              } catch {
                toast.error("Erro ao exportar para .docx");
              }
            }}
          >
            <FileOutput className="h-4 w-4" />
            Exportar Word
          </Button>

          {/* Admin on avulsa exam: direct approve */}
          {isAvulsaExam && isCoordinator && canSubmit && (
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={async () => {
                // Save content first
                const id = examId || demandId;
                if (id) {
                  saveExamContent(id, content);
                  const exam = getStandaloneExam(id);
                  if (exam && user && profile?.company_id) {
                    await saveStandaloneExamToDB({ ...exam, content, status: "approved", updatedAt: new Date().toISOString() }, user.id, profile.company_id);
                  }
                }
                setDemandStatus("approved");
                setSavedContent(content);
                toast.success("Avaliação aprovada com sucesso!");
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprovar
            </Button>
          )}

          {/* Professor or non-avulsa: Submit for review */}
          {canSubmit && !(isAvulsaExam && isCoordinator) && (
            <Button size="sm" className="gap-1.5" onClick={() => setSubmitDialogOpen(true)}>
              <Send className="h-4 w-4" />
              Enviar para revisão
            </Button>
          )}

          {/* Coordinator: Approve / Reject */}
          {canReview && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setRejectDialogOpen(true)}
              >
                <XCircle className="h-4 w-4" />
                Rejeitar
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setApproveDialogOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprovar
              </Button>
            </>
          )}

          {isApproved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aprovada
            </span>
          )}
        </div>
      </div>

      {/* Revision note banner */}
      {isRevisionRequested && revisionNote && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-destructive">Ajustes solicitados pela coordenação</h4>
            <p className="text-sm text-muted-foreground mt-1">{revisionNote}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Faça as correções necessárias e envie novamente para revisão.
            </p>
          </div>
        </div>
      )}

      {/* Editor + Side panels */}
      <div className="flex gap-4">
        <div className={cn("flex-1 transition-all min-w-0", (showBank || showDataPanel || showComments) ? "max-w-[calc(100%-340px)]" : "max-w-full")}>
          <RichEditor
            content={content}
            onChange={setContent}
            showDataPanel={showDataPanel}
            onToggleDataPanel={() => setShowDataPanel(p => !p)}
            onChartDataChange={(data) => {
              setActiveChartData(data);
              if (!data) setShowDataPanel(false);
            }}
            onChartUpdate={(data) => setActiveChartData(data)}
            showComments={showComments}
            onToggleComments={() => setShowComments(p => !p)}
          />
        </div>

        {/* Chart Data Panel (fixed right side) */}
        {showDataPanel && activeChartData && (
          <ChartDataPanel
            chartData={activeChartData}
            onUpdate={(newData) => {
              setActiveChartData(newData);
              // Trigger update through RichEditor's onChartUpdate mechanism
              // We need a ref-based approach — for now dispatch a custom event
              window.dispatchEvent(new CustomEvent('chart-data-update', { detail: newData }));
            }}
            onClose={() => setShowDataPanel(false)}
          />
        )}

        {showComments && (
          <CommentsPanel
            comments={comments}
            onAddComment={addComment}
            onDeleteComment={deleteComment}
            onResolveComment={resolveComment}
            onClose={() => setShowComments(false)}
          />
        )}

        {showBank && (
          <div className="w-[300px] flex-shrink-0 glass-card rounded-lg overflow-hidden animate-slide-in-left flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Banco de Questões</h3>
              <button
                onClick={() => { setShowBank(false); setSelectedQuestions(new Set()); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 pt-3 pb-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar questão..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
            {selectedQuestions.size > 0 && (
              <div className="px-3 pt-2 pb-1">
                <Button
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => {
                    const selected = bankQuestions.filter(q => selectedQuestions.has(q.id));
                    const html = selected.map(q => `<p><strong>${q.subjectName}</strong> — ${q.content}</p>`).join("<hr/>");
                    setContent(prev => prev + html);
                    setSelectedQuestions(new Set());
                    toast.success(`${selected.length} questão(ões) inserida(s)!`);
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Inserir {selectedQuestions.size} questão(ões)
                </Button>
              </div>
            )}
            <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto flex-1">
              {bankQuestions
                .filter((q) => {
                  if (!bankSearch) return true;
                  const s = bankSearch.toLowerCase();
                  return (
                    q.content.toLowerCase().includes(s) ||
                    q.subjectName.toLowerCase().includes(s) ||
                    q.topic.toLowerCase().includes(s) ||
                    q.tags.some((t) => t.toLowerCase().includes(s))
                  );
                })
                .map((q) => (
                  <QuestionBankCard
                    key={q.id}
                    question={q}
                    selected={selectedQuestions.has(q.id)}
                    onToggle={() => setSelectedQuestions(prev => {
                      const next = new Set(prev);
                      if (next.has(q.id)) next.delete(q.id);
                      else next.add(q.id);
                      return next;
                    })}
                  />
                ))}
            </div>
          </div>
        )}
      </div>


      {/* Submit for review dialog */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Enviar prova para revisão
            </AlertDialogTitle>
            <AlertDialogDescription>
              A prova será enviada para a coordenação validar. Você não poderá editá-la até que seja aprovada ou devolvida com observações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitForReview}>
              Confirmar envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Aprovar prova
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ao aprovar, a prova estará liberada para impressão. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700">
              Aprovar prova
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-destructive" />
              Rejeitar prova
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O professor receberá essa observação e deverá corrigir a prova.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Observações / Motivo da rejeição *</Label>
            <Textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Ex: Revisar questão 5 — enunciado ambíguo. Adicionar mais uma questão discursiva."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
            >
              Rejeitar e devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave without saving dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que não foram salvas. Deseja sair mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowLeaveDialog(false); setPendingNavigation(null); }}>
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                setShowLeaveDialog(false);
                if (pendingNavigation === "__back__") navigate(-1);
                else if (pendingNavigation) navigate(pendingNavigation);
                setPendingNavigation(null);
              }}
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save name modal for standalone exams */}
      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" />
              Nome da Avaliação
            </DialogTitle>
            <DialogDescription>
              Informe o nome desta avaliação avulsa para salvá-la.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Nome da avaliação *</Label>
            <Input
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Ex: Prova de Matemática — 2º Bimestre"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirmSaveName(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNameModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSaveName}>
              Salvar avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header templates modal */}
      <Dialog open={showHeadersModal} onOpenChange={setShowHeadersModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PanelTop className="h-5 w-5 text-primary" />
              Modelos de Cabeçalho
            </DialogTitle>
            <DialogDescription>
              Selecione um cabeçalho para inserir no início da sua prova.
            </DialogDescription>
          </DialogHeader>
          {/* Segment filter */}
          {headerTemplates.length > 0 && (() => {
            const segments = Array.from(new Set(headerTemplates.map(h => h.segment).filter(Boolean))) as string[];
            return segments.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap pb-1">
                <span className="text-xs text-muted-foreground font-medium">Segmento:</span>
                <button
                  onClick={() => setHeaderSegmentFilter("all")}
                  className={cn("px-2.5 py-1 rounded-full text-xs font-medium transition-colors", headerSegmentFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}
                >Todos</button>
                {segments.map(s => (
                  <button
                    key={s}
                    onClick={() => setHeaderSegmentFilter(s)}
                    className={cn("px-2.5 py-1 rounded-full text-xs font-medium transition-colors", headerSegmentFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}
                  >{s}</button>
                ))}
              </div>
            ) : null;
          })()}
          <div className="flex-1 overflow-y-auto py-2 space-y-3">
            {(() => {
              const filtered = headerSegmentFilter === "all" ? headerTemplates : headerTemplates.filter(h => h.segment === headerSegmentFilter);
              return filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum cabeçalho encontrado.</p>
              ) : (
                filtered.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => setSelectedHeaderId(h.id === selectedHeaderId ? null : h.id)}
                    className={cn(
                      "rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm",
                      selectedHeaderId === h.id
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedHeaderId === h.id} className="flex-shrink-0" tabIndex={-1} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{h.name}</span>
                        {(h.segment || h.grade) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[h.segment, h.grade].filter(Boolean).join(" • ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <img
                      src={h.file_url}
                      alt={h.name}
                      className="mt-2 w-full rounded border border-border object-contain max-h-[120px] bg-muted/30"
                    />
                  </div>
                ))
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHeadersModal(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedHeaderId}
              onClick={() => {
                const header = headerTemplates.find((h) => h.id === selectedHeaderId);
                if (header) {
                  setContent((prev) => {
                    const imgTag = `<img src="${header.file_url}" alt="Cabeçalho: ${header.name}" style="width:100%;max-width:100%;" />`;
                    return imgTag + (prev || "");
                  });
                  toast.success(`Cabeçalho "${header.name}" inserido!`);
                }
                setSelectedHeaderId(null);
                setShowHeadersModal(false);
              }}
            >
              Inserir cabeçalho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionBankCard({ question, selected, onToggle }: { question: QuestionBankItem; selected: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        "rounded-md border p-3 text-xs cursor-pointer hover:shadow-sm transition-all group",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox checked={selected} className="mt-0.5" tabIndex={-1} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-medium text-foreground">{question.subjectName}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{question.grade}</span>
          </div>
          <p className="text-muted-foreground line-clamp-2">{question.content}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {question.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                <Tag className="h-2 w-2" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
