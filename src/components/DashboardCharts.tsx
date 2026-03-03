import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

interface DashboardChartsProps {
  demands: { createdAt: string; status: string }[];
  statusDistribution: { name: string; value: number; color: string }[];
}

function buildWeeklyData(demands: { createdAt: string; status: string }[]) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const counts = Array.from({ length: 7 }, () => ({ demandas: 0, aprovadas: 0 }));

  demands.forEach((d) => {
    const date = new Date(d.createdAt);
    if (date >= weekStart) {
      const dayIdx = date.getDay();
      counts[dayIdx].demandas++;
      if (["approved", "final"].includes(d.status)) counts[dayIdx].aprovadas++;
    }
  });

  const reordered = [...counts.slice(1), counts[0]];
  const dayLabels = [...days.slice(1), days[0]];

  return dayLabels.map((day, i) => ({
    day,
    demandas: reordered[i].demandas,
    aprovadas: reordered[i].aprovadas,
  }));
}

export default function DashboardCharts({ demands, statusDistribution }: DashboardChartsProps) {
  const weeklyData = useMemo(() => buildWeeklyData(demands), [demands]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Area Chart */}
      <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Atividade Semanal</h3>
            <p className="text-[11px] text-muted-foreground">Avaliações dos últimos 7 dias</p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Criadas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Aprovadas</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={weeklyData}>
            <defs>
              <linearGradient id="gradDemandas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAprovadas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={24} />
            <ReTooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Area type="monotone" dataKey="demandas" stroke="hsl(var(--primary))" fill="url(#gradDemandas)" strokeWidth={2} name="Criadas" />
            <Area type="monotone" dataKey="aprovadas" stroke="hsl(var(--success))" fill="url(#gradAprovadas)" strokeWidth={2} name="Aprovadas" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="rounded-xl border border-border/60 bg-card p-4 md:p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Distribuição por Status</h3>
        <p className="text-[11px] text-muted-foreground mb-3">Visão geral das avaliações</p>
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie
              data={statusDistribution}
              cx="50%" cy="50%"
              innerRadius={40} outerRadius={65}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {statusDistribution.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <ReTooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
          {statusDistribution.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-muted-foreground truncate">{s.name}</span>
              <span className="font-semibold text-foreground ml-auto">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
