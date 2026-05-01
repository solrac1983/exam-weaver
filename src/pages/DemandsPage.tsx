import { examTypeLabels, statusLabels } from "@/data/constants";
import { DemandCard } from "@/components/DemandCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  User,
  BookOpen,
  SlidersHorizontal,
  FileText,
  Printer,
  ClipboardList,
  Pencil,
  Trash2,
} from "lucide-react";
import { getExamContent } from "@/data/examContentStore";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Demand, DemandStatus, ExamType } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyDemands } from "@/hooks/useCompanyDemands";
import { CardGridSkeleton } from "@/components/PageSkeleton";
import { getStandaloneExams, subscribeStandaloneExams, loadStandaloneExamsFromDB, resetStandaloneDbCache, type StandaloneExam } from "@/data/examContentStore";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

type ViewMode = "grid" | "list";
type SortField = "deadline" | "createdAt" | "subjectName" | "teacherName" | "status";
type SortDir = "asc" | "desc";

const statusFilters: { label: string; value: DemandStatus | "all" }[] = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Em andamento", value: "in_progress" },
  { label: "Enviadas", value: "submitted" },
  { label: "Ajustes", value: "revision_requested" },
];

const examTypeFilters: { label: string; value: ExamType | "all" }[] = [
  { label: "Todos os tipos", value: "all" },
  { label: "Mensal", value: "mensal" },
  { label: "Bimestral", value: "bimestral" },
  { label: "Simulado", value: "simulado" },
  { label: "Recuperação", value: "recuperacao" },
];

const sortOptions: { label: string; value: SortField }[] = [
  { label: "Prazo", value: "deadline" },
  { label: "Criação", value: "createdAt" },
  { label: "Disciplina", value: "subjectName" },
  { label: "Professor", value: "teacherName" },
  { label: "Status", value: "status" },
];

const statusOrder: Record<string, number> = {
  pending: 0,
  in_progress: 1,
  submitted: 2,
  revision_requested: 3,
  review: 4,
  approved: 5,
  final: 6,
};

function isOverdue(deadline: string, status: string): boolean {
  return new Date(deadline) < new Date() && !["approved", "final"].includes(status);
}

export default function DemandsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DemandStatus | "all">("all");
  const [examTypeFilter, setExamTypeFilter] = useState<ExamType | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deleteExamId, setDeleteExamId] = useState<string | null>(null);
  const [deletingExam, setDeletingExam] = useState(false);
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();
  const { companyDemands: baseDemands, loading: demandsLoading } = useCompanyDemands();
  const [standaloneExams, setStandaloneExams] = useState(() => getStandaloneExams());

  useEffect(() => {
    loadStandaloneExamsFromDB().then(() => {
      setStandaloneExams(getStandaloneExams());
    });
    return subscribeStandaloneExams(() => {
      setStandaloneExams(getStandaloneExams());
    });
  }, []);

  const handlePrintExam = useCallback((e: React.MouseEvent, examId: string, title: string) => {
    e.stopPropagation();
    const htmlContent = getExamContent(examId);
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${title}</title><style>
      @page { size: A4; margin: 15mm 25mm 20mm 25mm; }
      @media print { body { margin: 0; padding: 0; } }
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 10mm 0; }
      h1, h2, h3 { color: #2c3e50; }
      table { width: 100%; border-collapse: collapse; margin: 2mm 0; }
      th, td { border: 1px solid #d1d5db; padding: 1.5mm 3mm; text-align: left; }
      th { background: #f3f4f6; font-weight: 600; }
      hr { border: none; border-top: 1px solid #d1d5db; margin: 4mm 0; }
      .doc-footer { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #e5e7eb; }
    </style></head><body>${htmlContent}<div class="doc-footer">SmartTest — Documento gerado em ${new Date().toLocaleDateString("pt-BR")}</div></body></html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) { showInvokeError("Permita pop-ups para imprimir."); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
  }, []);

  const handleDeleteExam = useCallback(async () => {
    if (!deleteExamId) return;
    setDeletingExam(true);
    try {
      const { error } = await supabase
        .from("standalone_exams")
        .delete()
        .eq("id", deleteExamId);
      if (error) throw error;
      resetStandaloneDbCache();
      await loadStandaloneExamsFromDB(true);
      setStandaloneExams(getStandaloneExams().filter((e) => e.id !== deleteExamId));
      showInvokeSuccess("Avaliação excluída com sucesso.");
    } catch (err) {
      console.error("Error deleting exam:", err);
      showInvokeError("Erro ao excluir avaliação.");
    } finally {
      setDeletingExam(false);
      setDeleteExamId(null);
    }
  }, [deleteExamId]);

  const toggleExamSelection = useCallback((examId: string) => {
    setSelectedExams(prev => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedExams.size === standaloneExams.length) {
      setSelectedExams(new Set());
    } else {
      setSelectedExams(new Set(standaloneExams.map(e => e.id)));
    }
  }, [standaloneExams, selectedExams.size]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedExams.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedExams);
      const { error } = await supabase
        .from("standalone_exams")
        .delete()
        .in("id", ids);
      if (error) throw error;
      resetStandaloneDbCache();
      await loadStandaloneExamsFromDB(true);
      setStandaloneExams(getStandaloneExams().filter(e => !selectedExams.has(e.id)));
      showInvokeSuccess(`${ids.length} avaliação(ões) excluída(s).`);
      setSelectedExams(new Set());
    } catch (err) {
      console.error("Bulk delete error:", err);
      showInvokeError("Erro ao excluir avaliações.");
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  }, [selectedExams]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Filter out approved/final for the active list (they go to Aprovações page)
  const activeDemands = useMemo(() => baseDemands.filter(d => !["approved", "final"].includes(d.status)), [baseDemands]);

  const results = useMemo(() => {
    const filtered = activeDemands.filter((d) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        d.teacherName.toLowerCase().includes(q) ||
        d.subjectName.toLowerCase().includes(q) ||
        d.classGroups.some((c) => c.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const matchesType = examTypeFilter === "all" || d.examType === examTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "deadline":
        case "createdAt":
          cmp = new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime();
          break;
        case "subjectName":
        case "teacherName":
          cmp = a[sortField].localeCompare(b[sortField], "pt-BR");
          break;
        case "status":
          cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [activeDemands, search, statusFilter, examTypeFilter, sortField, sortDir]);

  const overdueCount = activeDemands.filter((d) => isOverdue(d.deadline, d.status)).length;
  const pendingCount = activeDemands.filter((d) => d.status === "pending").length;
  const inProgressCount = activeDemands.filter((d) => d.status === "in_progress").length;

  if (demandsLoading) return <CardGridSkeleton cards={4} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Avaliações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie todas as avaliações de provas
          </p>
        </div>
        <Button onClick={() => navigate(role === "professor" ? "/provas/editor" : "/demandas/nova")} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Avaliação
        </Button>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span className="font-semibold text-foreground">{activeDemands.length}</span>
          <span className="text-muted-foreground">Total</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span className="font-semibold text-foreground">{pendingCount}</span>
          <span className="text-muted-foreground">Pendentes</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span className="font-semibold text-foreground">{inProgressCount}</span>
          <span className="text-muted-foreground">Em andamento</span>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            <span className="font-semibold text-destructive">{overdueCount}</span>
            <span className="text-destructive/80">Atrasadas</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar professor, disciplina ou turma..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Exam type filter */}
          <Select value={examTypeFilter} onValueChange={(v) => setExamTypeFilter(v as ExamType | "all")}>
            <SelectTrigger className="w-[160px]">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {examTypeFilters.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "Crescente" : "Decrescente"}
          >
            {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>

          {/* View toggle */}
          <div className="flex rounded-md border border-border overflow-hidden ml-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setStatusFilter(sf.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                statusFilter === sf.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {sf.label}
              {sf.value !== "all" && (
                <span className="ml-1 opacity-70">
                ({activeDemands.filter((d) => d.status === sf.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {results.length} {results.length === 1 ? "avaliação encontrada" : "avaliações encontradas"}
      </p>

      {/* Empty state */}
      {results.length === 0 && standaloneExams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhuma avaliação encontrada.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate(role === "professor" ? "/provas/editor" : "/demandas/nova")}>
            <Plus className="h-4 w-4" /> Criar avaliação
          </Button>
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map((demand) => (
            <DemandCard
              key={demand.id}
              demand={demand}
              onClick={() => navigate(`/demandas/${demand.id}`)}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="grid grid-cols-[1fr_120px_140px_120px_100px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
            <button className="flex items-center gap-1 hover:text-foreground text-left" onClick={() => toggleSort("subjectName")}>
              Disciplina
              {sortField === "subjectName" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
            <button className="flex items-center gap-1 hover:text-foreground text-left" onClick={() => toggleSort("teacherName")}>
              Professor
              {sortField === "teacherName" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
            <button className="flex items-center gap-1 hover:text-foreground text-left" onClick={() => toggleSort("deadline")}>
              Prazo
              {sortField === "deadline" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
            <span>Tipo</span>
            <button className="flex items-center gap-1 hover:text-foreground text-left" onClick={() => toggleSort("status")}>
              Status
              {sortField === "status" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
          </div>
          {results.map((demand) => {
            const overdue = isOverdue(demand.deadline, demand.status);
            return (
              <button
                key={demand.id}
                onClick={() => navigate(`/demandas/${demand.id}`)}
                className="grid grid-cols-[1fr_120px_140px_120px_100px] gap-2 px-4 py-3 text-sm w-full text-left border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors items-center"
              >
                <div className="min-w-0">
                  <span className="font-medium text-foreground truncate block">{demand.subjectName}</span>
                  <span className="text-xs text-muted-foreground">{demand.classGroups.join(", ")}</span>
                </div>
                <span className="text-muted-foreground truncate">{demand.teacherName}</span>
                <span className={cn("flex items-center gap-1", overdue && "text-destructive font-medium")}>
                  <Clock className="h-3 w-3" />
                  {new Date(demand.deadline).toLocaleDateString("pt-BR")}
                  {overdue && " ⚠"}
                </span>
                <span className="text-muted-foreground text-xs">{examTypeLabels[demand.examType]}</span>
                <StatusBadge status={demand.status} />
              </button>
            );
          })}
        </div>
      )}

      {/* Standalone professor exams — bottom */}
      {standaloneExams.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Avaliações Avulsas</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5"
                onClick={toggleSelectAll}
              >
                <Checkbox
                  checked={selectedExams.size === standaloneExams.length && standaloneExams.length > 0}
                  className="pointer-events-none"
                />
                {selectedExams.size === standaloneExams.length ? "Desmarcar todas" : "Selecionar todas"}
              </Button>
              {selectedExams.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir {selectedExams.size} selecionada{selectedExams.size > 1 ? "s" : ""}
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {standaloneExams.map((exam) => (
              <div
                key={exam.id}
                className={cn(
                  "rounded-lg border bg-card p-4 hover:shadow-md transition-all",
                  selectedExams.has(exam.id) ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedExams.has(exam.id)}
                    onCheckedChange={() => toggleExamSelection(exam.id)}
                    className="mt-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => navigate(`/provas/editor/${exam.id}`)}
                    className="w-full text-left flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground text-sm">{exam.title}</span>
                      <span className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        Avulsa
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <StatusBadge status={exam.status as DemandStatus} />
                      <span>Criada em {new Date(exam.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </button>
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); navigate(`/provas/editor/${exam.id}`); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    onClick={(e) => { e.stopPropagation(); setDeleteExamId(exam.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={(e) => handlePrintExam(e, exam.id, exam.title)}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}


      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteExamId} onOpenChange={(open) => { if (!open) setDeleteExamId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingExam}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              disabled={deletingExam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingExam ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedExams.size} avaliação(ões)?</AlertDialogTitle>
            <AlertDialogDescription>
              As avaliações selecionadas serão excluídas permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Excluindo..." : `Excluir ${selectedExams.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
