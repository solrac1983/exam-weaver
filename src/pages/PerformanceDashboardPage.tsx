import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, GraduationCap, FileDown, Printer, LayoutDashboard, Users, BookOpen, Activity } from "lucide-react";
import { type GradeRow, type AttendanceRow, aggregateGrades, buildTemporalData } from "@/lib/performanceMetrics";
import PerformanceKPIs from "@/components/performance/PerformanceKPIs";
import PerformanceCharts from "@/components/performance/PerformanceCharts";
import ClassRanking from "@/components/performance/ClassRanking";
import SubjectMatrix from "@/components/performance/SubjectMatrix";
import StudentPerformanceTable from "@/components/performance/StudentPerformanceTable";
import FrequencyChart from "@/components/performance/FrequencyChart";
import DashboardInsights from "@/components/performance/DashboardInsights";
import LearningCurve from "@/components/performance/LearningCurve";
import { handlePerformanceExport } from "@/components/performance/PerformanceExport";

export default function PerformanceDashboardPage() {
  const { profile } = useAuth();
  const [bimesterFilter, setBimesterFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("visao-geral");

  // Fetch grades
  const { data: grades = [], isLoading: loadingGrades } = useQuery({
    queryKey: ["performance-grades", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("score, max_score, class_group, bimester, subject_id, student_id, subjects(name)")
        .eq("company_id", profile!.company_id!)
        .limit(1000);
      if (error) throw error;
      return (data as unknown as GradeRow[]) ?? [];
    },
    enabled: !!profile?.company_id,
    staleTime: 30_000,
  });

  // Fetch attendance
  const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ["performance-attendance", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("student_id, class_group, status, date, subject_id")
        .eq("company_id", profile!.company_id!)
        .limit(1000);
      if (error) throw error;
      return (data as AttendanceRow[]) ?? [];
    },
    enabled: !!profile?.company_id,
    staleTime: 30_000,
  });

  // Fetch student names
  const { data: studentNames = {} } = useQuery({
    queryKey: ["performance-students", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, name")
        .eq("company_id", profile!.company_id!);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const s of data || []) map[s.id] = s.name;
      return map;
    },
    enabled: !!profile?.company_id,
    staleTime: 60_000,
  });

  const loading = loadingGrades || loadingAttendance;

  // Aggregation
  const agg = useMemo(
    () => aggregateGrades(grades, attendance, studentNames, bimesterFilter, subjectFilter, classFilter),
    [grades, attendance, studentNames, bimesterFilter, subjectFilter, classFilter]
  );

  // Apply status filter to students
  const filteredStudents = useMemo(
    () => statusFilter === "all" ? agg.studentMetrics : agg.studentMetrics.filter(s => s.status === statusFilter),
    [agg.studentMetrics, statusFilter]
  );

  // Temporal
  const temporal = useMemo(
    () => buildTemporalData(grades, agg.bimesters),
    [grades, agg.bimesters]
  );

  // Evolution average
  const evolutionAvg = useMemo(() => {
    if (agg.studentMetrics.length === 0) return 0;
    const sum = agg.studentMetrics.reduce((a, s) => a + s.evolution, 0);
    return Math.round((sum / agg.studentMetrics.length) * 10) / 10;
  }, [agg.studentMetrics]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Painel de Desempenho
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visão consolidada do desempenho acadêmico — análise por turma, disciplina e aluno
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handlePerformanceExport("print", {
              bimesterFilter, globalAverage: agg.globalAverage, classMetrics: agg.classMetrics,
              totalStudents: agg.totalStudents, riskStudents: agg.riskStudents, subjectMetrics: agg.subjectMetrics,
            })}>
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handlePerformanceExport("pdf", {
              bimesterFilter, globalAverage: agg.globalAverage, classMetrics: agg.classMetrics,
              totalStudents: agg.totalStudents, riskStudents: agg.riskStudents, subjectMetrics: agg.subjectMetrics,
            })}>
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-card">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Turma</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {agg.classGroups.map(cg => <SelectItem key={cg} value={cg}>{cg}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Disciplina</Label>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {agg.subjectOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Bimestre</Label>
            <Select value={bimesterFilter} onValueChange={setBimesterFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {agg.bimesters.map(b => <SelectItem key={b} value={b}>{b}º Bimestre</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="satisfatorio">Satisfatório</SelectItem>
                <SelectItem value="atencao">Atenção</SelectItem>
                <SelectItem value="risco">Risco</SelectItem>
                <SelectItem value="evolucao">Em Evolução</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(classFilter !== "all" || subjectFilter !== "all" || bimesterFilter !== "all" || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => {
              setClassFilter("all");
              setSubjectFilter("all");
              setBimesterFilter("all");
              setStatusFilter("all");
            }}>
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {grades.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-lg font-medium">Nenhuma nota registrada</p>
            <p className="text-sm mt-1">Registre notas na página de Notas para visualizar o painel de desempenho.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <PerformanceKPIs
            globalAverage={agg.globalAverage}
            totalStudents={agg.totalStudents}
            riskStudents={agg.riskStudents}
            averageFrequency={agg.averageFrequency}
            evolutionAvg={evolutionAvg}
            classCount={agg.classMetrics.length}
          />

          {/* Dashboard Insights Row */}
          <DashboardInsights
            students={agg.studentMetrics}
            globalAverage={agg.globalAverage}
            averageFrequency={agg.averageFrequency}
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="visao-geral" className="text-xs gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="turmas" className="text-xs gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Turmas</span>
              </TabsTrigger>
              <TabsTrigger value="disciplinas" className="text-xs gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Disciplinas</span>
              </TabsTrigger>
              <TabsTrigger value="alunos" className="text-xs gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Alunos</span>
              </TabsTrigger>
            </TabsList>

            {/* Visão Geral */}
            <TabsContent value="visao-geral" className="space-y-4 mt-4">
              <LearningCurve students={agg.studentMetrics} bimesters={agg.bimesters} />
              <PerformanceCharts
                classMetrics={agg.classMetrics}
                subjectMetrics={agg.subjectMetrics}
                temporalData={temporal.data}
                temporalLines={temporal.lines}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FrequencyChart students={agg.studentMetrics} />
                <ClassRanking classMetrics={agg.classMetrics} />
              </div>
            </TabsContent>

            {/* Turmas */}
            <TabsContent value="turmas" className="space-y-4 mt-4">
              <PerformanceCharts
                classMetrics={agg.classMetrics}
                subjectMetrics={agg.subjectMetrics}
                temporalData={temporal.data}
                temporalLines={temporal.lines}
              />
              <ClassRanking classMetrics={agg.classMetrics} />
            </TabsContent>

            {/* Disciplinas */}
            <TabsContent value="disciplinas" className="space-y-4 mt-4">
              <SubjectMatrix subjectMetrics={agg.subjectMetrics} />
            </TabsContent>

            {/* Alunos */}
            <TabsContent value="alunos" className="space-y-4 mt-4">
              <StudentPerformanceTable students={filteredStudents} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
