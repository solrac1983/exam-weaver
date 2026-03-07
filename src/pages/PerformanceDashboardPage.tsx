import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  BarChart3, TrendingUp, TrendingDown, Users, BookOpen,
  AlertTriangle, Trophy, Target, GraduationCap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend,
  Cell,
} from "recharts";

interface GradeRow {
  score: number;
  max_score: number;
  class_group: string;
  bimester: string;
  subject_id: string | null;
  student_id: string;
  subjects?: { name: string } | null;
}

interface ClassMetrics {
  name: string;
  average: number;
  totalGrades: number;
  studentsCount: number;
  below60Pct: number;
  above80Pct: number;
}

interface SubjectMetrics {
  id: string;
  name: string;
  average: number;
  totalGrades: number;
  classBreakdown: { className: string; average: number }[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(262 80% 50%)",
  "hsl(190 80% 45%)",
  "hsl(340 75% 55%)",
];

export default function PerformanceDashboardPage() {
  const { profile } = useAuth();
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bimesterFilter, setBimesterFilter] = useState("all");
  const [classGroups, setClassGroups] = useState<string[]>([]);

  useEffect(() => {
    if (!profile?.company_id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("grades")
        .select("score, max_score, class_group, bimester, subject_id, student_id, subjects(name)")
        .eq("company_id", profile.company_id)
        .limit(1000);
      if (data) {
        setGrades(data as unknown as GradeRow[]);
        const groups = [...new Set((data as any[]).map(g => g.class_group))].filter(Boolean).sort();
        setClassGroups(groups);
      }
      setLoading(false);
    };
    load();
  }, [profile?.company_id]);

  const filtered = useMemo(() => {
    if (bimesterFilter === "all") return grades;
    return grades.filter(g => g.bimester === bimesterFilter);
  }, [grades, bimesterFilter]);

  const classMetrics = useMemo((): ClassMetrics[] => {
    const map: Record<string, { scores: number[]; students: Set<string> }> = {};
    for (const g of filtered) {
      if (!g.class_group) continue;
      if (!map[g.class_group]) map[g.class_group] = { scores: [], students: new Set() };
      const pct = (g.score / g.max_score) * 100;
      map[g.class_group].scores.push(pct);
      map[g.class_group].students.add(g.student_id);
    }
    return Object.entries(map).map(([name, d]) => {
      const avg = d.scores.reduce((a, b) => a + b, 0) / d.scores.length;
      return {
        name,
        average: Math.round(avg * 10) / 10,
        totalGrades: d.scores.length,
        studentsCount: d.students.size,
        below60Pct: Math.round((d.scores.filter(s => s < 60).length / d.scores.length) * 100),
        above80Pct: Math.round((d.scores.filter(s => s > 80).length / d.scores.length) * 100),
      };
    }).sort((a, b) => b.average - a.average);
  }, [filtered]);

  const subjectMetrics = useMemo((): SubjectMetrics[] => {
    const map: Record<string, { name: string; scores: number[]; byClass: Record<string, number[]> }> = {};
    for (const g of filtered) {
      const sid = g.subject_id || "geral";
      const sname = (g.subjects as any)?.name || "Geral";
      if (!map[sid]) map[sid] = { name: sname, scores: [], byClass: {} };
      const pct = (g.score / g.max_score) * 100;
      map[sid].scores.push(pct);
      if (g.class_group) {
        if (!map[sid].byClass[g.class_group]) map[sid].byClass[g.class_group] = [];
        map[sid].byClass[g.class_group].push(pct);
      }
    }
    return Object.entries(map).map(([id, d]) => ({
      id,
      name: d.name,
      average: Math.round((d.scores.reduce((a, b) => a + b, 0) / d.scores.length) * 10) / 10,
      totalGrades: d.scores.length,
      classBreakdown: Object.entries(d.byClass).map(([cn, scores]) => ({
        className: cn,
        average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      })).sort((a, b) => b.average - a.average),
    })).sort((a, b) => a.average - b.average);
  }, [filtered]);

  const globalAverage = useMemo(() => {
    if (filtered.length === 0) return 0;
    const avg = filtered.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / filtered.length;
    return Math.round(avg * 10) / 10;
  }, [filtered]);

  const totalStudents = useMemo(() => new Set(filtered.map(g => g.student_id)).size, [filtered]);
  const riskStudents = useMemo(() => {
    const studentAvg: Record<string, number[]> = {};
    for (const g of filtered) {
      if (!studentAvg[g.student_id]) studentAvg[g.student_id] = [];
      studentAvg[g.student_id].push((g.score / g.max_score) * 100);
    }
    return Object.values(studentAvg).filter(scores => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return avg < 50;
    }).length;
  }, [filtered]);

  const radarData = useMemo(() => {
    return subjectMetrics.slice(0, 8).map(s => ({
      subject: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
      average: s.average,
      fullMark: 100,
    }));
  }, [subjectMetrics]);

  const bimesters = useMemo(() => [...new Set(grades.map(g => g.bimester))].sort(), [grades]);

  const temporalData = useMemo(() => {
    if (bimesters.length < 2) return [];
    const classNames = [...new Set(grades.map(g => g.class_group).filter(Boolean))].sort();
    return bimesters.map(bim => {
      const row: Record<string, any> = { bimester: `${bim}º Bim` };
      // Global average for this bimester
      const allScores = grades.filter(g => g.bimester === bim);
      if (allScores.length > 0) {
        row["Geral"] = Math.round((allScores.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / allScores.length) * 10) / 10;
      }
      // Per class
      for (const cn of classNames) {
        const scores = grades.filter(g => g.bimester === bim && g.class_group === cn);
        if (scores.length > 0) {
          row[cn] = Math.round((scores.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / scores.length) * 10) / 10;
        }
      }
      return row;
    });
  }, [grades, bimesters]);

  const temporalLines = useMemo(() => {
    if (temporalData.length === 0) return [];
    const keys = Object.keys(temporalData[0]).filter(k => k !== "bimester");
    return keys;
  }, [temporalData]);

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

  const noData = grades.length === 0;

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
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Bimestre</Label>
            <Select value={bimesterFilter} onValueChange={setBimesterFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {bimesters.map(b => (
                  <SelectItem key={b} value={b}>{b}º Bimestre</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {noData ? (
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Média Geral</p>
                    <p className={`text-3xl font-bold mt-1 ${globalAverage >= 70 ? "text-success" : globalAverage >= 50 ? "text-warning" : "text-destructive"}`}>
                      {globalAverage}%
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Target className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Turmas</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{classMetrics.length}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-info/10 text-info">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Alunos</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{totalStudents}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-success/10 text-success">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Em Risco</p>
                    <p className="text-3xl font-bold text-destructive mt-1">{riskStudents}</p>
                    <p className="text-[10px] text-muted-foreground">média &lt; 50%</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar Chart - Class comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Média por Turma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={classMetrics} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`${value}%`, "Média"]}
                    />
                    <Bar dataKey="average" radius={[6, 6, 0, 0]}>
                      {classMetrics.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar - Subject comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Desempenho por Disciplina
                </CardTitle>
              </CardHeader>
              <CardContent>
                {radarData.length > 2 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                      <Radar dataKey="average" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                    Necessário 3+ disciplinas para o gráfico radar
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Class Rankings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-warning" />
                Ranking de Turmas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {classMetrics.map((cm, i) => (
                  <div key={cm.name} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <div className={`flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold ${
                      i === 0 ? "bg-warning/15 text-warning" :
                      i === 1 ? "bg-muted text-muted-foreground" :
                      i === 2 ? "bg-amber-900/15 text-amber-700" :
                      "bg-muted/50 text-muted-foreground"
                    }`}>
                      {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}º`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">{cm.name}</span>
                        <span className="text-[10px] text-muted-foreground">{cm.studentsCount} alunos · {cm.totalGrades} notas</span>
                        {cm.average >= 70 && (
                          <Badge className="bg-success/10 text-success text-[10px] px-1.5 py-0">
                            <TrendingUp className="h-2.5 w-2.5 mr-0.5" />Acima
                          </Badge>
                        )}
                        {cm.average < 50 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            <TrendingDown className="h-2.5 w-2.5 mr-0.5" />Crítico
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={cm.average} className="flex-1 h-2" />
                        <span className={`text-sm font-bold w-14 text-right ${
                          cm.average >= 70 ? "text-success" : cm.average >= 50 ? "text-warning" : "text-destructive"
                        }`}>
                          {cm.average}%
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                        <span>🔴 Abaixo de 60%: <strong>{cm.below60Pct}%</strong></span>
                        <span>🟢 Acima de 80%: <strong>{cm.above80Pct}%</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Subject x Class Matrix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-info" />
                Disciplinas — Detalhamento por Turma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subjectMetrics.map(sm => (
                  <div key={sm.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{sm.name}</span>
                        <span className="text-[10px] text-muted-foreground">{sm.totalGrades} notas</span>
                      </div>
                      <span className={`text-sm font-bold ${
                        sm.average >= 70 ? "text-success" : sm.average >= 50 ? "text-warning" : "text-destructive"
                      }`}>
                        {sm.average}%
                      </span>
                    </div>
                    {sm.classBreakdown.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {sm.classBreakdown.map(cb => (
                          <div key={cb.className} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                            <span className="text-xs text-muted-foreground truncate flex-1">{cb.className}</span>
                            <span className={`text-xs font-bold ${
                              cb.average >= 70 ? "text-success" : cb.average >= 50 ? "text-warning" : "text-destructive"
                            }`}>
                              {cb.average}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
