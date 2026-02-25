import { useState, useMemo } from "react";
import { mockDemands, examTypeLabels, mockSubjects } from "@/data/mockData";
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
  CheckCircle2,
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DemandStatus } from "@/types";
import { toast } from "sonner";
import { FolderManager, ExamFolder } from "@/components/approvals/FolderManager";

const approvalColumns: { status: DemandStatus; label: string; color: string }[] = [
  { status: "approved", label: "Aprovada", color: "border-emerald-500/40" },
  { status: "final", label: "Finalizada", color: "border-emerald-600/40" },
];

const ITEMS_PER_PAGE = 10;

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [currentPage, setCurrentPage] = useState(1);
  const [folders, setFolders] = useState<ExamFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const approvedDemands = mockDemands.filter((d) =>
    ["approved", "final"].includes(d.status)
  );

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    approvedDemands.forEach((d) => map.set(d.teacherId, d.teacherName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, []);

  const filtered = useMemo(() => {
    let result = approvedDemands;

    // Filter by active folder
    if (activeFolderId) {
      const folder = folders.find((f) => f.id === activeFolderId);
      if (folder) result = result.filter((d) => folder.examIds.includes(d.id));
    }

    if (filterSubject !== "all") result = result.filter((d) => d.subjectId === filterSubject);
    if (filterTeacher !== "all") result = result.filter((d) => d.teacherId === filterTeacher);

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
  }, [search, filterSubject, filterTeacher, sortOrder, activeFolderId, folders]);

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
    const demand = mockDemands.find((d) => d.id === demandId);
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

  const handlePrint = (demandId: string) => {
    toast.info("Abrindo impressão...");
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(buildPrintHTML(demandId));
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleGeneratePDF = (demandId: string) => {
    const demand = mockDemands.find((d) => d.id === demandId);
    // Open in new tab as printable HTML (user can "Save as PDF" from print dialog)
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      pdfWindow.document.write(buildPrintHTML(demandId));
      pdfWindow.document.close();
    }
    toast.success(`PDF pronto: ${demand?.subjectName} — ${examTypeLabels[demand?.examType || "bimestral"]}. Use "Salvar como PDF" no diálogo de impressão.`);
  };

  return (
    <div className="flex flex-col animate-fade-in h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            Aprovações
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Provas aprovadas prontas para impressão — {filtered.length} prova(s)
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
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

      {/* Search + Filters */}
      <div className="glass-card rounded-lg p-4 mb-4">
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
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterSubject} onValueChange={(v) => { setFilterSubject(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas disciplinas</SelectItem>
              {mockSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTeacher} onValueChange={(v) => { setFilterTeacher(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Professor" />
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
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>
      </div>
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
          <div className="flex gap-4 overflow-x-auto flex-1 pb-2">
            {approvalColumns.map((col) => {
              const items = filtered.filter((d) => d.status === col.status);
              return (
                <div
                  key={col.status}
                  className={cn(
                    "flex-shrink-0 w-[320px] rounded-lg border-t-4 bg-muted/30 p-3 flex flex-col",
                    col.color
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      {col.label}
                    </h3>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6 opacity-50">
                        Nenhuma prova
                      </p>
                    )}
                    {items.map((d) => (
                      <ApprovalCard
                        key={d.id}
                        demand={d}
                        onPrint={handlePrint}
                        onPDF={handleGeneratePDF}
                        onView={() => navigate(`/provas/editor/${d.id}`)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="space-y-3 flex-1">
              {paginatedList.map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", d.id); e.dataTransfer.effectAllowed = "move"; }}
                  className="glass-card rounded-lg p-4 flex items-center justify-between animate-fade-in cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {d.subjectName} — {examTypeLabels[d.examType]}
                        </h3>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.teacherName} • {d.classGroups.join(", ")} • {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => navigate(`/provas/editor/${d.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handlePrint(d.id)}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handleGeneratePDF(d.id)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Gerar PDF
                    </Button>
                  </div>
                </div>
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
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma prova aprovada encontrada.</p>
          <p className="text-xs mt-1">Tente ajustar os filtros.</p>
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  demand,
  onPrint,
  onPDF,
  onView,
}: {
  demand: (typeof mockDemands)[0];
  onPrint: (id: string) => void;
  onPDF: (id: string) => void;
  onView: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", demand.id); e.dataTransfer.effectAllowed = "move"; }}
      className="glass-card rounded-lg p-3 space-y-2 animate-fade-in cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-emerald-500/10">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-foreground truncate">
            {demand.subjectName}
          </h4>
          <p className="text-[10px] text-muted-foreground">
            {examTypeLabels[demand.examType]}
          </p>
        </div>
        <StatusBadge status={demand.status} />
      </div>
      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p>{demand.teacherName}</p>
        <p>{demand.classGroups.join(", ")}</p>
        <p>{new Date(demand.createdAt).toLocaleDateString("pt-BR")}</p>
      </div>
      <div className="flex items-center gap-1.5 pt-1 border-t border-border">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1 flex-1" onClick={onView}>
          <Eye className="h-3 w-3" />
          Ver
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1 flex-1" onClick={() => onPrint(demand.id)}>
          <Printer className="h-3 w-3" />
          Imprimir
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1 flex-1" onClick={() => onPDF(demand.id)}>
          <Download className="h-3 w-3" />
          PDF
        </Button>
      </div>
    </div>
  );
}
