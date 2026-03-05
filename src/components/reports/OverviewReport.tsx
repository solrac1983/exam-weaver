import { useRef, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle, Zap,
  PieChart as PieChartIcon, BarChart3, Target, Calendar,
} from "lucide-react";
import { Demand } from "@/types";
import { DemandStats, CHART_COLORS, STATUS_COLORS, examTypeLabels } from "./reportUtils";
import { AnimatedStat, ReportActions, CompletionRing, EmptyReport } from "./ReportShared";

interface Props {
  stats: DemandStats;
  demands: Demand[];
}

export default function OverviewReport({ stats, demands }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  const deadlineData = useMemo(() => {
    return demands
      .filter((d) => !["approved", "final"].includes(d.status))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [demands]);

  if (stats.total === 0) return <EmptyReport message="Nenhuma avaliação encontrada para gerar relatórios." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Visão Geral</h2>
        <ReportActions title="Relatório — Visão Geral" contentRef={contentRef} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AnimatedStat label="Total de Avaliações" value={stats.total} icon={ClipboardList} trend="neutral" />
        <AnimatedStat label="Em andamento" value={stats.pending} icon={Clock} color="text-info" trend="up" subtitle="aguardando entrega" />
        <AnimatedStat label="Em revisão" value={stats.inReview} icon={AlertTriangle} color="text-warning" subtitle="revisão pendente" />
        <AnimatedStat label="Aprovadas" value={stats.approved} icon={CheckCircle2} color="text-success" trend="up" subtitle="finalizadas com sucesso" />
        <AnimatedStat label="Atrasadas" value={stats.overdue} icon={Zap} color="text-destructive" trend={stats.overdue > 0 ? "down" : "neutral"} subtitle="prazo expirado" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" /> Distribuição por Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={stats.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={50}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ stroke: "hsl(var(--muted-foreground))" }}>
                {stats.byStatus.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.key] || CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <CompletionRing percentage={stats.completionRate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Avaliações por Tipo
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byType} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {stats.byType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Avaliações por Turma
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byClassGroup} layout="vertical" barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {stats.byClassGroup.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming deadlines */}
      {deadlineData.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-warning" /> Próximos Prazos
          </h3>
          <div className="space-y-2">
            {deadlineData.map((d) => {
              const daysLeft = Math.ceil((new Date(d.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysLeft < 0;
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? "bg-destructive" : daysLeft <= 3 ? "bg-warning" : "bg-success"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.teacherName} — {d.subjectName}</p>
                    <p className="text-[11px] text-muted-foreground">{d.classGroups.join(", ")} · {examTypeLabels[d.examType] || d.examType}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${isOverdue ? "text-destructive" : daysLeft <= 3 ? "text-warning" : "text-foreground"}`}>
                      {isOverdue ? `${Math.abs(daysLeft)}d atrasado` : `${daysLeft}d restantes`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{new Date(d.deadline).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Printable hidden content */}
      <div ref={contentRef} className="hidden">
        <div className="stat-row" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div className="stat-box"><div className="label">Total</div><div className="value">{stats.total}</div></div>
          <div className="stat-box"><div className="label">Em andamento</div><div className="value">{stats.pending}</div></div>
          <div className="stat-box"><div className="label">Em revisão</div><div className="value">{stats.inReview}</div></div>
          <div className="stat-box"><div className="label">Aprovadas</div><div className="value">{stats.approved}</div></div>
          <div className="stat-box"><div className="label">Atrasadas</div><div className="value">{stats.overdue}</div></div>
          <div className="stat-box"><div className="label">Taxa de Conclusão</div><div className="value">{stats.completionRate}%</div></div>
        </div>
        <h3>Avaliações por Status</h3>
        <table><thead><tr><th>Status</th><th>Quantidade</th></tr></thead>
          <tbody>{stats.byStatus.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.value}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
