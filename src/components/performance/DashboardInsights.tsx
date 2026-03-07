import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Lightbulb, TrendingUp, TrendingDown, Users, ShieldAlert } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { StudentMetrics } from "@/lib/performanceMetrics";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const STATUS_COLORS: Record<string, string> = {
  satisfatorio: "hsl(var(--success))",
  atencao: "hsl(var(--warning))",
  risco: "hsl(var(--destructive))",
  evolucao: "hsl(var(--info))",
};

const STATUS_LABELS: Record<string, string> = {
  satisfatorio: "Satisfatório",
  atencao: "Atenção",
  risco: "Risco",
  evolucao: "Em Evolução",
};

interface Props {
  students: StudentMetrics[];
  globalAverage: number;
  averageFrequency: number;
}

function DashboardInsights({ students, globalAverage, averageFrequency }: Props) {
  // Status distribution
  const statusDist = useMemo(() => {
    const counts: Record<string, number> = { satisfatorio: 0, atencao: 0, risco: 0, evolucao: 0 };
    for (const s of students) counts[s.status]++;
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: STATUS_LABELS[k], value: v, key: k }));
  }, [students]);

  // Grade distribution histogram
  const gradeDistribution = useMemo(() => {
    const ranges = [
      { range: "0-20%", min: 0, max: 20, count: 0 },
      { range: "21-40%", min: 21, max: 40, count: 0 },
      { range: "41-60%", min: 41, max: 60, count: 0 },
      { range: "61-80%", min: 61, max: 80, count: 0 },
      { range: "81-100%", min: 81, max: 100, count: 0 },
    ];
    for (const s of students) {
      const r = ranges.find(r => s.average >= r.min && s.average <= r.max);
      if (r) r.count++;
    }
    return ranges;
  }, [students]);

  // Quick insights
  const insights = useMemo(() => {
    const list: { icon: React.ElementType; text: string; type: "warning" | "success" | "info" | "danger" }[] = [];

    const riskCount = students.filter(s => s.status === "risco").length;
    const lowFreqCount = students.filter(s => s.frequency < 75 && s.totalAttendance > 0).length;
    const improvingCount = students.filter(s => s.evolution > 5).length;
    const decliningCount = students.filter(s => s.evolution < -5).length;
    const excellentCount = students.filter(s => s.average >= 85).length;

    if (riskCount > 0) {
      list.push({
        icon: ShieldAlert,
        text: `${riskCount} aluno(s) em situação de risco acadêmico (média < 50%)`,
        type: "danger",
      });
    }
    if (lowFreqCount > 0) {
      list.push({
        icon: AlertTriangle,
        text: `${lowFreqCount} aluno(s) com frequência abaixo de 75% — risco de reprovação por faltas`,
        type: "warning",
      });
    }
    if (decliningCount > 0) {
      list.push({
        icon: TrendingDown,
        text: `${decliningCount} aluno(s) em queda de desempenho (variação > -5%)`,
        type: "warning",
      });
    }
    if (improvingCount > 0) {
      list.push({
        icon: TrendingUp,
        text: `${improvingCount} aluno(s) demonstrando evolução positiva (+5% ou mais)`,
        type: "success",
      });
    }
    if (excellentCount > 0) {
      list.push({
        icon: Lightbulb,
        text: `${excellentCount} aluno(s) com desempenho excelente (média ≥ 85%)`,
        type: "info",
      });
    }
    if (globalAverage < 60) {
      list.push({
        icon: AlertTriangle,
        text: `Média geral da escola (${globalAverage}%) está abaixo do esperado — considerar intervenções pedagógicas`,
        type: "danger",
      });
    }

    return list;
  }, [students, globalAverage]);

  const typeColors = {
    danger: "border-destructive/30 bg-destructive/5 text-destructive",
    warning: "border-warning/30 bg-warning/5 text-warning",
    success: "border-success/30 bg-success/5 text-success",
    info: "border-info/30 bg-info/5 text-info",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Distribuição por Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusDist.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDist.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, "Alunos"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 shrink-0">
                {statusDist.map(d => (
                  <div key={d.key} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.key] }} />
                    <span className="text-[11px] text-muted-foreground">{d.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                      {d.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
              Sem dados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Distribution Histogram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-info" /> Distribuição de Médias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={gradeDistribution} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, "Alunos"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {gradeDistribution.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.min >= 81 ? "hsl(var(--success))" :
                      entry.min >= 61 ? "hsl(var(--info))" :
                      entry.min >= 41 ? "hsl(var(--warning))" :
                      "hsl(var(--destructive))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" /> Alertas e Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-md border text-xs ${typeColors[ins.type]}`}>
                  <ins.icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{ins.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
              Nenhum alerta no momento
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(DashboardInsights);
