import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ResponsiveContainer, Cell } from "recharts";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, User, BookOpen, CalendarCheck, AlertTriangle, Target } from "lucide-react";
import { TablePageSkeleton } from "@/components/PageSkeleton";
import AIDiagnosticPanel from "@/components/student/AIDiagnosticPanel";

interface StudentGrade {
  id: string;
  subject_id: string | null;
  subject_name: string;
  bimester: string;
  score: number;
  max_score: number;
  evaluation_name: string;
  grade_type: string;
  created_at: string;
}

interface AttendanceRecord {
  date: string;
  status: string;
  subject_id: string | null;
}

interface SubjectInfo {
  id: string;
  name: string;
}

const BIMESTER_LABELS: Record<string, string> = {
  "1": "1º Bim",
  "2": "2º Bim",
  "3": "3º Bim",
  "4": "4º Bim",
};

const HEATMAP_COLORS = [
  "hsl(var(--destructive))",
  "hsl(24, 90%, 55%)",
  "hsl(45, 90%, 50%)",
  "hsl(90, 60%, 45%)",
  "hsl(142, 70%, 40%)",
];

function getHeatmapColor(percentage: number): string {
  if (percentage < 40) return HEATMAP_COLORS[0];
  if (percentage < 55) return HEATMAP_COLORS[1];
  if (percentage < 70) return HEATMAP_COLORS[2];
  if (percentage < 85) return HEATMAP_COLORS[3];
  return HEATMAP_COLORS[4];
}

function getTrend(values: number[]): "up" | "down" | "stable" {
  if (values.length < 2) return "stable";
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  if (last > prev + 0.3) return "up";
  if (last < prev - 0.3) return "down";
  return "stable";
}

export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [student, setStudent] = useState<{ id: string; name: string; class_group: string; roll_number: string } | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("all");

  const companyId = profile?.company_id || "";

  useEffect(() => {
    if (!studentId || !companyId) return;

    setLoading(true);
    Promise.all([
      supabase.from("students").select("id, name, class_group, roll_number").eq("id", studentId).single(),
      supabase.from("grades").select("id, subject_id, bimester, score, max_score, evaluation_name, grade_type, created_at, subjects(name)").eq("student_id", studentId).order("bimester"),
      supabase.from("attendance").select("date, status, subject_id").eq("student_id", studentId),
      supabase.from("subjects").select("id, name").eq("company_id", companyId).order("name"),
    ]).then(([stRes, grRes, atRes, subRes]) => {
      setStudent(stRes.data as any);
      setGrades((grRes.data || []).map((g: any) => ({
        ...g,
        subject_name: g.subjects?.name || "Sem disciplina",
      })));
      setAttendance(atRes.data || []);
      setSubjects(subRes.data || []);
      setLoading(false);
    });
  }, [studentId, companyId]);

  // Compute metrics
  const filteredGrades = useMemo(() => {
    if (selectedSubject === "all") return grades;
    return grades.filter(g => g.subject_id === selectedSubject);
  }, [grades, selectedSubject]);

  const overallAverage = useMemo(() => {
    if (!filteredGrades.length) return 0;
    const sum = filteredGrades.reduce((acc, g) => acc + (g.score / g.max_score) * 10, 0);
    return parseFloat((sum / filteredGrades.length).toFixed(1));
  }, [filteredGrades]);

  // Learning curve data (bimester evolution)
  const learningCurveData = useMemo(() => {
    const byBimester: Record<string, number[]> = {};
    filteredGrades.forEach(g => {
      if (!byBimester[g.bimester]) byBimester[g.bimester] = [];
      byBimester[g.bimester].push((g.score / g.max_score) * 10);
    });
    return ["1", "2", "3", "4"].map(b => ({
      bimester: BIMESTER_LABELS[b],
      media: byBimester[b]
        ? parseFloat((byBimester[b].reduce((a, v) => a + v, 0) / byBimester[b].length).toFixed(1))
        : null,
    }));
  }, [filteredGrades]);

  const trend = useMemo(() => {
    const values = learningCurveData.filter(d => d.media !== null).map(d => d.media!);
    return getTrend(values);
  }, [learningCurveData]);

  // Subject heatmap data
  const subjectHeatmap = useMemo(() => {
    const map: Record<string, Record<string, number[]>> = {};
    grades.forEach(g => {
      const subName = g.subject_name;
      if (!map[subName]) map[subName] = {};
      if (!map[subName][g.bimester]) map[subName][g.bimester] = [];
      map[subName][g.bimester].push((g.score / g.max_score) * 100);
    });

    return Object.entries(map).map(([subject, bimesters]) => {
      const cells: Record<string, number | null> = {};
      ["1", "2", "3", "4"].forEach(b => {
        cells[b] = bimesters[b]
          ? parseFloat((bimesters[b].reduce((a, v) => a + v, 0) / bimesters[b].length).toFixed(0))
          : null;
      });
      const allValues = Object.values(bimesters).flat();
      const avg = allValues.length
        ? parseFloat((allValues.reduce((a, v) => a + v, 0) / allValues.length).toFixed(0))
        : 0;
      return { subject, ...cells, average: avg };
    });
  }, [grades]);

  // Attendance summary
  const attendanceSummary = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === "present").length;
    const absent = attendance.filter(a => a.status === "absent").length;
    const justified = attendance.filter(a => a.status === "justified").length;
    const late = attendance.filter(a => a.status === "late").length;
    const rate = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 100;
    return { total, present, absent, justified, late, rate };
  }, [attendance]);

  // Weak subjects (below 60%)
  const weakSubjects = useMemo(() => {
    return subjectHeatmap.filter(s => s.average < 60).sort((a, b) => a.average - b.average);
  }, [subjectHeatmap]);

  // Projection: simple linear from existing bimester averages
  const projection = useMemo(() => {
    const values = learningCurveData.filter(d => d.media !== null).map(d => d.media!);
    if (values.length < 2) return null;
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, v) => a + v, 0) / n;
    let num = 0, den = 0;
    values.forEach((y, x) => {
      num += (x - xMean) * (y - yMean);
      den += (x - xMean) ** 2;
    });
    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    const projected = parseFloat((slope * 4 + intercept).toFixed(1)); // project to end of year
    return Math.max(0, Math.min(10, projected));
  }, [learningCurveData]);

  if (loading) return <TablePageSkeleton rows={6} />;
  if (!student) return <div className="py-20 text-center text-muted-foreground">Aluno não encontrado</div>;

  const chartConfig = {
    media: { label: "Média", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            {student.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Turma: {student.class_group} • Matrícula: {student.roll_number || "—"}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Filtrar por disciplina:</span>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as disciplinas</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground font-medium">Média Geral</p>
            <p className="text-3xl font-bold text-foreground">{overallAverage}</p>
            <div className="flex items-center gap-1 mt-1">
              {trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
              {trend === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
              {trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">
                {trend === "up" ? "Em alta" : trend === "down" ? "Em queda" : "Estável"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground font-medium">Frequência</p>
            <p className="text-3xl font-bold text-foreground">{attendanceSummary.rate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {attendanceSummary.present}P / {attendanceSummary.absent}F / {attendanceSummary.justified}J
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground font-medium">Projeção Final</p>
            <p className="text-3xl font-bold text-foreground">{projection !== null ? projection : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {projection !== null && projection < 6 ? "⚠️ Zona de risco" : projection !== null ? "✅ Dentro da meta" : "Dados insuficientes"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground font-medium">Avaliações</p>
            <p className="text-3xl font-bold text-foreground">{filteredGrades.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{subjectHeatmap.length} disciplina(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Learning Curve Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Curva de Aprendizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {learningCurveData.some(d => d.media !== null) ? (
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <LineChart data={learningCurveData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="bimester" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="media"
                  stroke="var(--color-media)"
                  strokeWidth={3}
                  dot={{ r: 6, fill: "var(--color-media)" }}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados de notas para exibir</p>
          )}
        </CardContent>
      </Card>

      {/* Subject Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Mapa de Calor por Disciplina
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subjectHeatmap.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Disciplina</th>
                    {["1", "2", "3", "4"].map(b => (
                      <th key={b} className="text-center py-2 px-3 font-medium text-muted-foreground">{BIMESTER_LABELS[b]}</th>
                    ))}
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectHeatmap.map(row => (
                    <tr key={row.subject} className="border-b last:border-0">
                      <td className="py-2 px-3 font-medium">{row.subject}</td>
                      {["1", "2", "3", "4"].map(b => {
                        const val = (row as any)[b] as number | null;
                        return (
                          <td key={b} className="py-2 px-3 text-center">
                            {val !== null ? (
                              <span
                                className="inline-block px-3 py-1 rounded-md text-xs font-bold"
                                style={{
                                  backgroundColor: getHeatmapColor(val),
                                  color: val < 55 ? "white" : val < 70 ? "#1a1a1a" : "white",
                                }}
                              >
                                {val}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-center">
                        <span
                          className="inline-block px-3 py-1 rounded-md text-xs font-bold"
                          style={{
                            backgroundColor: getHeatmapColor(row.average),
                            color: row.average < 55 ? "white" : row.average < 70 ? "#1a1a1a" : "white",
                          }}
                        >
                          {row.average}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados para o mapa de calor</p>
          )}
        </CardContent>
      </Card>

      {/* Attendance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Resumo de Frequência
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceSummary.total > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm w-24">Presença</span>
                <Progress value={attendanceSummary.rate} className="flex-1" />
                <span className="text-sm font-medium w-12 text-right">{attendanceSummary.rate}%</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center text-sm">
                <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/30">
                  <p className="font-bold text-green-700 dark:text-green-400">{attendanceSummary.present}</p>
                  <p className="text-xs text-muted-foreground">Presenças</p>
                </div>
                <div className="p-2 rounded-md bg-red-50 dark:bg-red-950/30">
                  <p className="font-bold text-red-700 dark:text-red-400">{attendanceSummary.absent}</p>
                  <p className="text-xs text-muted-foreground">Faltas</p>
                </div>
                <div className="p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30">
                  <p className="font-bold text-yellow-700 dark:text-yellow-400">{attendanceSummary.justified}</p>
                  <p className="text-xs text-muted-foreground">Justificadas</p>
                </div>
                <div className="p-2 rounded-md bg-orange-50 dark:bg-orange-950/30">
                  <p className="font-bold text-orange-700 dark:text-orange-400">{attendanceSummary.late}</p>
                  <p className="text-xs text-muted-foreground">Atrasos</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Sem registros de frequência</p>
          )}
        </CardContent>
      </Card>

      {/* Weak subjects - Action Plan */}
      {weakSubjects.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Plano de Ação — Disciplinas Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weakSubjects.map(s => (
                <div key={s.subject} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div>
                    <p className="font-medium text-sm">{s.subject}</p>
                    <p className="text-xs text-muted-foreground">Média: {s.average}% — Necessita atenção imediata</p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {s.average < 40 ? "Crítico" : "Atenção"}
                  </Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                💡 Recomendação: Reforço direcionado nas disciplinas acima, com exercícios adaptativos e acompanhamento semanal.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Diagnostic */}
      <AIDiagnosticPanel
        studentId={student.id}
        companyId={companyId}
        studentName={student.name}
        classGroup={student.class_group}
        rollNumber={student.roll_number}
        grades={grades.map(g => ({
          subject_name: g.subject_name,
          bimester: g.bimester,
          score: g.score,
          max_score: g.max_score,
        }))}
        attendanceSummary={attendanceSummary}
        subjects={subjects.map(s => s.name)}
      />
    </div>
  );
}
