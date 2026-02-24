import { mockDemands, examTypeLabels } from "@/data/mockData";
import { DemandCard } from "@/components/DemandCard";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DemandStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusFilters: { label: string; value: DemandStatus | "all" }[] = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Em andamento", value: "in_progress" },
  { label: "Enviadas", value: "submitted" },
  { label: "Ajustes", value: "revision_requested" },
  { label: "Aprovadas", value: "approved" },
  { label: "Finalizadas", value: "final" },
];

export default function DemandsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DemandStatus | "all">("all");
  const navigate = useNavigate();

  const filtered = mockDemands.filter((d) => {
    const matchesSearch =
      d.teacherName.toLowerCase().includes(search.toLowerCase()) ||
      d.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      d.classGroups.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === "all" || d.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Demandas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie todas as demandas de provas
          </p>
        </div>
        <Button onClick={() => navigate("/demandas/nova")} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Demanda
        </Button>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por professor, disciplina ou turma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setFilter(sf.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === sf.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((demand) => (
          <DemandCard key={demand.id} demand={demand} onClick={() => navigate(`/demandas/${demand.id}`)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma demanda encontrada.</p>
        </div>
      )}
    </div>
  );
}
