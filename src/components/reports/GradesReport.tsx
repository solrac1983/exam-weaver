import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell,
  LineChart, Line, Tooltip,
} from "recharts";
import {
  Trophy, Medal, Eye, FileDown, Printer, TrendingUp, TrendingDown, Minus,
  Users, BookOpen, CalendarCheck, AlertTriangle, GraduationCap,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AnimatedStat, ReportActions, EmptyReport } from "./ReportShared";
import { CHART_COLORS } from "./reportUtils";
import { buildPrintHTML } from "./reportUtils";
import { toast } from "sonner";

interface GradeRow {
  id: string;
  student_id: string;
  student_name: string;
  subject_id: string | null;
  subject_name: string;
  bimester: string;
  score: number;
  max_score: number;
  class_group: string;
}

interface AttendanceRow {
  student_id: string;
  student_name: string;
  status: string;
  class_group: string;
}

interface StudentRanking {
  id: string;
  name: string;
  classGroup: string;
  average: number;
  gradeCount: number;
  attendanceRate: number;
  presentCount: number;
  totalAttendance: number;
  trend: "up" | "down" | "stable";
}

const BIMESTER_LABELS: Record<string, string> = {
  "1": "1º Bim", "2": "2º Bim", "3": "3º Bim", "4": "4º Bim",
};

export default function GradesReport() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id || "";
  const contentRef = useRef<HTMLDivElement>(null);

  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [classGroups, setClassGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedBimester, setSelectedBimester] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    Promise.all([
      supabase.from("grades").select("id, student_id, subject_id, bimester, score, max_score, class_group, students!inner(name), subjects(name)")
        .eq("company_id", companyId).order("created_at", { ascending: false }).limit(1000),
      supabase.from("attendance").select("student_id, status, class_group, students!inner(name)")
        .eq("company_id", companyId).limit(1000),
      supabase.from("class_groups").select("id, name").eq("company_id", companyId).order("name"),
    ]).then(([grRes, atRes, cgRes]) => {
      setGrades((grRes.data || []).map((g: any) => ({
        ...g,
        student_name: g.students?.name || "",
        subject_name: g.subjects?.name || "Sem disciplina",
      })));
      setAttendance((atRes.data || []).map((a: any) => ({
        ...a,
        student_name: a.students?.name || "",
      })));
      setClassGroups(cgRes.data || []);
      setLoading(false);
    });
  }, [companyId]);

  // Filter data
  const filteredGrades = useMemo(() => {
    let data = grades;
    if (selectedClass !== "all") data = data.filter(g => g.class_group === selectedClass);
    if (selectedBimester !== "all") data = data.filter(g => g.bimester === selectedBimester);
    return data;
  }, [grades, selectedClass, selectedBimester]);

  const filteredAttendance = useMemo(() => {
    if (selectedClass === "all") return attendance;
    return attendance.filter(a => a.class_group === selectedClass);
  }, [attendance, selectedClass]);

  // Student rankings
  const rankings = useMemo((): StudentRanking[] => {
    const studentMap = new Map<string, { name: string; classGroup: string; scores: number[]; bimesterAvgs: Record<string, number[]> }>();
    
    filteredGrades.forEach(g => {
      if (!studentMap.has(g.student_id)) {
        studentMap.set(g.student_id, { name: g.student_name, classGroup: g.class_group, scores: [], bimesterAvgs: {} });
      }
      const entry = studentMap.get(g.student_id)!;
      const normalized = (g.score / g.max_score) * 10;
      entry.scores.push(normalized);
      if (!entry.bimesterAvgs[g.bimester]) entry.bimesterAvgs[g.bimester] = [];
      entry.bimesterAvgs[g.bimester].push(normalized);
    });

    const result: StudentRanking[] = [];
    studentMap.forEach((data, id) => {
      const average = data.scores.length > 0
        ? parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1))
        : 0;

      // Trend from bimester averages
      const bimAvgs = ["1", "2", "3", "4"]
        .map(b => data.bimesterAvgs[b] ? data.bimesterAvgs[b].reduce((a, v) => a + v, 0) / data.bimesterAvgs[b].length : null)
        .filter(v => v !== null) as number[];
      let trend: "up" | "down" | "stable" = "stable";
      if (bimAvgs.length >= 2) {
        const diff = bimAvgs[bimAvgs.length - 1] - bimAvgs[bimAvgs.length - 2];
        trend = diff > 0.3 ? "up" : diff < -0.3 ? "down" : "stable";
      }

      // Attendance
      const studentAtt = filteredAttendance.filter(a => a.student_id === id);
      const totalAtt = studentAtt.length;
      const presentAtt = studentAtt.filter(a => a.status === "present" || a.status === "late").length;
      const attRate = totalAtt > 0 ? parseFloat(((presentAtt / totalAtt) * 100).toFixed(1)) : 100;

      result.push({
        id, name: data.name, classGroup: data.classGroup, average,
        gradeCount: data.scores.length, attendanceRate: attRate,
        presentCount: presentAtt, totalAttendance: totalAtt, trend,
      });
    });

    result.sort((a, b) => b.average - a.average);
    return result;
  }, [filteredGrades, filteredAttendance]);

  // Subject performance
  const subjectPerformance = useMemo(() => {
    const map = new Map<string, { scores: number[]; name: string }>();
    filteredGrades.forEach(g => {
      const key = g.subject_name;
      if (!map.has(key)) map.set(key, { scores: [], name: key });
      map.get(key)!.scores.push((g.score / g.max_score) * 10);
    });
    return Array.from(map.values()).map(s => ({
      name: s.name,
      media: parseFloat((s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(1)),
      count: s.scores.length,
    })).sort((a, b) => b.media - a.media);
  }, [filteredGrades]);

  // Bimester evolution
  const bimesterEvolution = useMemo(() => {
    const map: Record<string, number[]> = {};
    grades.forEach(g => {
      if (selectedClass !== "all" && g.class_group !== selectedClass) return;
      if (!map[g.bimester]) map[g.bimester] = [];
      map[g.bimester].push((g.score / g.max_score) * 10);
    });
    return ["1", "2", "3", "4"].map(b => ({
      bimester: BIMESTER_LABELS[b],
      media: map[b] ? parseFloat((map[b].reduce((a, v) => a + v, 0) / map[b].length).toFixed(1)) : null,
    }));
  }, [grades, selectedClass]);

  // Summary stats
  const stats = useMemo(() => {
    const totalStudents = rankings.length;
    const globalAvg = totalStudents > 0
      ? parseFloat((rankings.reduce((a, r) => a + r.average, 0) / totalStudents).toFixed(1))
      : 0;
    const belowAvg = rankings.filter(r => r.average < 6).length;
    const avgAttendance = totalStudents > 0
      ? parseFloat((rankings.reduce((a, r) => a + r.attendanceRate, 0) / totalStudents).toFixed(1))
      : 0;
    return { totalStudents, globalAvg, belowAvg, avgAttendance };
  }, [rankings]);

  // Print boletim
  const handlePrintBoletim = (student: StudentRanking) => {
    const studentGrades = grades.filter(g => g.student_id === student.id);
    const subjectMap = new Map<string, Record<string, number[]>>();
    studentGrades.forEach(g => {
      if (!subjectMap.has(g.subject_name)) subjectMap.set(g.subject_name, {});
      const bims = subjectMap.get(g.subject_name)!;
      if (!bims[g.bimester]) bims[g.bimester] = [];
      bims[g.bimester].push((g.score / g.max_score) * 10);
    });

    const rows = Array.from(subjectMap.entries()).map(([name, bims]) => {
      const cells = ["1", "2", "3", "4"].map(b =>
        bims[b] ? (bims[b].reduce((a, v) => a + v, 0) / bims[b].length).toFixed(1) : "—"
      );
      const all = Object.values(bims).flat();
      const avg = all.length > 0 ? (all.reduce((a, v) => a + v, 0) / all.length).toFixed(1) : "—";
      return `<tr><td>${name}</td>${cells.map(c => `<td style="text-align:center">${c}</td>`).join("")}<td style="text-align:center;font-weight:bold">${avg}</td></tr>`;
    }).join("");

    const studentAtt = attendance.filter(a => a.student_id === student.id);
    const totalAtt = studentAtt.length;
    const presentAtt = studentAtt.filter(a => a.status === "present" || a.status === "late").length;
    const attRate = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : "100";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Boletim - ${student.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 32px; color: #1a1a2e; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin: 16px 0 8px; }
  .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
  .info { font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
  th { background: #f4f4f5; font-weight: 600; }
  .footer { margin-top: 24px; font-size: 11px; color: #999; }
  @media print { body { padding: 16px; } }
</style>
</head><body>
<h1>Boletim Escolar</h1>
<p class="subtitle">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
<div class="info">
  <strong>Aluno:</strong> ${student.name}<br/>
  <strong>Turma:</strong> ${student.classGroup}<br/>
  <strong>Média Geral:</strong> ${student.average}<br/>
  <strong>Frequência:</strong> ${attRate}% (${presentAtt}/${totalAtt} aulas)
</div>
<h2>Notas por Disciplina</h2>
<table>
  <thead><tr><th>Disciplina</th><th style="text-align:center">1º Bim</th><th style="text-align:center">2º Bim</th><th style="text-align:center">3º Bim</th><th style="text-align:center">4º Bim</th><th style="text-align:center">Média</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<p class="footer">Documento gerado automaticamente pelo sistema SmartTest.</p>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) { toast.error("Popup bloqueado. Permita popups."); return; }
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  };

  if (!companyId) return <EmptyReport message="Nenhuma empresa vinculada." />;
  if (loading) return <div className="py-12 text-center text-muted-foreground">Carregando dados de desempenho...</div>;
  if (grades.length === 0 && attendance.length === 0) return <EmptyReport message="Nenhuma nota ou registro de frequência encontrado." />;

  const chartConfig = { media: { label: "Média", color: "hsl(var(--primary))" } };
  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Desempenho Acadêmico</h2>
        <ReportActions title="Relatório — Desempenho Acadêmico" contentRef={contentRef} />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classGroups.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedBimester} onValueChange={setSelectedBimester}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Bimestre" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {["1", "2", "3", "4"].map(b => <SelectItem key={b} value={b}>{b}º Bimestre</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnimatedStat label="Alunos" value={stats.totalStudents} icon={Users} />
        <AnimatedStat label="Média Geral" value={stats.globalAvg} icon={GraduationCap} color="text-primary" />
        <AnimatedStat label="Abaixo da Média" value={stats.belowAvg} icon={AlertTriangle} color="text-destructive" subtitle="média < 6.0" />
        <AnimatedStat label="Frequência Média" value={stats.avgAttendance} icon={CalendarCheck} color="text-success" subtitle="%" />
      </div>

      {/* Bimester Evolution + Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Evolução por Bimestre</CardTitle></CardHeader>
          <CardContent>
            {bimesterEvolution.some(d => d.media !== null) ? (
              <ChartContainer config={chartConfig} className="h-[240px] w-full">
                <LineChart data={bimesterEvolution} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="bimester" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="media" stroke="var(--color-media)" strokeWidth={3} dot={{ r: 5 }} connectNulls />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Média por Disciplina</CardTitle></CardHeader>
          <CardContent>
            {subjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={subjectPerformance} layout="vertical" barCategoryGap="12%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="media" radius={[0, 6, 6, 0]}>
                    {subjectPerformance.map((s, i) => (
                      <Cell key={i} fill={s.media < 6 ? "hsl(var(--destructive))" : CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />Ranking da Turma
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rankings.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Média</TableHead>
                    <TableHead>Tendência</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Avaliações</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-bold">
                        {i < 3 ? (
                          <Medal className={`h-5 w-5 ${medalColors[i]}`} />
                        ) : (
                          <span className="text-muted-foreground">{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><Badge variant="outline">{r.classGroup}</Badge></TableCell>
                      <TableCell>
                        <span className={`font-bold ${r.average >= 7 ? "text-green-600 dark:text-green-400" : r.average >= 6 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                          {r.average}
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {r.trend === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
                        {r.trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={r.attendanceRate} className="flex-1 h-2" />
                          <span className="text-xs text-muted-foreground w-10 text-right">{r.attendanceRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.gradeCount}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/aluno/${r.id}`)} title="Ver perfil">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrintBoletim(r)} title="Imprimir boletim">
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno com notas registradas</p>
          )}
        </CardContent>
      </Card>

      {/* Printable content */}
      <div ref={contentRef} className="hidden">
        <div className="stat-row" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div className="stat-box"><div className="label">Alunos</div><div className="value">{stats.totalStudents}</div></div>
          <div className="stat-box"><div className="label">Média Geral</div><div className="value">{stats.globalAvg}</div></div>
          <div className="stat-box"><div className="label">Abaixo da Média</div><div className="value">{stats.belowAvg}</div></div>
          <div className="stat-box"><div className="label">Frequência Média</div><div className="value">{stats.avgAttendance}%</div></div>
        </div>
        <h3>Ranking</h3>
        <table>
          <thead><tr><th>#</th><th>Aluno</th><th>Turma</th><th>Média</th><th>Frequência</th></tr></thead>
          <tbody>
            {rankings.map((r, i) => (
              <tr key={r.id}><td>{i + 1}</td><td>{r.name}</td><td>{r.classGroup}</td><td>{r.average}</td><td>{r.attendanceRate}%</td></tr>
            ))}
          </tbody>
        </table>
        <h3 style={{ marginTop: 16 }}>Médias por Disciplina</h3>
        <table>
          <thead><tr><th>Disciplina</th><th>Média</th><th>Avaliações</th></tr></thead>
          <tbody>
            {subjectPerformance.map(s => (
              <tr key={s.name}><td>{s.name}</td><td>{s.media}</td><td>{s.count}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
