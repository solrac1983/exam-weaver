import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RichEditor } from "@/components/editor/RichEditor";
import { ChartDataPanel } from "@/components/editor/ChartDataPanel";
import { CommentsPanel } from "@/components/editor/CommentsPanel";
import type { ChartData } from "@/components/editor/ChartEditorTab";
import { defaultExamContent, saveExamContent, getExamContent, getExamTitle } from "@/data/examContentStore";
import { Button } from "@/components/ui/button";
import { mockDemands, mockQuestions, examTypeLabels, currentUser } from "@/data/mockData";
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
} from "lucide-react";
import type { GeneratedQuestion } from "@/pages/AIQuestionGeneratorPage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DemandStatus } from "@/types";


export default function ExamEditorPage() {
  const navigate = useNavigate();
  const { demandId } = useParams();
  const demand = mockDemands.find((d) => d.id === demandId);
  const isSimulado = demandId?.startsWith("simulado-");
  const simuladoTitle = demandId ? getExamTitle(demandId) : undefined;

  const isBlankNew = !demandId;
  const [content, setContent] = useState(() => isBlankNew ? "" : getExamContent(demandId || ""));
  const [savedContent, setSavedContent] = useState(() => isBlankNew ? "" : getExamContent(demandId || ""));
  const hasUnsavedChanges = content !== savedContent;
  const [showBank, setShowBank] = useState(false);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [activeChartData, setActiveChartData] = useState<ChartData | null>(null);
  const [chartUpdateFn, setChartUpdateFn] = useState<((data: ChartData) => void) | null>(null);
  const [saved, setSaved] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState(false);
  const { comments, addComment, deleteComment, resolveComment } = useExamComments(demandId, currentUser.name);
  const [storedAIQuestions, setStoredAIQuestions] = useState<GeneratedQuestion[]>([]);

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
            qHtml += "<ol type='A'>" + q.options.map((o) => `<li>${o}</li>`).join("") + "</ol>";
          }
          return qHtml;
        }).join("<hr/>");
        setContent((prev) => prev + html);
      } catch (e) { console.error(e); }
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
  const [demandStatus, setDemandStatus] = useState<DemandStatus>(demand?.status || "in_progress");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [revisionNote, setRevisionNote] = useState(demand?.notes || "");

  const isCoordinator = currentUser.role === "admin" || currentUser.role === "super_admin";
  const isProfessor = currentUser.role === "professor";

  // Status helpers
  const canSubmit = ["in_progress", "revision_requested"].includes(demandStatus);
  const canReview = ["submitted", "review"].includes(demandStatus) && isCoordinator;
  const isApproved = demandStatus === "approved" || demandStatus === "final";
  const isRevisionRequested = demandStatus === "revision_requested";

  const handleSave = () => {
    if (demandId) saveExamContent(demandId, content);
    setSavedContent(content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSubmitForReview = () => {
    if (demandId) saveExamContent(demandId, content);
    setDemandStatus("submitted");
    if (demand) {
      demand.status = "submitted";
      demand.updatedAt = new Date().toISOString().split("T")[0];
    }
    setSubmitDialogOpen(false);
    toast.success("Prova enviada para revisão da coordenação!");
  };

  const handleApprove = () => {
    setDemandStatus("approved");
    if (demand) {
      demand.status = "approved";
      demand.updatedAt = new Date().toISOString().split("T")[0];
    }
    setApproveDialogOpen(false);
    toast.success("Prova aprovada com sucesso!");
  };

  const handleReject = () => {
    if (!rejectionNote.trim()) {
      toast.error("Informe o motivo da rejeição.");
      return;
    }
    setDemandStatus("revision_requested");
    if (demand) {
      demand.status = "revision_requested";
      demand.notes = rejectionNote;
      demand.updatedAt = new Date().toISOString().split("T")[0];
    }
    setRevisionNote(rejectionNote);
    setRejectDialogOpen(false);
    setRejectionNote("");
    toast.info("Prova devolvida ao professor com observações.");
  };

  return (
    <div className="space-y-4 animate-fade-in">
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
              {isSimulado ? "Editor de Simulado" : "Editor de Prova"}
              {isSimulado && simuladoTitle && (
                <span className="text-muted-foreground font-normal">
                  {" "}— {simuladoTitle}
                </span>
              )}
              {!isSimulado && demand && (
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

          {/* Professor: Submit for review */}
          {canSubmit && (
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
                    const selected = mockQuestions.filter(q => selectedQuestions.has(q.id));
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
              {mockQuestions
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
    </div>
  );
}

function QuestionBankCard({ question, selected, onToggle }: { question: (typeof mockQuestions)[0]; selected: boolean; onToggle: () => void }) {
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
