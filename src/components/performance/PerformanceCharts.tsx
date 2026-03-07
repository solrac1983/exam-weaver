import { memo, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, TrendingUp, Check } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, Cell,
} from "recharts";
import type { ClassMetrics, SubjectMetrics } from "@/lib/performanceMetrics";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--success))",
  "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(262 80% 50%)",
  "hsl(190 80% 45%)", "hsl(340 75% 55%)",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

interface Props {
  classMetrics: ClassMetrics[];
  subjectMetrics: SubjectMetrics[];
  temporalData: Record<string, any>[];
  temporalLines: string[];
}

function PerformanceCharts({ classMetrics, subjectMetrics, temporalData, temporalLines }: Props) {
  const [selectedCompareClasses, setSelectedCompareClasses] = useState<string[]>([]);

  const radarData = useMemo(() =>
    subjectMetrics.slice(0, 8).map(s => ({
      subject: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
      average: s.average,
      fullMark: 100,
    })),
    [subjectMetrics]
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Média por Turma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={classMetrics} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, "Média"]} />
                <Bar dataKey="average" radius={[6, 6, 0, 0]}>
                  {classMetrics.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Desempenho por Disciplina
            </CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length > 2 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar dataKey="average" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Necessário 3+ disciplinas para o gráfico radar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evolution Chart */}
      {temporalData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" /> Evolução Comparativa por Bimestre
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Selecione turmas para comparar</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                onClick={() => setSelectedCompareClasses([])}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  selectedCompareClasses.length === 0
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                Todas
              </button>
              {temporalLines.filter(k => k !== "Geral").map((cn) => {
                const isSelected = selectedCompareClasses.includes(cn);
                return (
                  <button
                    key={cn}
                    onClick={() => {
                      setSelectedCompareClasses(prev =>
                        isSelected ? prev.filter(c => c !== cn) : [...prev, cn]
                      );
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    {cn}
                  </button>
                );
              })}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temporalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="bimester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {temporalLines
                  .filter(key => key === "Geral" || selectedCompareClasses.length === 0 || selectedCompareClasses.includes(key))
                  .map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={key === "Geral" ? "hsl(var(--primary))" : COLORS[temporalLines.indexOf(key) % COLORS.length]}
                      strokeWidth={key === "Geral" ? 3 : 2}
                      dot={{ r: key === "Geral" ? 5 : 4 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default memo(PerformanceCharts);
