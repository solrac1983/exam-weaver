import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, Printer, FileDown, Calendar, Users, BookOpen,
  ClipboardList, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  PieChart as PieChartIcon, X, Trophy, Medal, Award, Activity,
  Target, Zap, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar,
} from "recharts";
import { mockDemands, mockSubjects, statusLabels, examTypeLabels } from "@/data/mockData";
import { toast } from "sonner";

// ── Animated counter hook ──
function useAnimatedNumber(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

// ── Derived report data ──
function useDemandStats() {
  return useMemo(() => {
    const total = mockDemands.length;
    const byStatus: Record<string, number> = {};
    const bySubject: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byTeacher: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const byClassGroup: Record<string, number> = {};

    mockDemands.forEach((d) => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      bySubject[d.subjectName] = (bySubject[d.subjectName] || 0) + 1;
      byType[d.examType] = (byType[d.examType] || 0) + 1;
      byTeacher[d.teacherName] = (byTeacher[d.teacherName] || 0) + 1;
      const month = d.createdAt.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
      d.classGroups.forEach((cg) => {
        byClassGroup[cg] = (byClassGroup[cg] || 0) + 1;
      });
    });

    const overdue = mockDemands.filter(
      (d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status)
    ).length;
    const approved = mockDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
    const pending = mockDemands.filter((d) => ["pending", "in_progress"].includes(d.status)).length;
    const inReview = mockDemands.filter((d) => ["submitted", "review", "revision_requested"].includes(d.status)).length;
    const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return {
      total, overdue, approved, pending, inReview, completionRate,
      byStatus: Object.entries(byStatus).map(([k, v]) => ({ name: statusLabels[k] || k, value: v, key: k })),
      bySubject: Object.entries(bySubject).map(([k, v]) => ({ name: k, value: v })),
      byType: Object.entries(byType).map(([k, v]) => ({ name: examTypeLabels[k] || k, value: v })),
      byTeacher: Object.entries(byTeacher).map(([k, v]) => ({ name: k, value: v })),
      byMonth: Object.entries(byMonth).sort().map(([k, v]) => ({ name: k, value: v })),
      byClassGroup: Object.entries(byClassGroup).sort().map(([k, v]) => ({ name: k, value: v })),
    };
  }, []);
}

const COLORS = [
  "hsl(220, 65%, 45%)",
  "hsl(36, 90%, 52%)",
  "hsl(152, 60%, 40%)",
  "hsl(340, 65%, 50%)",
  "hsl(270, 55%, 55%)",
  "hsl(200, 80%, 50%)",
  "hsl(30, 80%, 55%)",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(36, 90%, 52%)",
  in_progress: "hsl(200, 80%, 50%)",
  submitted: "hsl(270, 55%, 55%)",
  review: "hsl(30, 80%, 55%)",
  revision_requested: "hsl(340, 65%, 50%)",
  approved: "hsl(152, 60%, 40%)",
  final: "hsl(220, 65%, 45%)",
};

// ── Print / PDF helpers ──
function buildPrintHTML(title: string, contentEl: HTMLElement) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 32px; color: #1a1a2e; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #666; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
  th { background: #f4f4f5; font-weight: 600; }
  .stat-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .stat-box { flex: 1; min-width: 120px; border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
  .stat-box .label { font-size: 11px; color: #666; }
  .stat-box .value { font-size: 22px; font-weight: 700; }
  @media print { body { padding: 16px; } }
</style>
</head><body>
<h1>${title}</h1>
<p class="subtitle">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
${contentEl.innerHTML}
</body></html>`;
}

function handlePrint(title: string, contentRef: React.RefObject<HTMLDivElement | null>) {
  if (!contentRef.current) return;
  const html = buildPrintHTML(title, contentRef.current);
  const w = window.open("", "_blank");
  if (!w) { toast.error("Popup bloqueado. Permita popups para imprimir."); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); };
}

function handlePDF(title: string, contentRef: React.RefObject<HTMLDivElement | null>) {
  if (!contentRef.current) return;
  const html = buildPrintHTML(title, contentRef.current);
  const w = window.open("", "_blank");
  if (!w) { toast.error("Popup bloqueado. Permita popups para gerar PDF."); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); };
  toast.info("Use 'Salvar como PDF' na janela de impressão.");
}

// ══════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════
export default function ReportsPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Relatórios & Análises
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Painel completo de métricas, gráficos interativos e análise de desempenho
        </p>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral" className="gap-1.5"><PieChartIcon className="h-3.5 w-3.5" />Visão Geral</TabsTrigger>
          <TabsTrigger value="demandas" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Demandas</TabsTrigger>
          <TabsTrigger value="professores" className="gap-1.5"><Users className="h-3.5 w-3.5" />Professores</TabsTrigger>
          <TabsTrigger value="disciplinas" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Disciplinas</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral"><OverviewReport /></TabsContent>
        <TabsContent value="demandas"><DemandsReport /></TabsContent>
        <TabsContent value="professores"><TeachersReport /></TabsContent>
        <TabsContent value="disciplinas"><SubjectsReport /></TabsContent>
        <TabsContent value="timeline"><TimelineReport /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Animated Stat card ──
function AnimatedStat({ label, value, icon: Icon, color = "text-primary", subtitle, trend }: {
  label: string; value: number; icon: React.ElementType; color?: string; subtitle?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const animatedValue = useAnimatedNumber(value);
  return (
    <div className="glass-card rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition-all duration-300 group">
      <div className={`p-3 rounded-xl bg-muted/80 ${color} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold text-foreground tabular-nums">{animatedValue}</p>
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${
              trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            }`}>
              {trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : trend === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Action bar ──
function ReportActions({ title, contentRef }: { title: string; contentRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handlePrint(title, contentRef)}>
        <Printer className="h-4 w-4" />Imprimir
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handlePDF(title, contentRef)}>
        <FileDown className="h-4 w-4" />Exportar PDF
      </Button>
    </div>
  );
}

// ── Completion ring ──
function CompletionRing({ percentage }: { percentage: number }) {
  const animated = useAnimatedNumber(percentage, 1200);
  const data = [{ name: "Concluído", value: animated }, { name: "Restante", value: 100 - animated }];
  return (
    <div className="glass-card rounded-xl p-5 flex flex-col items-center">
      <h3 className="text-sm font-semibold text-foreground mb-2">Taxa de Conclusão</h3>
      <div className="relative" style={{ width: 160, height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={55} outerRadius={72} startAngle={90} endAngle={-270} paddingAngle={2}>
              <Cell fill="hsl(152, 60%, 40%)" />
              <Cell fill="hsl(220, 15%, 90%)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{animated}%</span>
          <span className="text-[10px] text-muted-foreground">concluídas</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(152, 60%, 40%)" }} /> Aprovadas</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted" /> Em andamento</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// 1. Visão Geral (enhanced)
// ══════════════════════════════════════════════
function OverviewReport() {
  const stats = useDemandStats();
  const contentRef = useRef<HTMLDivElement>(null);

  const deadlineData = useMemo(() => {
    const upcoming = mockDemands
      .filter((d) => !["approved", "final"].includes(d.status))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
    return upcoming;
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Visão Geral</h2>
        <ReportActions title="Relatório — Visão Geral" contentRef={contentRef} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AnimatedStat label="Total de Demandas" value={stats.total} icon={ClipboardList} trend="neutral" />
        <AnimatedStat label="Em andamento" value={stats.pending} icon={Clock} color="text-info" trend="up" subtitle="aguardando entrega" />
        <AnimatedStat label="Em revisão" value={stats.inReview} icon={AlertTriangle} color="text-warning" subtitle="revisão pendente" />
        <AnimatedStat label="Aprovadas" value={stats.approved} icon={CheckCircle2} color="text-success" trend="up" subtitle="finalizadas com sucesso" />
        <AnimatedStat label="Atrasadas" value={stats.overdue} icon={Zap} color="text-destructive" trend={stats.overdue > 0 ? "down" : "neutral"} subtitle="prazo expirado" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" /> Distribuição por Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={stats.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={50}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ stroke: "hsl(220, 10%, 60%)" }}>
                {stats.byStatus.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.key] || COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(220, 15%, 90%)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <CompletionRing percentage={stats.completionRate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Demandas por Tipo de Prova
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byType} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {stats.byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Demandas por Turma
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byClassGroup} layout="vertical" barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {stats.byClassGroup.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming deadlines */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-warning" /> Próximos Prazos
        </h3>
        {deadlineData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum prazo pendente.</p>
        ) : (
          <div className="space-y-2">
            {deadlineData.map((d) => {
              const daysLeft = Math.ceil((new Date(d.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysLeft < 0;
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? "bg-destructive" : daysLeft <= 3 ? "bg-warning" : "bg-success"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.teacherName} — {d.subjectName}</p>
                    <p className="text-[11px] text-muted-foreground">{d.classGroups.join(", ")} · {examTypeLabels[d.examType]}</p>
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
        )}
      </div>

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
        <h3>Demandas por Status</h3>
        <table><thead><tr><th>Status</th><th>Quantidade</th></tr></thead>
          <tbody>{stats.byStatus.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.value}</td></tr>)}</tbody>
        </table>
        <br/>
        <h3>Demandas por Tipo de Prova</h3>
        <table><thead><tr><th>Tipo</th><th>Quantidade</th></tr></thead>
          <tbody>{stats.byType.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.value}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// 2. Demandas (enhanced with progress bars)
// ══════════════════════════════════════════════
function DemandsReport() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const contentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let r = [...mockDemands];
    if (filterStatus !== "all") r = r.filter((d) => d.status === filterStatus);
    if (filterType !== "all") r = r.filter((d) => d.examType === filterType);
    return r;
  }, [filterStatus, filterType]);

  const statusProgress: Record<string, number> = {
    pending: 10, in_progress: 30, submitted: 50, review: 60,
    revision_requested: 45, approved: 90, final: 100,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Relatório de Demandas</h2>
        <ReportActions title="Relatório de Demandas" contentRef={contentRef} />
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(examTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterStatus !== "all" || filterType !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterType("all"); }} className="text-xs gap-1"><X className="h-3 w-3" />Limpar</Button>
          )}
          <p className="text-sm text-muted-foreground ml-auto">{filtered.length} resultado(s)</p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Professor</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Disciplina</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Turmas</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Prazo</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground w-32">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const progress = statusProgress[d.status] || 0;
                const isOverdue = new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status);
                return (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{d.teacherName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.subjectName}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{examTypeLabels[d.examType]}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{d.classGroups.join(", ")}</td>
                    <td className={`px-4 py-3 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {new Date(d.deadline).toLocaleDateString("pt-BR")}
                      {isOverdue && <span className="ml-1 text-[10px]">⚠</span>}
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">{statusLabels[d.status]}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Nenhuma demanda encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable */}
      <div ref={contentRef} className="hidden">
        <p style={{ marginBottom: 12 }}><strong>{filtered.length}</strong> demanda(s) encontrada(s)</p>
        <table>
          <thead><tr><th>Professor</th><th>Disciplina</th><th>Tipo</th><th>Turmas</th><th>Prazo</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>{d.teacherName}</td><td>{d.subjectName}</td><td>{examTypeLabels[d.examType]}</td>
                <td>{d.classGroups.join(", ")}</td><td>{new Date(d.deadline).toLocaleDateString("pt-BR")}</td><td>{statusLabels[d.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Teacher ranking data ──
interface TeacherRanking {
  name: string;
  totalDemands: number;
  delivered: number;
  pending: number;
  approved: number;
  overdue: number;
  avgDeliveryDays: number;
  fastestDays: number;
  slowestDays: number;
  score: number;
}

function useTeacherRanking(): TeacherRanking[] {
  return useMemo(() => {
    const teacherMap = new Map<string, typeof mockDemands>();
    mockDemands.forEach((d) => {
      const list = teacherMap.get(d.teacherName) || [];
      list.push(d);
      teacherMap.set(d.teacherName, list);
    });

    const rankings: TeacherRanking[] = [];

    teacherMap.forEach((demands, name) => {
      const delivered = demands.filter((d) => ["submitted", "review", "revision_requested", "approved", "final"].includes(d.status));
      const approved = demands.filter((d) => ["approved", "final"].includes(d.status));
      const pending = demands.filter((d) => ["pending", "in_progress"].includes(d.status));
      const overdue = demands.filter((d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status));

      const deliveryDays = delivered.map((d) => {
        const created = new Date(d.createdAt).getTime();
        const updated = new Date(d.updatedAt).getTime();
        return Math.max(1, Math.round((updated - created) / (1000 * 60 * 60 * 24)));
      });

      const avgDays = deliveryDays.length > 0 ? Math.round(deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length) : 0;
      const fastest = deliveryDays.length > 0 ? Math.min(...deliveryDays) : 0;
      const slowest = deliveryDays.length > 0 ? Math.max(...deliveryDays) : 0;

      // Score: lower avg = better, more delivered = better, penalties for overdue
      const speedScore = avgDays > 0 ? Math.max(0, 100 - avgDays * 5) : 0;
      const volumeScore = (delivered.length / Math.max(demands.length, 1)) * 100;
      const penaltyScore = overdue.length * 15;
      const score = Math.round(Math.max(0, (speedScore * 0.5 + volumeScore * 0.5) - penaltyScore));

      rankings.push({
        name, totalDemands: demands.length, delivered: delivered.length,
        pending: pending.length, approved: approved.length, overdue: overdue.length,
        avgDeliveryDays: avgDays, fastestDays: fastest, slowestDays: slowest, score,
      });
    });

    rankings.sort((a, b) => b.score - a.score);
    return rankings;
  }, []);
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

// ══════════════════════════════════════════════
// 3. Professores (enhanced with radar + score)
// ══════════════════════════════════════════════
function TeachersReport() {
  const contentRef = useRef<HTMLDivElement>(null);
  const ranking = useTeacherRanking();

  const radarData = ranking.map((r) => ({
    name: r.name.split(" ")[0],
    Rapidez: r.avgDeliveryDays > 0 ? Math.max(0, 100 - r.avgDeliveryDays * 5) : 0,
    Volume: Math.round((r.delivered / Math.max(r.totalDemands, 1)) * 100),
    Aprovação: Math.round((r.approved / Math.max(r.totalDemands, 1)) * 100),
    Pontualidade: r.overdue === 0 ? 100 : Math.max(0, 100 - r.overdue * 30),
  }));

  const chartData = ranking.map((r) => ({
    name: r.name.split(" ")[0],
    "Prazo médio (dias)": r.avgDeliveryDays,
    "Entregas": r.delivered,
    "Score": r.score,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Relatório por Professor</h2>
        <ReportActions title="Relatório por Professor" contentRef={contentRef} />
      </div>

      {/* Podium cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ranking.slice(0, 3).map((r, i) => (
          <div key={r.name} className={`glass-card rounded-xl p-5 border-2 ${getRankBadgeClass(i)} hover:shadow-md transition-all duration-300`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-muted/80">{getRankIcon(i)}</div>
              <div>
                <span className="font-semibold text-foreground text-sm block">{r.name}</span>
                <span className="text-[10px] text-muted-foreground">Score: {r.score}/100</span>
              </div>
            </div>
            <Progress value={r.score} className="h-1.5 mb-3" />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Prazo médio</p>
                <p className="font-bold text-foreground text-lg">{r.avgDeliveryDays} <span className="text-xs font-normal">dias</span></p>
              </div>
              <div>
                <p className="text-muted-foreground">Entregas</p>
                <p className="font-bold text-foreground text-lg">{r.delivered} <span className="text-xs font-normal">de {r.totalDemands}</span></p>
              </div>
              <div>
                <p className="text-muted-foreground">Aprovadas</p>
                <p className="font-medium text-success">{r.approved}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Atrasadas</p>
                <p className={`font-medium ${r.overdue > 0 ? "text-destructive" : "text-muted-foreground"}`}>{r.overdue}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Perfil de Desempenho
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(220, 15%, 85%)" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              {["Rapidez", "Volume", "Aprovação", "Pontualidade"].map((key, i) => (
                <Radar key={key} name={key} dataKey={key} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Comparativo Geral
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Score" fill="hsl(152, 60%, 40%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Prazo médio (dias)" fill="hsl(220, 65%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Entregas" fill="hsl(36, 90%, 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full ranking table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/50">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Ranking Geral de Desempenho
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
                      : <span className="text-muted-foreground text-xs">0</span>
                    }
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-foreground">{r.avgDeliveryDays > 0 ? `${r.avgDeliveryDays}d` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable content */}
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

// ══════════════════════════════════════════════
// 4. Disciplinas (enhanced with heatmap-like view)
// ══════════════════════════════════════════════
function SubjectsReport() {
  const contentRef = useRef<HTMLDivElement>(null);
  const stats = useDemandStats();

  const subjectDetails = useMemo(() => {
    return stats.bySubject.map((s) => {
      const subDemands = mockDemands.filter((d) => d.subjectName === s.name);
      const approved = subDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
      const pending = subDemands.filter((d) => ["pending", "in_progress"].includes(d.status)).length;
      const inReview = subDemands.filter((d) => ["submitted", "review", "revision_requested"].includes(d.status)).length;
      const overdue = subDemands.filter((d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status)).length;
      const completionRate = s.value > 0 ? Math.round((approved / s.value) * 100) : 0;
      const teachers = [...new Set(subDemands.map((d) => d.teacherName))];
      const classGroups = [...new Set(subDemands.flatMap((d) => d.classGroups))];
      return { ...s, approved, pending, inReview, overdue, completionRate, teachers, classGroups };
    });
  }, [stats.bySubject]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Relatório por Disciplina</h2>
        <ReportActions title="Relatório por Disciplina" contentRef={contentRef} />
      </div>

      {/* Subject summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjectDetails.map((s, i) => (
          <div key={s.name} className="glass-card rounded-xl p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
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
            <p className="text-[10px] text-muted-foreground mt-2">
              Prof: {s.teachers.join(", ")}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Volume por Disciplina
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.bySubject} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {stats.bySubject.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Taxa de Conclusão por Disciplina
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={subjectDetails} layout="vertical" barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="completionRate" name="Conclusão" radius={[0, 6, 6, 0]}>
                {subjectDetails.map((s, i) => (
                  <Cell key={i} fill={s.completionRate >= 80 ? "hsl(152, 60%, 40%)" : s.completionRate >= 50 ? "hsl(36, 90%, 52%)" : "hsl(340, 65%, 50%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed table */}
      <div className="glass-card rounded-xl overflow-hidden">
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
        <h3>Demandas por Disciplina</h3>
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

// ══════════════════════════════════════════════
// 5. Timeline (new tab)
// ══════════════════════════════════════════════
function TimelineReport() {
  const contentRef = useRef<HTMLDivElement>(null);
  const stats = useDemandStats();

  const timelineData = useMemo(() => {
    const monthMap = new Map<string, { created: number; approved: number; overdue: number }>();
    mockDemands.forEach((d) => {
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
  }, []);

  const weekdayData = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const counts = new Array(7).fill(0);
    mockDemands.forEach((d) => {
      const day = new Date(d.createdAt).getDay();
      counts[day]++;
    });
    return days.map((name, i) => ({ name, value: counts[i] }));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Linha do Tempo</h2>
        <ReportActions title="Relatório — Linha do Tempo" contentRef={contentRef} />
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Evolução Mensal
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="colorCriadas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220, 65%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(220, 65%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAprovadas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(152, 60%, 40%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(152, 60%, 40%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Criadas" stroke="hsl(220, 65%, 45%)" fillOpacity={1} fill="url(#colorCriadas)" strokeWidth={2} />
            <Area type="monotone" dataKey="Aprovadas" stroke="hsl(152, 60%, 40%)" fillOpacity={1} fill="url(#colorAprovadas)" strokeWidth={2} />
            <Line type="monotone" dataKey="Atrasadas" stroke="hsl(340, 65%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Demandas por Dia da Semana
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weekdayData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" name="Demandas" radius={[6, 6, 0, 0]}>
                {weekdayData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Atividade Recente
          </h3>
          <div className="space-y-3">
            {mockDemands
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 6)
              .map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[d.status] || "hsl(220, 15%, 70%)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{d.teacherName} — {d.subjectName}</p>
                    <p className="text-[10px] text-muted-foreground">{statusLabels[d.status]} · {new Date(d.updatedAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              ))}
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
