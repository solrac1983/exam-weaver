import { useRef, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Target } from "lucide-react";
import { Demand } from "@/types";
import { DemandStats, CHART_COLORS } from "./reportUtils";
import { ReportActions, EmptyReport } from "./ReportShared";

interface Props {
  stats: DemandStats;
  demands: Demand[];
}

export default function SubjectsReport({ stats, demands }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  const subjectDetails = useMemo(() => {
    return stats.bySubject.map((s) => {
      const subDemands = demands.filter((d) => d.subjectName === s.name);
      const approved = subDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
      const pending = subDemands.filter((d) => ["pending", "in_progress"].includes(d.status)).length;
      const inReview = subDemands.filter((d) => ["submitted", "review", "revision_requested"].includes(d.status)).length;
      const overdue = subDemands.filter((d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status)).length;
      const completionRate = s.value > 0 ? Math.round((approved / s.value) * 100) : 0;
      const teachers = [...new Set(subDemands.map((d) => d.teacherName))];
      const classGroups = [...new Set(subDemands.flatMap((d) => d.classGroups))];
      return { ...s, approved, pending, inReview, overdue, completionRate, teachers, classGroups };
    });
  }, [stats.bySubject, demands]);

  if (stats.bySubject.length === 0) return <EmptyReport message="Nenhuma disciplina com avaliações encontrada." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Relatório por Disciplina</h2>
        <ReportActions title="Relatório por Disciplina" contentRef={contentRef} />
      </div>

      {/* Subject summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjectDetails.map((s, i) => (
          <div key={s.name} className="rounded-xl border border-border/60 bg-card p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <h4 className="text-sm font-semibold text-foreground">{s.name}</h4>
              <span className="ml-auto text-lg font-bold text-foreground">{s.value}</span>
            </div>
            <Progress value={s.completionRate} className="h-1.5 mb-3" />
            <div className="flex justify-between text-[11px] text-muted-foreground mb-2">
              <span>{s.completionRate}% concluído</span>
              <span>{s.approved} aprovada(s)</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {s.classGroups.map((cg) => (
                <span key={cg} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">{cg}</span>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Prof: {s.teachers.join(", ")}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Volume por Disciplina
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.bySubject} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-15} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {stats.bySubject.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Taxa de Conclusão por Disciplina
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={subjectDetails} layout="vertical" barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit="%" />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="completionRate" name="Conclusão" radius={[0, 6, 6, 0]}>
                {subjectDetails.map((s, i) => (
                  <Cell key={i} fill={s.completionRate >= 80 ? "hsl(var(--success))" : s.completionRate >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Disciplina</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Total</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Aprovadas</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Em revisão</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Pendentes</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Atrasadas</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {subjectDetails.map((s) => (
                <tr key={s.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{s.value}</td>
                  <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-medium">{s.approved}</span></td>
                  <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[11px] font-medium">{s.inReview}</span></td>
                  <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-info/10 text-info text-[11px] font-medium">{s.pending}</span></td>
                  <td className="px-3 py-3 text-center">
                    {s.overdue > 0
                      ? <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium">{s.overdue}</span>
                      : <span className="text-muted-foreground text-xs">0</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <Progress value={s.completionRate} className="h-1.5 w-12" />
                      <span className="text-xs font-semibold text-foreground">{s.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div ref={contentRef} className="hidden">
        <h3>Avaliações por Disciplina</h3>
        <table>
          <thead><tr><th>Disciplina</th><th>Total</th><th>Aprovadas</th><th>Em revisão</th><th>Pendentes</th><th>Atrasadas</th><th>Conclusão</th></tr></thead>
          <tbody>
            {subjectDetails.map((s) => (
              <tr key={s.name}><td>{s.name}</td><td>{s.value}</td><td>{s.approved}</td><td>{s.inReview}</td><td>{s.pending}</td><td>{s.overdue}</td><td>{s.completionRate}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
