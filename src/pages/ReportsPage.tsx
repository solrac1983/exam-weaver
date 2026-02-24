import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart3, Printer, FileDown, Calendar, Users, BookOpen,
  ClipboardList, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  PieChart as PieChartIcon, X,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { mockDemands, mockSubjects, statusLabels, examTypeLabels } from "@/data/mockData";
import { toast } from "sonner";

// ── Derived report data ──

function useDemandStats() {
  return useMemo(() => {
    const total = mockDemands.length;
    const byStatus: Record<string, number> = {};
    const bySubject: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byTeacher: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    mockDemands.forEach((d) => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      bySubject[d.subjectName] = (bySubject[d.subjectName] || 0) + 1;
      byType[d.examType] = (byType[d.examType] || 0) + 1;
      byTeacher[d.teacherName] = (byTeacher[d.teacherName] || 0) + 1;
      const month = d.createdAt.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    const overdue = mockDemands.filter(
      (d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status)
    ).length;
    const approved = mockDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
    const pending = mockDemands.filter((d) => ["pending", "in_progress"].includes(d.status)).length;
    const inReview = mockDemands.filter((d) => ["submitted", "review", "revision_requested"].includes(d.status)).length;

    return {
      total, overdue, approved, pending, inReview,
      byStatus: Object.entries(byStatus).map(([k, v]) => ({ name: statusLabels[k] || k, value: v, key: k })),
      bySubject: Object.entries(bySubject).map(([k, v]) => ({ name: k, value: v })),
      byType: Object.entries(byType).map(([k, v]) => ({ name: examTypeLabels[k] || k, value: v })),
      byTeacher: Object.entries(byTeacher).map(([k, v]) => ({ name: k, value: v })),
      byMonth: Object.entries(byMonth).sort().map(([k, v]) => ({ name: k, value: v })),
    };
  }, []);
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(340, 65%, 50%)",
  "hsl(270, 55%, 55%)",
];

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
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visualize métricas, gere relatórios e exporte em PDF
        </p>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral" className="gap-1.5"><PieChartIcon className="h-3.5 w-3.5" />Visão Geral</TabsTrigger>
          <TabsTrigger value="demandas" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Demandas</TabsTrigger>
          <TabsTrigger value="professores" className="gap-1.5"><Users className="h-3.5 w-3.5" />Professores</TabsTrigger>
          <TabsTrigger value="disciplinas" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Disciplinas</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral"><OverviewReport /></TabsContent>
        <TabsContent value="demandas"><DemandsReport /></TabsContent>
        <TabsContent value="professores"><TeachersReport /></TabsContent>
        <TabsContent value="disciplinas"><SubjectsReport /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Stat mini-card ──
function MiniStat({ label, value, icon: Icon, color = "text-primary" }: { label: string; value: number | string; icon: React.ElementType; color?: string }) {
  return (
    <div className="glass-card rounded-lg p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-muted ${color}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
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

// ══════════════════════════════════════════════
// 1. Visão Geral
// ══════════════════════════════════════════════
function OverviewReport() {
  const stats = useDemandStats();
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Visão Geral</h2>
        <ReportActions title="Relatório — Visão Geral" contentRef={contentRef} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Total de Demandas" value={stats.total} icon={ClipboardList} />
        <MiniStat label="Em andamento" value={stats.pending} icon={Clock} color="text-blue-500" />
        <MiniStat label="Em revisão" value={stats.inReview} icon={AlertTriangle} color="text-amber-500" />
        <MiniStat label="Aprovadas / Finalizadas" value={stats.approved} icon={CheckCircle2} color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Demandas por Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {stats.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Demandas por Tipo de Prova</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byType}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Printable hidden content */}
      <div ref={contentRef} className="hidden">
        <div className="stat-row" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div className="stat-box"><div className="label">Total</div><div className="value">{stats.total}</div></div>
          <div className="stat-box"><div className="label">Em andamento</div><div className="value">{stats.pending}</div></div>
          <div className="stat-box"><div className="label">Em revisão</div><div className="value">{stats.inReview}</div></div>
          <div className="stat-box"><div className="label">Aprovadas</div><div className="value">{stats.approved}</div></div>
          <div className="stat-box"><div className="label">Atrasadas</div><div className="value">{stats.overdue}</div></div>
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
// 2. Demandas
// ══════════════════════════════════════════════
function DemandsReport() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const contentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let r = mockDemands;
    if (filterStatus !== "all") r = r.filter((d) => d.status === filterStatus);
    if (filterType !== "all") r = r.filter((d) => d.examType === filterType);
    return r;
  }, [filterStatus, filterType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Relatório de Demandas</h2>
        <ReportActions title="Relatório de Demandas" contentRef={contentRef} />
      </div>

      <div className="glass-card rounded-lg p-4">
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

      <div className="glass-card rounded-lg overflow-hidden">
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{d.teacherName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.subjectName}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{examTypeLabels[d.examType]}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{d.classGroups.join(", ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(d.deadline).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">{statusLabels[d.status]}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhuma demanda encontrada.</td></tr>}
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

// ══════════════════════════════════════════════
// 3. Professores
// ══════════════════════════════════════════════
function TeachersReport() {
  const contentRef = useRef<HTMLDivElement>(null);
  const stats = useDemandStats();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Relatório por Professor</h2>
        <ReportActions title="Relatório por Professor" contentRef={contentRef} />
      </div>

      <div className="glass-card rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Demandas por Professor</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.byTeacher} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-foreground">Professor</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Total de Demandas</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Aprovadas</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Pendentes</th>
            </tr>
          </thead>
          <tbody>
            {stats.byTeacher.map((t) => {
              const teacherDemands = mockDemands.filter((d) => d.teacherName === t.name);
              const approved = teacherDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
              const pending = teacherDemands.filter((d) => !["approved", "final"].includes(d.status)).length;
              return (
                <tr key={t.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.value}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-medium">{approved}</span></td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[11px] font-medium">{pending}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div ref={contentRef} className="hidden">
        <h3>Demandas por Professor</h3>
        <table>
          <thead><tr><th>Professor</th><th>Total</th><th>Aprovadas</th><th>Pendentes</th></tr></thead>
          <tbody>
            {stats.byTeacher.map((t) => {
              const teacherDemands = mockDemands.filter((d) => d.teacherName === t.name);
              const approved = teacherDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
              const pending = t.value - approved;
              return <tr key={t.name}><td>{t.name}</td><td>{t.value}</td><td>{approved}</td><td>{pending}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// 4. Disciplinas
// ══════════════════════════════════════════════
function SubjectsReport() {
  const contentRef = useRef<HTMLDivElement>(null);
  const stats = useDemandStats();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Relatório por Disciplina</h2>
        <ReportActions title="Relatório por Disciplina" contentRef={contentRef} />
      </div>

      <div className="glass-card rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Demandas por Disciplina</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.bySubject}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {stats.bySubject.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-foreground">Disciplina</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Total de Demandas</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Aprovadas</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Pendentes</th>
            </tr>
          </thead>
          <tbody>
            {stats.bySubject.map((s) => {
              const subDemands = mockDemands.filter((d) => d.subjectName === s.name);
              const approved = subDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
              const pending = s.value - approved;
              return (
                <tr key={s.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.value}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-medium">{approved}</span></td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[11px] font-medium">{pending}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div ref={contentRef} className="hidden">
        <h3>Demandas por Disciplina</h3>
        <table>
          <thead><tr><th>Disciplina</th><th>Total</th><th>Aprovadas</th><th>Pendentes</th></tr></thead>
          <tbody>
            {stats.bySubject.map((s) => {
              const subDemands = mockDemands.filter((d) => d.subjectName === s.name);
              const approved = subDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
              return <tr key={s.name}><td>{s.name}</td><td>{s.value}</td><td>{approved}</td><td>{s.value - approved}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
