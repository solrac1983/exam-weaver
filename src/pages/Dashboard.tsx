import { useState, useEffect } from "react";
import { mockDemands, examTypeLabels, statusLabels, currentUser } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Clock, CheckCircle2, AlertTriangle, Plus,
  FileText, MessageCircle, BookOpen, Users, BarChart3, Library,
  ArrowRight, TrendingUp, Calendar, User, Zap, Target,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

// ─── Data ───
const totalDemands = mockDemands.length;
const pending = mockDemands.filter((d) => ["pending", "in_progress"].includes(d.status)).length;
const submitted = mockDemands.filter((d) => ["submitted", "review"].includes(d.status)).length;
const approved = mockDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
const overdue = mockDemands.filter(
  (d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status)
).length;

const recentDemands = [...mockDemands]
  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  .slice(0, 5);

// Mock weekly activity
const weeklyData = [
  { day: "Seg", demandas: 2, provas: 1 },
  { day: "Ter", demandas: 3, provas: 2 },
  { day: "Qua", demandas: 1, provas: 3 },
  { day: "Qui", demandas: 4, provas: 2 },
  { day: "Sex", demandas: 2, provas: 4 },
  { day: "Sáb", demandas: 1, provas: 1 },
  { day: "Dom", demandas: 0, provas: 0 },
];

const statusDistribution = [
  { name: "Pendente", value: pending, color: "hsl(var(--muted-foreground))" },
  { name: "Em revisão", value: submitted, color: "hsl(var(--info))" },
  { name: "Aprovadas", value: approved, color: "hsl(var(--success))" },
  { name: "Atrasadas", value: overdue, color: "hsl(var(--destructive))" },
];

// ─── Stat Card ───
function DashStat({ label, value, icon: Icon, variant = "default", subtitle, onClick }: {
  label: string; value: number | string; icon: React.ElementType;
  variant?: "default" | "info" | "warning" | "success" | "danger";
  subtitle?: string; onClick?: () => void;
}) {
  const styles = {
    default: { bg: "bg-card", icon: "bg-muted text-muted-foreground", accent: "" },
    info: { bg: "bg-card", icon: "bg-info/10 text-info", accent: "border-l-4 border-l-info" },
    warning: { bg: "bg-card", icon: "bg-warning/10 text-warning", accent: "border-l-4 border-l-warning" },
    success: { bg: "bg-card", icon: "bg-success/10 text-success", accent: "border-l-4 border-l-success" },
    danger: { bg: "bg-card", icon: "bg-destructive/10 text-destructive", accent: "border-l-4 border-l-destructive" },
  }[variant];

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border/60 p-4 text-left transition-all hover:shadow-md hover:border-border group",
        styles.bg, styles.accent
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", styles.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

// ─── Quick Link ───
function QuickLink({ label, description, icon: Icon, href, color }: {
  label: string; description: string; icon: React.ElementType; href: string; color: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left transition-all hover:shadow-md hover:border-border group"
    >
      <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

// ─── Main ───
export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = currentUser.name.split(" ")[0];

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border border-primary/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Aqui está o resumo das suas atividades. Você tem{" "}
              <span className="font-semibold text-foreground">{pending} demanda(s) pendente(s)</span>
              {overdue > 0 && (
                <> e <span className="font-semibold text-destructive">{overdue} atrasada(s)</span></>
              )}
              .
            </p>
          </div>
          <Button onClick={() => navigate("/demandas/nova")} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Nova Demanda
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashStat label="Total" value={totalDemands} icon={ClipboardList} onClick={() => navigate("/demandas")} subtitle="demandas criadas" />
        <DashStat label="Em andamento" value={pending} icon={Clock} variant="info" onClick={() => navigate("/demandas")} subtitle="aguardando professor" />
        <DashStat label="Em revisão" value={submitted} icon={Target} variant="warning" onClick={() => navigate("/provas")} subtitle="aguardando aprovação" />
        <DashStat label="Atrasadas" value={overdue} icon={AlertTriangle} variant="danger" onClick={() => navigate("/demandas")} subtitle="prazo expirado" />
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Atividade Semanal</h3>
              <p className="text-[11px] text-muted-foreground">Demandas e provas dos últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Demandas</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Provas</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="gradDemandas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradProvas" x1="0" y1="0" x2="0" y2="1">
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
              <Area type="monotone" dataKey="demandas" stroke="hsl(var(--primary))" fill="url(#gradDemandas)" strokeWidth={2} />
              <Area type="monotone" dataKey="provas" stroke="hsl(var(--success))" fill="url(#gradProvas)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Distribuição por Status</h3>
          <p className="text-[11px] text-muted-foreground mb-3">Visão geral das demandas</p>
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

      {/* Quick Links + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Links */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" /> Acesso Rápido
          </h3>
          <div className="space-y-2">
            <QuickLink label="Provas" description="Gerenciar e editar provas" icon={FileText} href="/provas" color="bg-primary/10 text-primary" />
            <QuickLink label="Banco de Questões" description="Buscar e criar questões" icon={Library} href="/banco-questoes" color="bg-info/10 text-info" />
            <QuickLink label="Chat" description="Conversar com professores" icon={MessageCircle} href="/chat" color="bg-success/10 text-success" />
            <QuickLink label="Relatórios" description="Análises e estatísticas" icon={BarChart3} href="/relatorios" color="bg-warning/10 text-warning" />
            <QuickLink label="Modelos" description="Templates de prova" icon={BookOpen} href="/modelos" color="bg-destructive/10 text-destructive" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Atividade Recente
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/demandas")} className="text-xs text-muted-foreground gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {recentDemands.map((d, i) => {
              const isOverdue = new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status);
              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/demandas/${d.id}`)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left transition-all hover:shadow-md hover:border-border group"
                >
                  <div className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-xl text-xs font-bold flex-shrink-0",
                    i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {d.subjectName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {d.subjectName}
                      </p>
                      <StatusBadge status={d.status} />
                      {isOverdue && (
                        <span className="flex items-center gap-0.5 text-[10px] text-destructive font-medium">
                          <AlertTriangle className="h-2.5 w-2.5" /> Atrasada
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{d.teacherName}</span>
                      <span>•</span>
                      <span>{examTypeLabels[d.examType]}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(d.deadline).toLocaleDateString("pt-BR")}</span>
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
