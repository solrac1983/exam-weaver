import { useRef, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, AreaChart, Area, Line,
} from "recharts";
import { TrendingUp, Calendar, Activity } from "lucide-react";
import { Demand } from "@/types";
import { statusLabels, STATUS_COLORS, CHART_COLORS } from "./reportUtils";
import { ReportActions, EmptyReport } from "./ReportShared";

interface Props {
  demands: Demand[];
}

export default function TimelineReport({ demands }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  const timelineData = useMemo(() => {
    const monthMap = new Map<string, { created: number; approved: number; overdue: number }>();
    demands.forEach((d) => {
      const month = d.createdAt.substring(0, 7);
      const entry = monthMap.get(month) || { created: 0, approved: 0, overdue: 0 };
      entry.created++;
      if (["approved", "final"].includes(d.status)) entry.approved++;
      if (new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status)) entry.overdue++;
      monthMap.set(month, entry);
    });
    return [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        name: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        Criadas: data.created,
        Aprovadas: data.approved,
        Atrasadas: data.overdue,
      }));
  }, [demands]);

  const weekdayData = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const counts = new Array(7).fill(0);
    demands.forEach((d) => {
      const day = new Date(d.createdAt).getDay();
      counts[day]++;
    });
    return days.map((name, i) => ({ name, value: counts[i] }));
  }, [demands]);

  const recentActivity = useMemo(() => {
    return [...demands]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);
  }, [demands]);

  if (demands.length === 0) return <EmptyReport message="Nenhuma avaliação encontrada para exibir a linha do tempo." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Linha do Tempo</h2>
        <ReportActions title="Relatório — Linha do Tempo" contentRef={contentRef} />
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Evolução Mensal
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="colorCriadas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAprovadas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Criadas" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCriadas)" strokeWidth={2} />
            <Area type="monotone" dataKey="Aprovadas" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorAprovadas)" strokeWidth={2} />
            <Line type="monotone" dataKey="Atrasadas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Avaliações por Dia da Semana
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weekdayData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="value" name="Avaliações" radius={[6, 6, 0, 0]}>
                {weekdayData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Atividade Recente
          </h3>
          <div className="space-y-2.5">
            {recentActivity.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[d.status] || "hsl(var(--muted-foreground))" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{d.teacherName} — {d.subjectName}</p>
                  <p className="text-[10px] text-muted-foreground">{statusLabels[d.status] || d.status} · {new Date(d.updatedAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente.</p>}
          </div>
        </div>
      </div>

      <div ref={contentRef} className="hidden">
        <h3>Evolução Mensal</h3>
        <table>
          <thead><tr><th>Mês</th><th>Criadas</th><th>Aprovadas</th><th>Atrasadas</th></tr></thead>
          <tbody>
            {timelineData.map((d) => <tr key={d.name}><td>{d.name}</td><td>{d.Criadas}</td><td>{d.Aprovadas}</td><td>{d.Atrasadas}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
