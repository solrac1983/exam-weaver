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
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, GraduationCap, FileDown, Printer, LayoutDashboard, Users, BookOpen, Activity, Search, X, ClipboardList, Brain, Compass, Grid3X3, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import StudentReportEditDialog from "@/components/performance/StudentReportEditDialog";
import BatchDiagnosticExportDialog from "@/components/student/BatchDiagnosticExportDialog";

export default function PerformanceDashboardPage() {
  const { profile } = useAuth();
  const [bimesterFilter, setBimesterFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [batchDiagnosticOpen, setBatchDiagnosticOpen] = useState(false);

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

  // Apply status + student filter to students
  const filteredStudents = useMemo(() => {
    let result = agg.studentMetrics;
    if (studentFilter !== "all") result = result.filter(s => s.id === studentFilter);
    if (statusFilter !== "all") result = result.filter(s => s.status === statusFilter);
    return result;
  }, [agg.studentMetrics, statusFilter, studentFilter]);

  // Student options for search (sorted by name)
  const studentOptions = useMemo(() => {
    return Object.entries(studentNames)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [studentNames]);

  const filteredStudentOptions = useMemo(() => {
    if (!studentSearch) return studentOptions;
    const q = studentSearch.toLowerCase();
    return studentOptions.filter(s => s.name.toLowerCase().includes(q));
  }, [studentOptions, studentSearch]);

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
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setReportDialogOpen(true)}>
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Boletim Individual</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBatchDiagnosticOpen(true)}>
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Diagnósticos em Lote</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-card">
          {/* Student Search */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Aluno</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] h-8 text-xs justify-start gap-1.5 font-normal">
                  <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {studentFilter === "all" ? "Pesquisar aluno..." : studentNames[studentFilter] || "Aluno"}
                  </span>
                  {studentFilter !== "all" && (
                    <X
                      className="h-3 w-3 ml-auto text-muted-foreground hover:text-foreground shrink-0"
                      onClick={(e) => { e.stopPropagation(); setStudentFilter("all"); setStudentSearch(""); }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-2" align="start">
                <Input
                  placeholder="Buscar por nome..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="h-8 text-xs mb-2"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  <button
                    className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors ${studentFilter === "all" ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
                    onClick={() => { setStudentFilter("all"); setStudentSearch(""); }}
                  >
                    Todos os alunos
                  </button>
                  {filteredStudentOptions.map(s => (
                    <button
                      key={s.id}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors truncate ${studentFilter === s.id ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
                      onClick={() => { setStudentFilter(s.id); setStudentSearch(""); }}
                    >
                      {s.name}
                    </button>
                  ))}
                  {filteredStudentOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum aluno encontrado</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

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
          {(classFilter !== "all" || subjectFilter !== "all" || bimesterFilter !== "all" || statusFilter !== "all" || studentFilter !== "all") && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => {
              setClassFilter("all");
              setSubjectFilter("all");
              setBimesterFilter("all");
              setStatusFilter("all");
              setStudentFilter("all");
              setStudentSearch("");
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
          {/* KPIs - when student is selected, show their specific metrics */}
          {studentFilter !== "all" && filteredStudents.length > 0 ? (
            <PerformanceKPIs
              globalAverage={filteredStudents[0].average}
              totalStudents={1}
              riskStudents={filteredStudents[0].status === "risco" ? 1 : 0}
              averageFrequency={filteredStudents[0].frequency}
              evolutionAvg={filteredStudents[0].evolution}
              classCount={1}
            />
          ) : (
            <PerformanceKPIs
              globalAverage={agg.globalAverage}
              totalStudents={agg.totalStudents}
              riskStudents={agg.riskStudents}
              averageFrequency={agg.averageFrequency}
              evolutionAvg={evolutionAvg}
              classCount={agg.classMetrics.length}
            />
          )}

          {/* Student Summary Card — shown when a specific student is searched */}
          {studentFilter !== "all" && filteredStudents.length > 0 && (() => {
            const s = filteredStudents[0];
            const strengths = s.subjectScores.filter(sub => sub.average >= 70).sort((a, b) => b.average - a.average);
            const weaknesses = s.subjectScores.filter(sub => sub.average < 70).sort((a, b) => a.average - b.average);
            const avgColor = s.average >= 70 ? "text-success" : s.average >= 50 ? "text-warning" : "text-destructive";
            const statusLabel: Record<string, string> = { satisfatorio: "Satisfatório", atencao: "Atenção", risco: "Risco", evolucao: "Em Evolução" };
            const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = { satisfatorio: "default", atencao: "secondary", risco: "destructive", evolucao: "outline" };

            // Build detailed comment
            const parts: string[] = [];
            if (s.status === "satisfatorio") parts.push(`${s.name} apresenta desempenho satisfatório com média geral de ${s.average}%, demonstrando domínio consistente dos conteúdos avaliados.`);
            else if (s.status === "evolucao") parts.push(`${s.name} encontra-se em trajetória de evolução acadêmica, com média atual de ${s.average}% e melhora de +${s.evolution} pontos ao longo dos bimestres.`);
            else if (s.status === "atencao") parts.push(`${s.name} requer atenção pedagógica, com média geral de ${s.average}%, ficando abaixo do patamar ideal.`);
            else parts.push(`${s.name} encontra-se em situação de risco acadêmico, com média geral de ${s.average}%, necessitando de intervenção imediata.`);

            if (s.bimesterScores.length >= 2) {
              const first = s.bimesterScores[0];
              const last = s.bimesterScores[s.bimesterScores.length - 1];
              if (s.evolution > 0) parts.push(`Crescimento de +${s.evolution} pontos (de ${first.average}% no ${first.bimester}º bim para ${last.average}% no ${last.bimester}º bim).`);
              else if (s.evolution < 0) parts.push(`Queda de ${s.evolution} pontos (de ${first.average}% no ${first.bimester}º bim para ${last.average}% no ${last.bimester}º bim).`);
            }
            if (strengths.length > 0) parts.push(`Destaca-se em ${strengths.slice(0, 3).map(x => `${x.name} (${x.average}%)`).join(", ")}.`);
            if (weaknesses.length > 0) parts.push(`Necessita reforço em ${weaknesses.slice(0, 3).map(x => `${x.name} (${x.average}%)`).join(", ")}.`);
            if (s.frequency < 75) parts.push(`Frequência de ${s.frequency}% — abaixo do mínimo exigido (75%).`);
            else parts.push(`Frequência de ${s.frequency}%.`);
            parts.push(`Recomendação: ${s.recommendation}.`);

            return (
              <Card className="border-primary/20 bg-primary/[0.02]">
                <CardContent className="p-4 md:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {s.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
                        <p className="text-[11px] text-muted-foreground">Turma: {s.classGroup} • {s.totalGrades} avaliações</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${avgColor}`}>{s.average}%</span>
                      <Badge variant={statusVariant[s.status] || "outline"}>{statusLabel[s.status] || s.status}</Badge>
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border p-3">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                      <ClipboardList className="h-3.5 w-3.5 text-primary" />
                      Resumo do Desempenho
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{parts.join(" ")}</p>
                  </div>

                  {(strengths.length > 0 || weaknesses.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {strengths.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-success uppercase">✅ Pontos Fortes</p>
                          {strengths.map(sub => (
                            <div key={sub.name} className="flex justify-between text-xs">
                              <span className="text-foreground">{sub.name}</span>
                              <span className="font-semibold text-success">{sub.average}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {weaknesses.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-destructive uppercase">⚠️ Áreas de Melhoria</p>
                          {weaknesses.map(sub => (
                            <div key={sub.name} className="flex justify-between text-xs">
                              <span className="text-foreground">{sub.name}</span>
                              <span className="font-semibold text-destructive">{sub.average}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Dashboard Insights Row */}
          <DashboardInsights
            students={studentFilter !== "all" ? filteredStudents : agg.studentMetrics}
            globalAverage={studentFilter !== "all" && filteredStudents.length > 0 ? filteredStudents[0].average : agg.globalAverage}
            averageFrequency={studentFilter !== "all" && filteredStudents.length > 0 ? filteredStudents[0].frequency : agg.averageFrequency}
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
      <StudentReportEditDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        students={studentFilter !== "all" ? filteredStudents : agg.studentMetrics}
      />
      <BatchDiagnosticExportDialog
        open={batchDiagnosticOpen}
        onOpenChange={setBatchDiagnosticOpen}
        companyId={profile?.company_id || ""}
        userId={profile?.id || ""}
        classGroups={agg.classGroups}
      />
    </div>
  );
}
