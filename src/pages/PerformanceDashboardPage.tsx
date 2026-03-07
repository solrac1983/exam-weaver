import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarChart3, GraduationCap, FileDown, Printer } from "lucide-react";
import { type GradeRow, aggregateGrades, buildTemporalData } from "@/lib/performanceMetrics";
import PerformanceKPIs from "@/components/performance/PerformanceKPIs";
import PerformanceCharts from "@/components/performance/PerformanceCharts";
import ClassRanking from "@/components/performance/ClassRanking";
import SubjectMatrix from "@/components/performance/SubjectMatrix";
import { handlePerformanceExport } from "@/components/performance/PerformanceExport";

export default function PerformanceDashboardPage() {
  const { profile } = useAuth();
  const [bimesterFilter, setBimesterFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  const { data: grades = [], isLoading: loading } = useQuery({
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

  // Single-pass aggregation for all metrics
  const agg = useMemo(
    () => aggregateGrades(grades, bimesterFilter, subjectFilter, classFilter),
    [grades, bimesterFilter, subjectFilter, classFilter]
  );

  // Temporal data (uses unfiltered grades + bimesters)
  const temporal = useMemo(
    () => buildTemporalData(grades, agg.bimesters),
    [grades, agg.bimesters]
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Painel de Desempenho
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada do desempenho acadêmico por turma e disciplina
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handlePerformanceExport("print", {
            bimesterFilter, globalAverage: agg.globalAverage, classMetrics: agg.classMetrics,
            totalStudents: agg.totalStudents, riskStudents: agg.riskStudents, subjectMetrics: agg.subjectMetrics,
          })}>
            <Printer className="h-4 w-4" />Imprimir
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handlePerformanceExport("pdf", {
            bimesterFilter, globalAverage: agg.globalAverage, classMetrics: agg.classMetrics,
            totalStudents: agg.totalStudents, riskStudents: agg.riskStudents, subjectMetrics: agg.subjectMetrics,
          })}>
            <FileDown className="h-4 w-4" />Exportar PDF
          </Button>
          <div className="space-y-1">
            <Label className="text-xs">Turma</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {agg.classGroups.map(cg => <SelectItem key={cg} value={cg}>{cg}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Disciplina</Label>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {agg.subjectOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bimestre</Label>
            <Select value={bimesterFilter} onValueChange={setBimesterFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {agg.bimesters.map(b => <SelectItem key={b} value={b}>{b}º Bimestre</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
          <PerformanceKPIs
            globalAverage={agg.globalAverage}
            classCount={agg.classMetrics.length}
            totalStudents={agg.totalStudents}
            riskStudents={agg.riskStudents}
          />
          <PerformanceCharts
            classMetrics={agg.classMetrics}
            subjectMetrics={agg.subjectMetrics}
            temporalData={temporal.data}
            temporalLines={temporal.lines}
          />
          <ClassRanking classMetrics={agg.classMetrics} />
          <SubjectMatrix subjectMetrics={agg.subjectMetrics} />
        </>
      )}
    </div>
  );
}
