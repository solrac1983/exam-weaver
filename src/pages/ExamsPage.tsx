import { useState, useMemo } from "react";
import { mockDemands, examTypeLabels, mockSubjects, statusLabels, currentUser } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { FileText, Pencil, Search, Filter, X, ArrowDown, ArrowUp, LayoutGrid, List, Clock, AlertTriangle, CheckCircle2, MoreVertical, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DemandStatus, Demand } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ─── Urgency helpers ───
function getDeadlineUrgency(deadline: string, status: DemandStatus): "overdue" | "soon" | "ok" | "done" {
  if (["approved", "final"].includes(status)) return "done";
  const now = new Date();
  const dl = new Date(deadline);
  const diffDays = (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "soon";
  return "ok";
}

function UrgencyBadge({ deadline, status }: { deadline: string; status: DemandStatus }) {
  const urgency = getDeadlineUrgency(deadline, status);
  if (urgency === "done") return null;

  const config = {
    overdue: { icon: AlertTriangle, label: "Atrasada", className: "text-destructive bg-destructive/10" },
    soon: { icon: Clock, label: "Prazo próximo", className: "text-amber-600 bg-amber-500/10" },
    ok: { icon: CheckCircle2, label: "No prazo", className: "text-emerald-600 bg-emerald-500/10" },
  }[urgency];

  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", config.className)}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}

// ─── Kanban columns ───
const kanbanColumns: { status: DemandStatus; label: string; color: string }[] = [
  { status: "pending", label: "Pendente", color: "border-muted-foreground/30" },
  { status: "in_progress", label: "Em andamento", color: "border-primary/40" },
  { status: "submitted", label: "Enviada", color: "border-sky-500/40" },
  { status: "review", label: "Em revisão", color: "border-amber-500/40" },
  { status: "revision_requested", label: "Ajustes", color: "border-destructive/40" },
  { status: "approved", label: "Aprovada", color: "border-emerald-500/40" },
  { status: "final", label: "Finalizada", color: "border-emerald-600/40" },
];

const ITEMS_PER_PAGE = 10;

// ─── Kanban Card ───
function KanbanCard({ d, onClick, onDragStart, onArchive, onDelete, isCoordinator }: {
  d: Demand; onClick: () => void; onDragStart?: (e: React.DragEvent) => void;
  onArchive?: () => void; onDelete?: () => void; isCoordinator?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      aria-label={`Prova de ${d.subjectName} — ${examTypeLabels[d.examType]}, professor ${d.teacherName}`}
      className={cn("glass-card rounded-lg p-3 space-y-2 animate-fade-in hover:ring-1 hover:ring-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative group", onDragStart ? "cursor-grab active:cursor-grabbing" : "cursor-pointer")}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
    >
      {isCoordinator && (
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button onClick={(e) => e.stopPropagation()} className="p-1 rounded-md hover:bg-muted">
                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive?.(); }}>
                <Archive className="h-3.5 w-3.5 mr-2" /> Arquivar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <FileText className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-foreground truncate">{d.subjectName}</h4>
          <p className="text-[10px] text-muted-foreground">{examTypeLabels[d.examType]}</p>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p>{d.teacherName}</p>
        <p>{d.classGroups.join(", ")}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {new Date(d.deadline).toLocaleDateString("pt-BR")}
        </span>
        <UrgencyBadge deadline={d.deadline} status={d.status} />
      </div>
    </div>
  );
}

// ─── List Card ───
function ListCard({ d, onClick, onArchive, onDelete, isCoordinator }: {
  d: Demand; onClick: () => void;
  onArchive?: () => void; onDelete?: () => void; isCoordinator?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Prova de ${d.subjectName} — ${examTypeLabels[d.examType]}, professor ${d.teacherName}`}
      className="glass-card rounded-lg p-4 flex items-center justify-between animate-fade-in cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">
              {d.subjectName} — {examTypeLabels[d.examType]}
            </h3>
            <StatusBadge status={d.status} />
            <UrgencyBadge deadline={d.deadline} status={d.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {d.teacherName} • {d.classGroups.join(", ")} • Prazo: {new Date(d.deadline).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isCoordinator && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive?.(); }}>
                <Archive className="h-3.5 w-3.5 mr-2" /> Arquivar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function ExamsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [viewMode, setViewMode] = useState<"kanban" | "list">(isMobile ? "list" : "kanban");
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localDemands, setLocalDemands] = useState<Demand[]>(() =>
    mockDemands.filter((d) =>
      ["submitted", "review", "revision_requested", "approved", "final", "in_progress", "pending"].includes(d.status)
    )
  );
  const [dragOverCol, setDragOverCol] = useState<DemandStatus | null>(null);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Demand | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Demand | null>(null);

  const isCoordinator = currentUser.role === "coordinator" || currentUser.role === "director";

  const allExamDemands = localDemands.filter((d) => !archivedIds.has(d.id));
  const archivedDemands = localDemands.filter((d) => archivedIds.has(d.id));

  const handleDragStart = (e: React.DragEvent, demandId: string) => {
    e.dataTransfer.setData("text/plain", demandId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: DemandStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(status);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: DemandStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const demandId = e.dataTransfer.getData("text/plain");
    if (!demandId) return;
    setLocalDemands((prev) =>
      prev.map((d) => (d.id === demandId ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d))
    );
  };

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    allExamDemands.forEach((d) => map.set(d.teacherId, d.teacherName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, []);

  const filtered = useMemo(() => {
    let result = allExamDemands;
    if (filterSubject !== "all") result = result.filter((d) => d.subjectId === filterSubject);
    if (filterType !== "all") result = result.filter((d) => d.examType === filterType);
    if (filterTeacher !== "all") result = result.filter((d) => d.teacherId === filterTeacher);
    if (filterStatus !== "all") result = result.filter((d) => d.status === filterStatus);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.subjectName.toLowerCase().includes(s) ||
          d.teacherName.toLowerCase().includes(s) ||
          examTypeLabels[d.examType]?.toLowerCase().includes(s) ||
          d.classGroups.some((c) => c.toLowerCase().includes(s))
      );
    }
    result.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return result;
  }, [search, filterSubject, filterType, filterTeacher, filterStatus, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedList = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const hasActiveFilters = filterSubject !== "all" || filterType !== "all" || filterTeacher !== "all" || filterStatus !== "all" || search !== "";

  const clearFilters = () => {
    setFilterSubject("all");
    setFilterType("all");
    setFilterTeacher("all");
    setFilterStatus("all");
    setSearch("");
    setCurrentPage(1);
  };

  const toggleSort = () => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));

  const handleArchive = (d: Demand) => {
    setArchivedIds((prev) => new Set(prev).add(d.id));
    toast.success(`"${d.subjectName}" arquivada.`, {
      action: { label: "Desfazer", onClick: () => setArchivedIds((prev) => { const s = new Set(prev); s.delete(d.id); return s; }) },
    });
    setArchiveTarget(null);
  };

  const handleUnarchive = (id: string) => {
    setArchivedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    toast.success("Prova restaurada.");
  };

  const handleDelete = (d: Demand) => {
    setLocalDemands((prev) => prev.filter((x) => x.id !== d.id));
    setArchivedIds((prev) => { const s = new Set(prev); s.delete(d.id); return s; });
    toast.success(`"${d.subjectName}" excluída.`);
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col animate-fade-in h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Provas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie e edite provas — {filtered.length} prova(s) encontrada(s)
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("kanban"); setCurrentPage(1); }}
            className="gap-1.5 h-8 text-xs"
            aria-label="Visualização Kanban"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            {!isMobile && "Kanban"}
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("list"); setCurrentPage(1); }}
            className="gap-1.5 h-8 text-xs"
            aria-label="Visualização em lista"
          >
            <List className="h-3.5 w-3.5" />
            {!isMobile && "Lista"}
          </Button>
        </div>
      </div>

      {/* Search + Collapsible Filters */}
      <div className="glass-card rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, disciplina, professor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-9"
              aria-label="Buscar provas"
            />
          </div>
          <Button
            variant={filtersOpen || hasActiveFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltersOpen((p) => !p)}
            className="gap-1.5 text-xs"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 bg-primary-foreground text-primary rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {[filterSubject, filterType, filterTeacher, filterStatus].filter((f) => f !== "all").length}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={toggleSort} className="gap-1.5 text-xs">
            {sortOrder === "newest" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
            {sortOrder === "newest" ? "Mais recentes" : "Mais antigas"}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>
        {filtersOpen && (
          <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-border animate-fade-in">
            <Select value={filterSubject} onValueChange={(v) => { setFilterSubject(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px]" aria-label="Filtrar por disciplina">
                <SelectValue placeholder="Disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas disciplinas</SelectItem>
                {mockSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px]" aria-label="Filtrar por tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                {Object.entries(examTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTeacher} onValueChange={(v) => { setFilterTeacher(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px]" aria-label="Filtrar por professor">
                <SelectValue placeholder="Professor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos professores</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px]" aria-label="Filtrar por status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {kanbanColumns.map((col) => (
                  <SelectItem key={col.status} value={col.status}>{col.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma prova encontrada.</p>
            <p className="text-xs mt-1">Tente ajustar os filtros.</p>
          </div>
        ) : viewMode === "kanban" ? (
          isMobile ? (
            /* Mobile Kanban — Accordion/Collapsible */
            <div className="space-y-2 flex-1 overflow-y-auto pb-2">
              {kanbanColumns.map((col) => {
                const items = filtered.filter((d) => d.status === col.status);
                return (
                  <Collapsible key={col.status} defaultOpen={items.length > 0}>
                    <CollapsibleTrigger className={cn(
                      "w-full flex items-center justify-between rounded-lg border-l-4 bg-muted/30 px-4 py-2.5 text-left",
                      col.color
                    )}>
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{col.label}</h3>
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">{items.length}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2 px-1">
                      {items.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4 opacity-50">Nenhuma prova</p>
                      )}
                      {items.map((d) => (
                        <KanbanCard key={d.id} d={d} onClick={() => navigate(`/provas/editor/${d.id}`)} isCoordinator={isCoordinator} onArchive={() => setArchiveTarget(d)} onDelete={() => setDeleteTarget(d)} />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            /* Desktop Kanban Board */
            <div className="flex gap-4 overflow-x-auto flex-1 pb-2">
              {kanbanColumns.map((col) => {
                const items = filtered.filter((d) => d.status === col.status);
                return (
                  <div
                    key={col.status}
                    onDragOver={(e) => handleDragOver(e, col.status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.status)}
                    className={cn(
                      "flex-shrink-0 w-[260px] rounded-lg border-t-4 bg-muted/30 p-3 flex flex-col transition-colors",
                      col.color,
                      dragOverCol === col.status && "ring-2 ring-primary/40 bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{col.label}</h3>
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">{items.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[calc(100vh-320px)]">
                      {items.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6 opacity-50">
                          {dragOverCol === col.status ? "Solte aqui" : "Nenhuma prova"}
                        </p>
                      )}
                      {items.map((d) => (
                        <KanbanCard key={d.id} d={d} onClick={() => navigate(`/provas/editor/${d.id}`)} onDragStart={(e) => handleDragStart(e, d.id)} isCoordinator={isCoordinator} onArchive={() => setArchiveTarget(d)} onDelete={() => setDeleteTarget(d)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* List View */
          <div className="flex-1 flex flex-col">
            <div className="space-y-3 flex-1">
              {paginatedList.map((d) => (
                <ListCard key={d.id} d={d} onClick={() => navigate(`/provas/editor/${d.id}`)} isCoordinator={isCoordinator} onArchive={() => setArchiveTarget(d)} onDelete={() => setDeleteTarget(d)} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-border">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="text-xs">
                  Anterior
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="h-8 w-8 text-xs p-0"
                  >
                    {page}
                  </Button>
                ))}
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="text-xs">
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Archived section */}
      {isCoordinator && archivedDemands.length > 0 && (
        <Collapsible open={showArchived} onOpenChange={setShowArchived}>
          <CollapsibleTrigger className="flex items-center gap-2 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Archive className="h-4 w-4" />
            Arquivadas ({archivedDemands.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2 animate-fade-in">
            {archivedDemands.map((d) => (
              <div key={d.id} className="glass-card rounded-lg p-3 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-muted">
                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.subjectName} — {examTypeLabels[d.examType]}</p>
                    <p className="text-xs text-muted-foreground">{d.teacherName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => handleUnarchive(d.id)}>
                    <ArchiveRestore className="h-3.5 w-3.5" /> Restaurar
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(d)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Archive confirmation */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-muted-foreground" />
              Arquivar prova
            </AlertDialogTitle>
            <AlertDialogDescription>
              A prova de <strong>{archiveTarget?.subjectName}</strong> será movida para a seção de arquivadas. Você poderá restaurá-la depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveTarget && handleArchive(archiveTarget)}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Excluir prova
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. A prova de <strong>{deleteTarget?.subjectName}</strong> será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
