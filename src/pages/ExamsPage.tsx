import { useState, useMemo } from "react";
import { mockDemands, examTypeLabels, mockSubjects, mockBimesters, statusLabels } from "@/data/mockData";
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
import { FileText, Pencil, Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DemandStatus } from "@/types";

const kanbanColumns: { status: DemandStatus; label: string; color: string }[] = [
  { status: "pending", label: "Pendente", color: "border-muted-foreground/30" },
  { status: "in_progress", label: "Em andamento", color: "border-primary/40" },
  { status: "submitted", label: "Enviada", color: "border-sky-500/40" },
  { status: "review", label: "Em revisão", color: "border-amber-500/40" },
  { status: "revision_requested", label: "Ajustes", color: "border-destructive/40" },
  { status: "approved", label: "Aprovada", color: "border-emerald-500/40" },
  { status: "final", label: "Finalizada", color: "border-emerald-600/40" },
];

export default function ExamsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterBimester, setFilterBimester] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const allExamDemands = mockDemands.filter((d) =>
    ["submitted", "review", "revision_requested", "approved", "final", "in_progress", "pending"].includes(d.status)
  );

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    allExamDemands.forEach((d) => map.set(d.teacherId, d.teacherName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, []);

  const filtered = useMemo(() => {
    let result = allExamDemands;

    if (filterSubject !== "all") result = result.filter((d) => d.subjectId === filterSubject);
    if (filterBimester !== "all") result = result.filter((d) => d.examType === filterBimester);
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
  }, [search, filterSubject, filterBimester, filterTeacher, sortOrder]);

  const hasActiveFilters =
    filterSubject !== "all" || filterBimester !== "all" || filterTeacher !== "all" || search !== "";

  const clearFilters = () => {
    setFilterSubject("all");
    setFilterBimester("all");
    setFilterTeacher("all");
    setSearch("");
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Provas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie e edite provas — {filtered.length} prova(s) encontrada(s)
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, disciplina, professor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterSubject} onValueChange={setFilterSubject}>
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
          <Select value={filterBimester} onValueChange={setFilterBimester}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {Object.entries(examTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTeacher} onValueChange={setFilterTeacher}>
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

          {/* Sort toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSort}
            className="gap-1.5 text-xs"
          >
            {sortOrder === "newest" ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )}
            {sortOrder === "newest" ? "Mais recentes" : "Mais antigas"}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((col) => {
          const items = filtered.filter((d) => d.status === col.status);
          return (
            <div
              key={col.status}
              className={cn(
                "flex-shrink-0 w-[260px] rounded-lg border-t-4 bg-muted/30 p-3 space-y-3",
                col.color
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  {col.label}
                </h3>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {items.length}
                </span>
              </div>

              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 opacity-50">
                  Nenhuma prova
                </p>
              )}

              {items.map((d) => (
                <div
                  key={d.id}
                  className="glass-card rounded-lg p-3 space-y-2 animate-fade-in cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all"
                  onClick={() => navigate(`/provas/editor/${d.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {d.subjectName}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        {examTypeLabels[d.examType]}
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>{d.teacherName}</p>
                    <p>{d.classGroups.join(", ")}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1">
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma prova encontrada.</p>
          <p className="text-xs mt-1">Tente ajustar os filtros.</p>
        </div>
      )}
    </div>
  );
}
