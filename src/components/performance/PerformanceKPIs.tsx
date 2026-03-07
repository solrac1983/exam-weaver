import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, AlertTriangle, CalendarCheck, TrendingUp, ClipboardList } from "lucide-react";

interface Props {
  globalAverage: number;
  totalStudents: number;
  riskStudents: number;
  averageFrequency: number;
  evolutionAvg: number;
  classCount: number;
}

function KPICard({ label, value, subtitle, icon: Icon, iconClass, valueClass }: {
  label: string; value: number | string; subtitle?: string;
  icon: React.ElementType; iconClass: string; valueClass?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
            <p className={`text-2xl md:text-3xl font-bold mt-1 ${valueClass || "text-foreground"}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl shrink-0 ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceKPIs({ globalAverage, totalStudents, riskStudents, averageFrequency, evolutionAvg, classCount }: Props) {
  const avgColor = globalAverage >= 70 ? "text-success" : globalAverage >= 50 ? "text-warning" : "text-destructive";
  const freqColor = averageFrequency >= 80 ? "text-success" : averageFrequency >= 70 ? "text-warning" : "text-destructive";
  const evoColor = evolutionAvg > 0 ? "text-success" : evolutionAvg < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KPICard label="Total de Alunos" value={totalStudents} subtitle={`${classCount} turma(s)`} icon={Users} iconClass="bg-primary/10 text-primary" />
      <KPICard label="Média Geral" value={`${globalAverage}%`} icon={Target} iconClass="bg-info/10 text-info" valueClass={avgColor} />
      <KPICard label="Em Risco" value={riskStudents} subtitle="média < 50%" icon={AlertTriangle} iconClass="bg-destructive/10 text-destructive" valueClass="text-destructive" />
      <KPICard label="Frequência Média" value={averageFrequency > 0 ? `${averageFrequency}%` : "—"} icon={CalendarCheck} iconClass="bg-success/10 text-success" valueClass={freqColor} />
      <KPICard label="Atividades" value={`${classCount}`} subtitle="turmas avaliadas" icon={ClipboardList} iconClass="bg-warning/10 text-warning" />
      <KPICard label="Evolução" value={evolutionAvg > 0 ? `+${evolutionAvg}%` : `${evolutionAvg}%`} subtitle="1º → último bim." icon={TrendingUp} iconClass="bg-accent/10 text-accent" valueClass={evoColor} />
    </div>
  );
}

export default memo(PerformanceKPIs);
