import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, AlertTriangle, CalendarCheck, TrendingUp, TrendingDown, Award, BookOpen } from "lucide-react";

interface Props {
  globalAverage: number;
  totalStudents: number;
  riskStudents: number;
  averageFrequency: number;
  evolutionAvg: number;
  classCount: number;
  approvalRate?: number;
  bestSubject?: string;
  worstSubject?: string;
}

function KPICard({ label, value, subtitle, icon: Icon, iconClass, valueClass, trend }: {
  label: string; value: number | string; subtitle?: string;
  icon: React.ElementType; iconClass: string; valueClass?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
            <p className={`text-2xl md:text-3xl font-bold mt-1 ${valueClass || "text-foreground"}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-0.5 mt-1 text-[10px] font-medium ${trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {trend.value > 0 ? <TrendingUp className="h-3 w-3" /> : trend.value < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                {trend.label}
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-xl shrink-0 ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceKPIs({ globalAverage, totalStudents, riskStudents, averageFrequency, evolutionAvg, classCount, approvalRate, bestSubject, worstSubject }: Props) {
  const avgColor = globalAverage >= 70 ? "text-success" : globalAverage >= 50 ? "text-warning" : "text-destructive";
  const freqColor = averageFrequency >= 80 ? "text-success" : averageFrequency >= 70 ? "text-warning" : "text-destructive";
  const evoColor = evolutionAvg > 0 ? "text-success" : evolutionAvg < 0 ? "text-destructive" : "text-muted-foreground";
  const riskPct = totalStudents > 0 ? Math.round((riskStudents / totalStudents) * 100) : 0;
  const approvalVal = approvalRate ?? (totalStudents > 0 ? Math.round(((totalStudents - riskStudents) / totalStudents) * 100) : 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KPICard
        label="Total de Alunos"
        value={totalStudents}
        subtitle={`${classCount} turma(s)`}
        icon={Users}
        iconClass="bg-primary/10 text-primary"
      />
      <KPICard
        label="Média Geral"
        value={`${globalAverage}%`}
        icon={Target}
        iconClass="bg-info/10 text-info"
        valueClass={avgColor}
        trend={evolutionAvg !== 0 ? { value: evolutionAvg, label: `${evolutionAvg > 0 ? "+" : ""}${evolutionAvg}% vs 1º bim` } : undefined}
      />
      <KPICard
        label="Taxa de Aprovação"
        value={`${approvalVal}%`}
        subtitle="média ≥ 50%"
        icon={Award}
        iconClass="bg-success/10 text-success"
        valueClass={approvalVal >= 80 ? "text-success" : approvalVal >= 60 ? "text-warning" : "text-destructive"}
      />
      <KPICard
        label="Em Risco"
        value={riskStudents}
        subtitle={`${riskPct}% da turma`}
        icon={AlertTriangle}
        iconClass="bg-destructive/10 text-destructive"
        valueClass="text-destructive"
      />
      <KPICard
        label="Frequência Média"
        value={averageFrequency > 0 ? `${averageFrequency}%` : "—"}
        subtitle={averageFrequency < 75 ? "⚠️ Abaixo do mínimo" : averageFrequency >= 90 ? "✅ Excelente" : "Dentro do aceitável"}
        icon={CalendarCheck}
        iconClass="bg-success/10 text-success"
        valueClass={freqColor}
      />
      <KPICard
        label="Evolução"
        value={evolutionAvg > 0 ? `+${evolutionAvg}%` : `${evolutionAvg}%`}
        subtitle="1º → último bim."
        icon={TrendingUp}
        iconClass="bg-accent/10 text-accent"
        valueClass={evoColor}
      />
    </div>
  );
}

export default memo(PerformanceKPIs);
