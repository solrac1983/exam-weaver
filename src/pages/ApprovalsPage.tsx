import { useState, useMemo, useEffect } from "react";
import { examTypeLabels, mockSubjects } from "@/data/mockData";
import { Demand } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyDemands } from "@/hooks/useCompanyDemands";
import { getExamContent } from "@/data/examContentStore";
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
  Archive,
  FileText,
  Search,
  Filter,
  X,
  ArrowDown,
  ArrowUp,
  LayoutGrid,
  List,
  Printer,
  Download,
  Eye,
  ClipboardList,
  Calendar,
  User,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DemandStatus } from "@/types";
import { toast } from "sonner";
import { FolderManager, ExamFolder } from "@/components/approvals/FolderManager";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Unified item type for both demands and simulados
interface ApprovalItem {
  id: string;
  title: string;
  subtitle: string;
  teacherName: string;
  classGroups: string;
  status: DemandStatus;
  createdAt: string;
  type: "demand" | "simulado";
  demandRef?: Demand;
}

const approvalColumns: { status: DemandStatus; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
  { status: "approved", label: "Aprovadas", icon: Archive, color: "text-emerald-600", bgColor: "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" },
  { status: "final", label: "Finalizadas", icon: FolderOpen, color: "text-primary", bgColor: "border-primary/50 bg-primary/5 dark:bg-primary/10" },
];

const ITEMS_PER_PAGE = 10;

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const { profile, role, user } = useAuth();
  const { companyDemands } = useCompanyDemands();
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [currentPage, setCurrentPage] = useState(1);
  const [folders, setFolders] = useState<ExamFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [approvedSimulados, setApprovedSimulados] = useState<ApprovalItem[]>([]);

  // Fetch simulados where ALL subjects are approved
  useEffect(() => {
    if (!user) return;

    const fetchApprovedSimulados = async () => {
      const { data: sims } = await supabase
        .from("simulados")
        .select("*, simulado_subjects(*)")
        .order("created_at", { ascending: false });

      if (!sims) return;

      const items: ApprovalItem[] = sims
        .filter((sim: any) => {
          const subjects = sim.simulado_subjects || [];
          const allApproved = subjects.length > 0 && subjects.every((s: any) => s.status === "approved");
          return allApproved || sim.status === "complete";
        })
        .map((sim: any) => ({
          id: `sim-${sim.id}`,
          title: sim.title,
          subtitle: `Simulado · ${(sim.simulado_subjects || []).length} disciplina(s)`,
          teacherName: "Multidisciplinar",
          classGroups: (sim.class_groups || []).join(", "),
          status: (sim.status === "complete" ? "final" : "approved") as DemandStatus,
          createdAt: sim.created_at,
          type: "simulado" as const,
        }));

      setApprovedSimulados(items);
    };

    fetchApprovedSimulados();

    const channel = supabase
      .channel("simulados-approvals-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "simulados" }, fetchApprovedSimulados)
      .on("postgres_changes", { event: "*", schema: "public", table: "simulado_subjects" }, fetchApprovedSimulados)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Convert demands to unified items
  const demandItems = useMemo<ApprovalItem[]>(() => {
    return companyDemands
      .filter((d) => ["approved", "final"].includes(d.status))
      .map((d) => ({
        id: d.id,
        title: `${d.subjectName} — ${examTypeLabels[d.examType]}`,
        subtitle: examTypeLabels[d.examType],
        teacherName: d.teacherName,
        classGroups: d.classGroups.join(", "),
        status: d.status,
        createdAt: d.createdAt,
        type: "demand" as const,
        demandRef: d,
      }));
  }, [companyDemands]);

  // Merge both sources
  const allItems = useMemo(() => {
    return [...demandItems, ...approvedSimulados];
  }, [demandItems, approvedSimulados]);

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    allItems.forEach((d) => map.set(d.teacherName, d.teacherName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [allItems]);

  const examsInFolders = useMemo(() => {
    const set = new Set<string>();
    folders.forEach((f) => f.examIds.forEach((id) => set.add(id)));
    return set;
  }, [folders]);

  const filtered = useMemo(() => {
    let result = allItems;

    if (activeFolderId) {
      const folder = folders.find((f) => f.id === activeFolderId);
      if (folder) result = result.filter((d) => folder.examIds.includes(d.id));
    } else {
      result = result.filter((d) => !examsInFolders.has(d.id));
    }

    if (filterSubject !== "all") result = result.filter((d) => d.title.toLowerCase().includes(filterSubject.toLowerCase()));
    if (filterTeacher !== "all") result = result.filter((d) => d.teacherName === filterTeacher);

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(s) ||
          d.teacherName.toLowerCase().includes(s) ||
          d.classGroups.toLowerCase().includes(s)
      );
    }

    result.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });

    return result;
  }, [search, filterSubject, filterTeacher, sortOrder, activeFolderId, folders, examsInFolders, allItems]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedList = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const hasActiveFilters = filterSubject !== "all" || filterTeacher !== "all" || search !== "";

  const clearFilters = () => {
    setFilterSubject("all");
    setFilterTeacher("all");
    setSearch("");
    setCurrentPage(1);
  };

  const buildPrintHTML = (demandId: string) => {
    const demand = companyDemands.find((d) => d.id === demandId);
    const examHTML = getExamContent(demandId);
    return `
      <html>
        <head>
          <title>Prova - ${demand?.subjectName || "Impressão"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1, h2, h3 { margin-top: 1em; }
            hr { margin: 16px 0; border: none; border-top: 1px solid #ccc; }
            ul, ol { padding-left: 24px; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #ccc; padding: 6px 10px; }
            img { max-width: 100%; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>${examHTML}</body>
      </html>
    `;
  };

  const handlePrint = (id: string) => {
    toast.info("Abrindo impressão...");
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(buildPrintHTML(id));
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleGeneratePDF = (id: string) => {
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      pdfWindow.document.write(buildPrintHTML(id));
      pdfWindow.document.close();
    }
    toast.success("PDF pronto. Use 'Salvar como PDF' no diálogo de impressão.");
  };

  const handleView = (item: ApprovalItem) => {
    if (item.type === "simulado") {
      navigate(`/simulados`);
    } else {
      navigate(`/provas/editor/${item.id}`);
    }
  };

  // Stats
  const approvedCount = filtered.filter((d) => d.status === "approved").length;
  const finalCount = filtered.filter((d) => d.status === "final").length;

  return (
    <div className="flex flex-col animate-fade-in h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Archive className="h-5 w-5 text-primary" />
            </div>
            Arquivadas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Provas e simulados aprovados ou finalizados
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Stats pills */}
          <div className="hidden md:flex items-center gap-2 mr-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm">
              <span className="font-bold text-foreground">{filtered.length}</span>
              <span className="text-muted-foreground">Total</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-sm">
              <span className="font-bold text-emerald-600">{approvedCount}</span>
              <span className="text-emerald-600/70">Aprovadas</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-sm">
              <span className="font-bold text-primary">{finalCount}</span>
              <span className="text-primary/70">Finalizadas</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setViewMode("kanban"); setCurrentPage(1); }}
              className="gap-1.5 h-8 text-xs"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setViewMode("list"); setCurrentPage(1); }}
              className="gap-1.5 h-8 text-xs"
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </Button>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <Card className="mb-4 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por disciplina, professor, turma..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={filterSubject} onValueChange={(v) => { setFilterSubject(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[170px]">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Disciplina" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas disciplinas</SelectItem>
                {mockSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTeacher} onValueChange={(v) => { setFilterTeacher(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[170px]">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Professor" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos professores</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => setSortOrder(p => p === "newest" ? "oldest" : "newest")} className="gap-1.5 text-xs">
              {sortOrder === "newest" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
              {sortOrder === "newest" ? "Mais recentes" : "Mais antigas"}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1 text-destructive hover:text-destructive">
                <X className="h-3 w-3" /> Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Folders */}
      <FolderManager
        folders={folders}
        setFolders={setFolders}
        activeFolderId={activeFolderId}
        setActiveFolderId={setActiveFolderId}
      />

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {viewMode === "kanban" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {approvalColumns.map((col) => {
              const items = filtered.filter((d) => d.status === col.status);
              const ColIcon = col.icon;
              return (
                <div
                  key={col.status}
                  className={cn(
                    "rounded-xl border-2 p-4 flex flex-col min-h-[300px] transition-colors",
                    col.bgColor
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ColIcon className={cn("h-4 w-4", col.color)} />
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                        {col.label}
                      </h3>
                    </div>
                    <Badge variant="secondary" className="text-xs font-bold">
                      {items.length}
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {items.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 opacity-40">
                        <ColIcon className="h-8 w-8 mb-2" />
                        <p className="text-xs text-muted-foreground">Nenhuma prova</p>
                      </div>
                    )}
                    {items.map((item) => (
                      <ApprovalCard
                        key={item.id}
                        item={item}
                        onPrint={() => item.type === "demand" ? handlePrint(item.id) : toast.info("Impressão de simulado disponível na página de Simulados.")}
                        onPDF={() => item.type === "demand" ? handleGeneratePDF(item.id) : toast.info("PDF de simulado disponível na página de Simulados.")}
                        onView={() => handleView(item)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="space-y-2 flex-1">
              {paginatedList.map((item) => (
                <Card
                  key={item.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", item.id); e.dataTransfer.effectAllowed = "move"; }}
                  className="shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing animate-fade-in"
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2.5 rounded-xl", item.type === "simulado" ? "bg-primary/10" : "bg-emerald-500/10")}>
                        {item.type === "simulado" ? (
                          <ClipboardList className="h-4 w-4 text-primary" />
                        ) : (
                          <Archive className="h-4 w-4 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                          {item.type === "simulado" && (
                            <Badge variant="outline" className="text-[10px]">Simulado</Badge>
                          )}
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.teacherName}
                          </span>
                          <span>•</span>
                          <span>{item.classGroups}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleView(item)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Visualizar</TooltipContent>
                      </Tooltip>
                      {item.type === "demand" && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePrint(item.id)}>
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Imprimir</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" className="h-8 w-8" onClick={() => handleGeneratePDF(item.id)}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Gerar PDF</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
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

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Archive className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="font-semibold text-foreground">Nenhuma prova arquivada encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">Quando provas forem aprovadas ou finalizadas, elas aparecerão aqui.</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 gap-1.5">
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  item,
  onPrint,
  onPDF,
  onView,
}: {
  item: ApprovalItem;
  onPrint: () => void;
  onPDF: () => void;
  onView: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", item.id); e.dataTransfer.effectAllowed = "move"; }}
      className="shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing group"
    >
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <div className={cn("p-2 rounded-lg mt-0.5", item.type === "simulado" ? "bg-primary/10" : "bg-emerald-500/10")}>
            {item.type === "simulado" ? (
              <ClipboardList className="h-4 w-4 text-primary" />
            ) : (
              <Archive className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm font-semibold text-foreground truncate">{item.title}</h4>
              {item.type === "simulado" && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">Simulado</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{item.subtitle}</p>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pl-10">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {item.teacherName}
          </span>
          <span>{item.classGroups}</span>
          <span className="flex items-center gap-1 ml-auto">
            <Calendar className="h-3 w-3" />
            {new Date(item.createdAt).toLocaleDateString("pt-BR")}
          </span>
        </div>

        <div className="flex items-center gap-1 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5 flex-1 hover:bg-primary/5" onClick={onView}>
            <Eye className="h-3 w-3" />
            Ver
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5 flex-1 hover:bg-primary/5" onClick={onPrint}>
            <Printer className="h-3 w-3" />
            Imprimir
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5 flex-1 hover:bg-primary/5" onClick={onPDF}>
            <Download className="h-3 w-3" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
