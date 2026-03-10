import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSimulados, Simulado, SimuladoSubject } from "@/hooks/useSimulados";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Plus, BookOpen, ClipboardList, Trophy, Search,
  LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown,
  SlidersHorizontal, Clock, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import AnswerSheetGenerator from "@/components/simulados/AnswerSheetGenerator";
import AnswerKeyEditor from "@/components/simulados/AnswerKeyEditor";
import CorrectionsTab from "@/components/simulados/CorrectionsTab";
import StandaloneSimuladosTab from "@/components/simulados/StandaloneSimuladosTab";
import SimuladoCreateForm from "@/components/simulados/SimuladoCreateForm";
import SimuladoCard from "@/components/simulados/SimuladoCard";
import { RevisionDialog, AnnouncementDialog } from "@/components/simulados/SimuladoDialogs";
import SimuladoEditDialog from "@/components/simulados/SimuladoEditDialog";
import { generateEditableFile, generateConsolidatedPDF, generateAnswerKeyPDF } from "@/components/simulados/SimuladoPDFGenerator";
import { statusLabels } from "@/components/simulados/SimuladoConstants";

type ViewMode = "grid" | "list";
type SortField = "deadline" | "created_at" | "title" | "status";
type SortDir = "asc" | "desc";
type SimStatus = "all" | "draft" | "sent" | "in_progress" | "complete";

const statusFilters: { label: string; value: SimStatus }[] = [
  { label: "Todas", value: "all" },
  { label: "Rascunho", value: "draft" },
  { label: "Enviados", value: "sent" },
  { label: "Em andamento", value: "in_progress" },
  { label: "Completos", value: "complete" },
];

const sortOptions: { label: string; value: SortField }[] = [
  { label: "Prazo", value: "deadline" },
  { label: "Criação", value: "created_at" },
  { label: "Título", value: "title" },
  { label: "Status", value: "status" },
];

const statusOrder: Record<string, number> = {
  draft: 0, sent: 1, in_progress: 2, complete: 3,
};

export default function SimuladosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAuth();
  const {
    simulados, teachers, classGroups, subjects, loading, hasMore, loadMore, createSimulado,
    updateSubjectStatus,
    updateAnnouncement, updateSimuladoStatus, deleteSimulado, updateSimulado,
  } = useSimulados();

  const isCoordinator = role === "admin" || role === "super_admin";
  const isProfessor = role === "professor";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SimStatus>("all");
  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Dialog states
  const [revisionSubject, setRevisionSubject] = useState<SimuladoSubject | null>(null);
  const [announcementSimId, setAnnouncementSimId] = useState<string | null>(null);
  const [announcementInitialText, setAnnouncementInitialText] = useState("");
  const [answerSheetSim, setAnswerSheetSim] = useState<Simulado | null>(null);
  const [answerKeySim, setAnswerKeySim] = useState<Simulado | null>(null);
  const [editingSim, setEditingSim] = useState<Simulado | null>(null);

  // Auto-open subject editor from query param (deep link from profile)
  useEffect(() => {
    if (loading) return;
    const editSubjectId = searchParams.get("editSubject");
    if (editSubjectId) {
      navigate(`/provas/editor/sim-subject-${editSubjectId}`);
      searchParams.delete("editSubject");
      setSearchParams(searchParams, { replace: true });
    }
  }, [loading, simulados, searchParams]);

  // Filtered & sorted simulados
  const results = useMemo(() => {
    const filtered = simulados.filter((sim) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        sim.title.toLowerCase().includes(q) ||
        sim.class_groups.some((c) => c.toLowerCase().includes(q)) ||
        sim.subjects.some((s) =>
          s.subject_name.toLowerCase().includes(q) ||
          (s.teacher_name || "").toLowerCase().includes(q)
        );
      const matchesStatus = statusFilter === "all" || sim.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "deadline":
          cmp = (new Date(a.deadline || "9999").getTime()) - (new Date(b.deadline || "9999").getTime());
          break;
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "title":
          cmp = a.title.localeCompare(b.title, "pt-BR");
          break;
        case "status":
          cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [simulados, search, statusFilter, sortField, sortDir]);

  // Quick stats
  const draftCount = simulados.filter((s) => s.status === "draft").length;
  const sentCount = simulados.filter((s) => s.status === "sent").length;
  const inProgressCount = simulados.filter((s) => s.status === "in_progress").length;
  const completeCount = simulados.filter((s) => s.status === "complete").length;

  if (loading) return <DashboardSkeleton />;

  /* ---- Handlers ---- */
  const handleProfessorEdit = (sub: SimuladoSubject) => {
    navigate(`/provas/editor/sim-subject-${sub.id}`);
  };

  const handleApprove = async (subjectId: string) => {
    await updateSubjectStatus(subjectId, "approved");
    toast({ title: "Disciplina aprovada!" });
  };

  const handleRequestRevision = async (subjectId: string, notes: string) => {
    await updateSubjectStatus(subjectId, "revision_requested", notes);
    toast({ title: "Revisão solicitada ao professor." });
  };

  const handleApproveAll = async (sim: Simulado) => {
    const pending = sim.subjects.filter((s) => s.status === "submitted");
    await Promise.all(pending.map((sub) => updateSubjectStatus(sub.id, "approved")));
    await updateSimuladoStatus(sim.id, "complete");
    toast({ title: "Simulado aprovado e finalizado!" });
  };

  const handleAnnouncement = async (simId: string, text: string) => {
    await updateAnnouncement(simId, text);
    toast({ title: "Comunicado salvo!" });
  };

  const handleGeneratePDF = (sim: Simulado) => {
    if (!generateConsolidatedPDF(sim)) {
      toast({ title: "Nenhuma disciplina aprovada ou pop-ups bloqueados.", variant: "destructive" });
    }
  };

  const handleGenerateAnswerKey = (sim: Simulado) => {
    if (!generateAnswerKeyPDF(sim)) {
      toast({ title: "Nenhuma disciplina aprovada ou pop-ups bloqueados.", variant: "destructive" });
    }
  };

  const handleCreate = async (data: Parameters<typeof createSimulado>[0]) => {
    await createSimulado(data);
    setShowNew(false);
    toast({ title: "Simulado criado com sucesso!" });
  };

  const handleEdit = (sim: Simulado) => {
    setEditingSim(sim);
  };

  const handleSaveEdit = async (simId: string, data: Parameters<typeof updateSimulado>[1]) => {
    await updateSimulado(simId, data);
    toast({ title: `Simulado atualizado com sucesso!` });
  };

  const handleDelete = async (sim: Simulado) => {
    await deleteSimulado(sim.id);
    toast({ title: `Simulado "${sim.title}" excluído com sucesso.` });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  /* ---- Render list ---- */
  const renderSimuladosList = () => (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span className="font-semibold text-foreground">{simulados.length}</span>
          <span className="text-muted-foreground">Total</span>
        </div>
        {draftCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">{draftCount}</span>
            <span className="text-muted-foreground">Rascunhos</span>
          </div>
        )}
        {inProgressCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">{inProgressCount}</span>
            <span className="text-muted-foreground">Em andamento</span>
          </div>
        )}
        {completeCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">{completeCount}</span>
            <span className="text-muted-foreground">Completos</span>
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
              placeholder="Buscar título, disciplina, professor ou turma..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

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
                  ({simulados.filter((s) => s.status === sf.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {results.length} simulado{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
      </p>

      {showNew && isCoordinator && (
        <SimuladoCreateForm
          teachers={teachers}
          classGroups={classGroups}
          dbSubjects={subjects}
          onCancel={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}

      {results.length === 0 && !showNew && (
        <Card className="py-16 flex flex-col items-center justify-center text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            {isProfessor ? "Nenhum simulado atribuído a você." : "Nenhum simulado encontrado."}
          </p>
          {isCoordinator && simulados.length === 0 && (
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" /> Criar primeiro simulado
            </Button>
          )}
        </Card>
      )}

      {/* List view */}
      {viewMode === "list" && results.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="grid grid-cols-[1fr_120px_140px_100px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
            <button className="flex items-center gap-1 hover:text-foreground text-left" onClick={() => toggleSort("title")}>
              Título
              {sortField === "title" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
            <span>Turmas</span>
            <button className="flex items-center gap-1 hover:text-foreground text-left" onClick={() => toggleSort("deadline")}>
              Prazo
              {sortField === "deadline" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
            <button className="flex items-center gap-1 hover:text-foreground text-left" onClick={() => toggleSort("status")}>
              Status
              {sortField === "status" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
          </div>
          {results.map((sim) => (
            <button
              key={sim.id}
              onClick={() => setExpandedId(expandedId === sim.id ? null : sim.id)}
              className="grid grid-cols-[1fr_120px_140px_100px] gap-2 px-4 py-3 text-sm w-full text-left border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors items-center"
            >
              <div className="min-w-0">
                <span className="font-medium text-foreground truncate block">{sim.title}</span>
                <span className="text-xs text-muted-foreground">{sim.subjects.length} disciplina(s)</span>
              </div>
              <span className="text-muted-foreground text-xs truncate">{sim.class_groups.join(", ")}</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {sim.deadline ? new Date(sim.deadline).toLocaleDateString("pt-BR") : "—"}
              </span>
              <Badge className={cn(
                "text-xs",
                sim.status === "draft" ? "bg-muted text-muted-foreground" :
                sim.status === "sent" ? "bg-info/10 text-info" :
                sim.status === "in_progress" ? "bg-warning/10 text-warning" :
                "bg-success/10 text-success"
              )}>
                {statusLabels[sim.status]}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Grid view (card) */}
      {viewMode === "grid" && (
        <div className="space-y-4">
          {results.map((sim) => (
            <SimuladoCard
              key={sim.id}
              sim={sim}
              isExpanded={expandedId === sim.id}
              onToggle={() => setExpandedId(expandedId === sim.id ? null : sim.id)}
              isCoordinator={isCoordinator}
              isProfessor={isProfessor}
              onProfessorEdit={handleProfessorEdit}
              onRevision={setRevisionSubject}
              onApprove={handleApprove}
              onApproveAll={handleApproveAll}
              onGenerateFile={(s) => generateEditableFile(s, navigate)}
              onGeneratePDF={handleGeneratePDF}
              onGenerateAnswerKey={handleGenerateAnswerKey}
              onAnnouncement={(s) => { setAnnouncementSimId(s.id); setAnnouncementInitialText(s.announcement || ""); }}
              onAnswerSheet={setAnswerSheetSim}
              onAnswerKeyEditor={setAnswerKeySim}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} className="gap-2">
            Carregar mais simulados
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <RevisionDialog
        subject={revisionSubject}
        onClose={() => setRevisionSubject(null)}
        onRequestRevision={handleRequestRevision}
        onApprove={handleApprove}
      />

      <AnnouncementDialog
        simId={announcementSimId}
        initialText={announcementInitialText}
        onClose={() => setAnnouncementSimId(null)}
        onSave={handleAnnouncement}
      />

      <SimuladoEditDialog
        sim={editingSim}
        teachers={teachers}
        classGroups={classGroups}
        dbSubjects={subjects}
        onClose={() => setEditingSim(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
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
            <TabsTrigger value="avulsos" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Avulsos</TabsTrigger>
            <TabsTrigger value="correcoes" className="gap-1.5"><Trophy className="h-3.5 w-3.5" />Correções</TabsTrigger>
          </TabsList>
          <TabsContent value="simulados">{renderSimuladosList()}</TabsContent>
          <TabsContent value="avulsos"><StandaloneSimuladosTab /></TabsContent>
          <TabsContent value="correcoes"><CorrectionsTab simulados={simulados} /></TabsContent>
        </Tabs>
      ) : (
        renderSimuladosList()
      )}

      {answerSheetSim && (
        <AnswerSheetGenerator sim={answerSheetSim} open={!!answerSheetSim} onOpenChange={(open) => !open && setAnswerSheetSim(null)} />
      )}
      {answerKeySim && (
        <AnswerKeyEditor sim={answerKeySim} open={!!answerKeySim} onOpenChange={(open) => !open && setAnswerKeySim(null)} onSaved={() => setAnswerKeySim(null)} />
      )}
    </div>
  );
}
