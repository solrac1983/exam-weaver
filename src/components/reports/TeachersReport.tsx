import { useRef, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, Award, Activity, TrendingUp } from "lucide-react";
import { Demand } from "@/types";
import { TeacherRanking, computeTeacherRanking, CHART_COLORS } from "./reportUtils";
import { ReportActions, EmptyReport } from "./ReportShared";

interface Props {
  demands: Demand[];
}

function getRankIcon(position: number) {
  if (position === 0) return <Trophy className="h-5 w-5 text-amber-500" />;
  if (position === 1) return <Medal className="h-5 w-5 text-slate-400" />;
  if (position === 2) return <Award className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{position + 1}º</span>;
}

function getRankBadgeClass(position: number) {
  if (position === 0) return "border-amber-500/30 bg-amber-500/5";
  if (position === 1) return "border-slate-400/30 bg-slate-500/5";
  if (position === 2) return "border-amber-700/20 bg-amber-700/5";
  return "border-border bg-muted/30";
}

export default function TeachersReport({ demands }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const ranking = useMemo(() => computeTeacherRanking(demands), [demands]);

  const radarData = ranking.map((r) => ({
    name: r.name.split(" ")[0],
    Rapidez: r.avgDeliveryDays > 0 ? Math.max(0, 100 - r.avgDeliveryDays * 5) : 0,
    Volume: Math.round((r.delivered / Math.max(r.totalDemands, 1)) * 100),
    Aprovação: Math.round((r.approved / Math.max(r.totalDemands, 1)) * 100),
    Pontualidade: r.overdue === 0 ? 100 : Math.max(0, 100 - r.overdue * 30),
  }));

  const chartData = ranking.map((r) => ({
    name: r.name.split(" ")[0],
    Score: r.score,
    "Prazo médio (dias)": r.avgDeliveryDays,
    Entregas: r.delivered,
  }));

  if (ranking.length === 0) return <EmptyReport message="Nenhum professor com avaliações encontrado." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Relatório por Professor</h2>
        <ReportActions title="Relatório por Professor" contentRef={contentRef} />
      </div>

      {/* Podium */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ranking.slice(0, 3).map((r, i) => (
          <div key={r.name} className={`rounded-xl border-2 bg-card p-5 ${getRankBadgeClass(i)} hover:shadow-md transition-all duration-300`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-muted/80">{getRankIcon(i)}</div>
              <div>
                <span className="font-semibold text-foreground text-sm block">{r.name}</span>
                <span className="text-[10px] text-muted-foreground">Score: {r.score}/100</span>
              </div>
            </div>
            <Progress value={r.score} className="h-1.5 mb-3" />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted-foreground">Prazo médio</p><p className="font-bold text-foreground text-lg">{r.avgDeliveryDays} <span className="text-xs font-normal">dias</span></p></div>
              <div><p className="text-muted-foreground">Entregas</p><p className="font-bold text-foreground text-lg">{r.delivered} <span className="text-xs font-normal">de {r.totalDemands}</span></p></div>
              <div><p className="text-muted-foreground">Aprovadas</p><p className="font-medium text-success">{r.approved}</p></div>
              <div><p className="text-muted-foreground">Atrasadas</p><p className={`font-medium ${r.overdue > 0 ? "text-destructive" : "text-muted-foreground"}`}>{r.overdue}</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Perfil de Desempenho
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              {["Rapidez", "Volume", "Aprovação", "Pontualidade"].map((key, i) => (
                <Radar key={key} name={key} dataKey={key} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.15} />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Comparativo Geral
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Score" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Prazo médio (dias)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Entregas" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full ranking table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/50">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Ranking Geral de Desempenho
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-center px-3 py-3 font-semibold text-foreground w-12">#</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Professor</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Score</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Total</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Entregues</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Aprovadas</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Atrasadas</th>
                <th className="text-center px-3 py-3 font-semibold text-foreground">Prazo Médio</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-3 text-center">{getRankIcon(i)}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <Progress value={r.score} className="h-1.5 w-12" />
                      <span className="text-xs font-semibold text-foreground">{r.score}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{r.totalDemands}</td>
                  <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{r.delivered}</span></td>
                  <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-medium">{r.approved}</span></td>
                  <td className="px-3 py-3 text-center">
                    {r.overdue > 0
                      ? <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium">{r.overdue}</span>
                      : <span className="text-muted-foreground text-xs">0</span>}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-foreground">{r.avgDeliveryDays > 0 ? `${r.avgDeliveryDays}d` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div ref={contentRef} className="hidden">
        <h3>Ranking Geral de Desempenho</h3>
        <table>
          <thead><tr><th>#</th><th>Professor</th><th>Score</th><th>Total</th><th>Entregues</th><th>Aprovadas</th><th>Atrasadas</th><th>Prazo Médio</th></tr></thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={r.name}>
                <td>{i + 1}º</td><td>{r.name}</td><td>{r.score}</td><td>{r.totalDemands}</td><td>{r.delivered}</td><td>{r.approved}</td><td>{r.overdue}</td><td>{r.avgDeliveryDays > 0 ? `${r.avgDeliveryDays}d` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
