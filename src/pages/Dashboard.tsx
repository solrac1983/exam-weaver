import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { examTypeLabels } from "@/data/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Clock, AlertTriangle, Plus,
  MessageCircle, BookOpen, Users, BarChart3, Library,
  ArrowRight, TrendingUp, Calendar, User, Zap, Target,
  GraduationCap, CheckCircle2, FileText, Award,
  PenTool, Layers, Edit3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyDemands } from "@/hooks/useCompanyDemands";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Lazy load recharts — heavy library
const LazyCharts = lazy(() => import("@/components/DashboardCharts"));

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

// ─── Upcoming Deadline Item ───
function DeadlineItem({ name, deadline, status, onClick }: { name: string; deadline: string; status: string; onClick?: () => void }) {
  const date = new Date(deadline);
  const today = new Date();
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;
  const isUrgent = diffDays >= 0 && diffDays <= 2;

  return (
    <button onClick={onClick} className="flex items-center gap-3 py-2 w-full text-left hover:bg-muted/30 rounded-lg px-1 transition-colors">
      <div className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
        isOverdue ? "bg-destructive/10 text-destructive" :
        isUrgent ? "bg-warning/10 text-warning" :
        "bg-muted text-muted-foreground"
      )}>
        {date.getDate()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{name}</p>
        <p className={cn("text-[10px]",
          isOverdue ? "text-destructive font-medium" :
          isUrgent ? "text-warning font-medium" :
          "text-muted-foreground"
        )}>
          {isOverdue ? `${Math.abs(diffDays)} dia(s) atrasado` :
           diffDays === 0 ? "Vence hoje" :
           diffDays === 1 ? "Vence amanhã" :
           `em ${diffDays} dias`}
        </p>
      </div>
      <StatusBadge status={status} />
    </button>
  );
}

// ─── Professor Subject Tag ───
function SubjectTag({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/8 text-primary text-xs font-medium border border-primary/10">
      <BookOpen className="h-3 w-3" />
      {name}
    </span>
  );
}

// ─── Main ───
export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, role, user } = useAuth();
  const { companyDemands: baseDemands, loading: demandsLoading } = useCompanyDemands();
  const isMobile = useIsMobile();

  const isProfessor = role === "professor";
  const isAdmin = role === "admin" || role === "coordinator" || role === "super_admin";

  // Fetch extra stats for admin
  const { data: extraStats } = useQuery({
    queryKey: ["dashboard-extra-stats"],
    queryFn: async () => {
      const [studentsRes, teachersRes, simuladosRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("simulados").select("id, status", { count: "exact" }),
      ]);
      const simulados = simuladosRes.data || [];
      const activeSimulados = simulados.filter(s => !["draft"].includes(s.status)).length;
      return {
        studentCount: studentsRes.count || 0,
        teacherCount: teachersRes.count || 0,
        simuladoCount: simuladosRes.count || 0,
        activeSimulados,
      };
    },
    staleTime: 60_000,
    enabled: isAdmin,
  });

  // Fetch professor-specific data
  const { data: professorData } = useQuery({
    queryKey: ["dashboard-professor-stats", user?.id],
    queryFn: async () => {
      const email = profile?.email || "";
      
      const [teacherRes, standaloneRes, questionsRes] = await Promise.all([
        supabase.from("teachers").select("id, name, subjects, class_groups").eq("email", email).maybeSingle(),
        supabase.from("standalone_exams").select("id, title, status, updated_at").eq("user_id", user!.id).order("updated_at", { ascending: false }).limit(5),
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("author_id", user!.id),
      ]);

      return {
        teacher: teacherRes.data,
        subjects: (teacherRes.data?.subjects as string[]) || [],
        classGroups: (teacherRes.data?.class_groups as string[]) || [],
        standaloneExams: standaloneRes.data || [],
        questionCount: questionsRes.count || 0,
      };
    },
    staleTime: 60_000,
    enabled: isProfessor && !!user?.id,
  });

  const totalDemands = baseDemands.length;
  const pending = baseDemands.filter((d) => ["pending", "in_progress"].includes(d.status)).length;
  const submitted = baseDemands.filter((d) => ["submitted", "review"].includes(d.status)).length;
  const approved = baseDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
  const overdue = baseDemands.filter(
    (d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status)
  ).length;
  const approvalRate = totalDemands > 0 ? Math.round((approved / totalDemands) * 100) : 0;

  const recentDemands = useMemo(() =>
    [...baseDemands]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5),
    [baseDemands]
  );

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);
    return baseDemands
      .filter(d => !["approved", "final"].includes(d.status))
      .filter(d => new Date(d.deadline) <= weekFromNow)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [baseDemands]);

  const statusDistribution = useMemo(() => [
    { name: "Pendente", value: pending, color: "hsl(var(--muted-foreground))" },
    { name: "Em revisão", value: submitted, color: "hsl(var(--info))" },
    { name: "Aprovadas", value: approved, color: "hsl(var(--success))" },
    { name: "Atrasadas", value: overdue, color: "hsl(var(--destructive))" },
  ], [pending, submitted, approved, overdue]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  if (demandsLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/[0.04] to-transparent border border-border/60 p-5 md:p-7 shadow-[var(--shadow-elegant)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight font-display">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isProfessor ? (
                <>
                  Você tem{" "}
                  <span className="font-semibold text-foreground">{pending} avaliação(ões) para elaborar</span>
                  {overdue > 0 && (
                    <> e <span className="font-semibold text-destructive">{overdue} com prazo expirado</span></>
                  )}
                  .
                </>
              ) : (
                <>
                  Aqui está o resumo das suas atividades. Você tem{" "}
                  <span className="font-semibold text-foreground">{pending} avaliação(ões) pendente(s)</span>
                  {overdue > 0 && (
                    <> e <span className="font-semibold text-destructive">{overdue} atrasada(s)</span></>
                  )}
                  .
                </>
              )}
            </p>
            {/* Professor subjects badges */}
            {isProfessor && professorData?.subjects && professorData.subjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {professorData.subjects.map(s => <SubjectTag key={s} name={s} />)}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => navigate(isProfessor ? "/provas/editor" : "/demandas/nova")} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              {isProfessor ? "Nova Prova" : "Nova Avaliação"}
            </Button>
            {isProfessor && (
              <Button variant="outline" onClick={() => navigate("/banco-questoes")} className="gap-2">
                <Library className="h-4 w-4" />
                Banco de Questões
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row - Professor specific */}
      {isProfessor ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <DashStat label="Para elaborar" value={pending} icon={PenTool} variant="info" onClick={() => navigate("/demandas")} subtitle="avaliações pendentes" />
          <DashStat label="Enviadas" value={submitted} icon={CheckCircle2} variant="success" onClick={() => navigate("/demandas")} subtitle="aguardando revisão" />
          <DashStat label="Atrasadas" value={overdue} icon={AlertTriangle} variant="danger" onClick={() => navigate("/demandas")} subtitle="prazo expirado" />
          <DashStat label="Questões criadas" value={professorData?.questionCount ?? 0} icon={Layers} onClick={() => navigate("/banco-questoes")} subtitle="no banco de questões" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <DashStat label="Total" value={totalDemands} icon={ClipboardList} onClick={() => navigate("/demandas")} subtitle="avaliações criadas" />
          <DashStat label="Em andamento" value={pending} icon={Clock} variant="info" onClick={() => navigate("/demandas")} subtitle="aguardando professor" />
          <DashStat label="Aprovadas" value={approved} icon={CheckCircle2} variant="success" onClick={() => navigate("/demandas")} subtitle={`${approvalRate}% taxa de aprovação`} />
          <DashStat label="Atrasadas" value={overdue} icon={AlertTriangle} variant="danger" onClick={() => navigate("/demandas")} subtitle="prazo expirado" />
        </div>
      )}

      {/* Stats Row - Secondary (admin/coordinator only) */}
      {isAdmin && extraStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <DashStat label="Alunos" value={extraStats.studentCount} icon={GraduationCap} subtitle="matriculados" onClick={() => navigate("/cadastros")} />
          <DashStat label="Professores" value={extraStats.teacherCount} icon={Users} subtitle="cadastrados" onClick={() => navigate("/cadastros")} />
          <DashStat label="Simulados" value={extraStats.simuladoCount} icon={FileText} variant="info" subtitle={`${extraStats.activeSimulados} ativos`} onClick={() => navigate("/simulados")} />
          <DashStat label="Em revisão" value={submitted} icon={Target} variant="warning" subtitle="aguardando aprovação" onClick={() => navigate("/demandas")} />
        </div>
      )}

      {/* Professor: Turmas + Provas Avulsas row */}
      {isProfessor && professorData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* My Classes */}
          {professorData.classGroups.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-info" /> Minhas Turmas
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/minhas-turmas")} className="text-xs text-muted-foreground gap-1">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {professorData.classGroups.map(cg => (
                  <button
                    key={cg}
                    onClick={() => navigate("/minhas-turmas")}
                    className="px-3 py-2 rounded-lg bg-muted/50 border border-border/40 text-xs font-medium text-foreground hover:bg-muted hover:border-border transition-all"
                  >
                    {cg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Standalone Exams */}
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-warning" /> Minhas Provas Avulsas
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate("/provas/editor")} className="text-xs text-muted-foreground gap-1">
                Nova <Plus className="h-3 w-3" />
              </Button>
            </div>
            {professorData.standaloneExams.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-xs">
                <FileText className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/30" />
                Nenhuma prova avulsa criada
              </div>
            ) : (
              <div className="space-y-1.5">
                {professorData.standaloneExams.map(exam => (
                  <button
                    key={exam.id}
                    onClick={() => navigate(`/provas/editor?id=${exam.id}`)}
                    className="w-full flex items-center gap-2.5 rounded-lg p-2 text-left hover:bg-muted/50 transition-colors group"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{exam.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(exam.updated_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <StatusBadge status={exam.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts — lazy loaded */}
      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-[280px] rounded-xl" />
          <Skeleton className="h-[280px] rounded-xl" />
        </div>
      }>
        <LazyCharts demands={baseDemands} statusDistribution={statusDistribution} />
      </Suspense>

      {/* Quick Links + Deadlines + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Quick Links */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" /> Acesso Rápido
          </h3>
          <div className={cn("gap-2", isMobile ? "grid grid-cols-2" : "space-y-2")}>
            <QuickLink label="Avaliações" description={isProfessor ? "Suas avaliações atribuídas" : "Gerenciar avaliações"} icon={ClipboardList} href="/demandas" color="bg-primary/10 text-primary" />
            <QuickLink label="Banco de Questões" description="Buscar e criar questões" icon={Library} href="/banco-questoes" color="bg-info/10 text-info" />
            <QuickLink label="Chat" description="Conversar com colegas" icon={MessageCircle} href="/chat" color="bg-success/10 text-success" />
            {isAdmin && (
              <QuickLink label="Relatórios" description="Análises e estatísticas" icon={BarChart3} href="/relatorios" color="bg-warning/10 text-warning" />
            )}
            {(role === "admin" || role === "coordinator") && (
              <QuickLink label="Modelos" description="Templates de prova" icon={BookOpen} href="/modelos" color="bg-destructive/10 text-destructive" />
            )}
            {isProfessor && (
              <QuickLink label="Simulados" description="Provas simuladas" icon={Target} href="/simulados" color="bg-warning/10 text-warning" />
            )}
            {isProfessor && (
              <QuickLink label="Minhas Turmas" description="Ver suas turmas" icon={Users} href="/minhas-turmas" color="bg-destructive/10 text-destructive" />
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-destructive" /> Próximos Prazos
          </h3>
          <div className="rounded-xl border border-border/60 bg-card p-3.5">
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success/40" />
                Nenhum prazo próximo
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {upcomingDeadlines.map(d => (
                  <DeadlineItem key={d.id} name={d.subjectName} deadline={d.deadline} status={d.status} onClick={() => navigate(`/demandas/${d.id}`)} />
                ))}
              </div>
            )}
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
            {recentDemands.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {isProfessor ? "Nenhuma avaliação atribuída ainda." : "Nenhuma avaliação encontrada. Crie a primeira!"}
              </div>
            )}
            {recentDemands.map((d, i) => {
              const isOverdue = new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status);
              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/demandas/${d.id}`)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 md:p-3.5 text-left transition-all hover:shadow-md hover:border-border group"
                >
                  <div className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-xl text-xs font-bold flex-shrink-0",
                    i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {d.subjectName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
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
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      {!isProfessor && (
                        <>
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{d.teacherName}</span>
                          <span className="hidden sm:inline">•</span>
                        </>
                      )}
                      <span className="hidden sm:inline">{examTypeLabels[d.examType]}</span>
                      <span className="hidden sm:inline">•</span>
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
