import { mockDemands } from "@/data/mockData";
import { DemandCard } from "@/components/DemandCard";
import { StatCard } from "@/components/StatCard";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const totalDemands = mockDemands.length;
  const pending = mockDemands.filter((d) => ["pending", "in_progress"].includes(d.status)).length;
  const submitted = mockDemands.filter((d) => ["submitted", "review"].includes(d.status)).length;
  const approved = mockDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
  const overdue = mockDemands.filter(
    (d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status)
  ).length;

  const recentDemands = [...mockDemands]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Painel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão geral das demandas e provas
          </p>
        </div>
        <Button onClick={() => navigate("/demandas/nova")} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Demanda
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de Demandas" value={totalDemands} icon={ClipboardList} />
        <StatCard label="Em andamento" value={pending} icon={Clock} variant="info" />
        <StatCard label="Aguardando revisão" value={submitted} icon={AlertTriangle} variant="warning" />
        <StatCard
          label="Aprovadas"
          value={approved}
          icon={CheckCircle2}
          variant="success"
          trend={`${overdue} atrasada(s)`}
        />
      </div>

      {/* Recent demands */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground font-display">Demandas recentes</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/demandas")} className="text-muted-foreground">
            Ver todas
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recentDemands.map((demand) => (
            <DemandCard key={demand.id} demand={demand} onClick={() => navigate(`/demandas/${demand.id}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}
