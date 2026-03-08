import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Minus,
  CheckCircle2, XCircle, Target, Users, Loader2, Sparkles,
  ShieldAlert, ShieldCheck, Shield, CalendarDays, Lightbulb,
  BookOpen, Heart, Clock, Zap, RefreshCw, Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PersonalizedSuggestions {
  weeklyRoutine: { day: string; subject: string; activity: string; duration: string }[];
  studyTips: { tip: string; category: string }[];
  practicalActivities: { subject: string; activity: string; objective: string; frequency: string }[];
  motivationalNote: string;
}

interface DiagnosticData {
  summary: string;
  riskLevel: "baixo" | "moderado" | "alto" | "critico";
  strengths: { subject: string; detail: string }[];
  weaknesses: { subject: string; detail: string; severity: string }[];
  projections: { subject: string; currentAvg: number; projectedFinal: number; trend: string }[];
  actionPlan: { action: string; priority: string; target: string }[];
  attendanceAlert: string;
  recommendations: string;
  personalizedSuggestions?: PersonalizedSuggestions;
}

interface AIDiagnosticPanelProps {
  studentName: string;
  classGroup?: string;
  rollNumber?: string;
  grades: { subject_name: string; bimester: string; score: number; max_score: number }[];
  attendanceSummary: { total: number; present: number; absent: number; justified: number; late: number; rate: number };
  subjects: string[];
}

const RISK_CONFIG = {
  baixo: { color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300", icon: ShieldCheck, label: "Risco Baixo" },
  moderado: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300", icon: Shield, label: "Risco Moderado" },
  alto: { color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300", icon: ShieldAlert, label: "Risco Alto" },
  critico: { color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", icon: AlertTriangle, label: "Risco Crítico" },
};

const PRIORITY_COLORS: Record<string, string> = {
  alta: "destructive",
  media: "secondary",
  baixa: "outline",
};

const TREND_ICON = {
  melhora: <TrendingUp className="h-4 w-4 text-green-500" />,
  estavel: <Minus className="h-4 w-4 text-muted-foreground" />,
  piora: <TrendingDown className="h-4 w-4 text-destructive" />,
};

const TIP_CATEGORY_CONFIG: Record<string, { icon: typeof Lightbulb; label: string; color: string }> = {
  organizacao: { icon: CalendarDays, label: "Organização", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  tecnica: { icon: Zap, label: "Técnica", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
  motivacao: { icon: Heart, label: "Motivação", color: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300" },
  recuperacao: { icon: RefreshCw, label: "Recuperação", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
};

const DAY_COLORS: Record<string, string> = {
  "Segunda": "bg-blue-500",
  "Terça": "bg-emerald-500",
  "Quarta": "bg-violet-500",
  "Quinta": "bg-amber-500",
  "Sexta": "bg-rose-500",
  "Sábado": "bg-cyan-500",
  "Domingo": "bg-slate-500",
};

export default function AIDiagnosticPanel({ studentName, grades, attendanceSummary, subjects }: AIDiagnosticPanelProps) {
  const [diagnostic, setDiagnostic] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (grades.length === 0) {
      toast({ title: "Sem dados suficientes", description: "É necessário ter notas registradas para gerar o diagnóstico.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("student-diagnostic", {
        body: {
          studentName,
          grades: grades.map(g => ({
            subject: g.subject_name,
            bimester: g.bimester,
            score: g.score,
            maxScore: g.max_score,
            percentage: Math.round((g.score / g.max_score) * 100),
          })),
          attendance: attendanceSummary,
          subjects,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDiagnostic(data);
      toast({ title: "Diagnóstico gerado com sucesso!" });
    } catch (err: any) {
      console.error("Diagnostic error:", err);
      toast({
        title: "Erro ao gerar diagnóstico",
        description: err.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!diagnostic) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-8 flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-lg font-bold text-foreground">Diagnóstico Pedagógico com IA</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Análise inteligente com sugestões personalizadas de rotina de estudos, atividades práticas e dicas adaptadas ao perfil do aluno.
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analisando..." : "Gerar Diagnóstico"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const risk = RISK_CONFIG[diagnostic.riskLevel];
  const RiskIcon = risk.icon;
  const suggestions = diagnostic.personalizedSuggestions;

  return (
    <div className="space-y-4">
      {/* Header + Risk */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Diagnóstico IA — {studentName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={risk.color}>
                <RiskIcon className="h-3 w-3 mr-1" />
                {risk.label}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{diagnostic.summary}</p>
          {diagnostic.attendanceAlert && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{diagnostic.attendanceAlert}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" /> Pontos Fortes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {diagnostic.strengths.length > 0 ? diagnostic.strengths.map((s, i) => (
              <div key={i} className="p-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/30">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">{s.subject}</p>
                <p className="text-xs text-muted-foreground">{s.detail}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">Nenhum ponto forte identificado</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" /> Pontos Fracos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {diagnostic.weaknesses.length > 0 ? diagnostic.weaknesses.map((w, i) => (
              <div key={i} className="p-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">{w.subject}</p>
                  <Badge variant={w.severity === "grave" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                    {w.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{w.detail}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">Nenhum ponto fraco identificado</p>}
          </CardContent>
        </Card>
      </div>

      {/* Projections */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Projeções de Notas Finais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {diagnostic.projections.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm font-medium w-32 truncate">{p.subject}</span>
                <div className="flex-1">
                  <Progress value={p.projectedFinal * 10} className="h-2" />
                </div>
                <div className="flex items-center gap-2 w-28 justify-end">
                  <span className="text-xs text-muted-foreground">{p.currentAvg.toFixed(1)} →</span>
                  <span className={`text-sm font-bold ${p.projectedFinal < 6 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                    {p.projectedFinal.toFixed(1)}
                  </span>
                  {TREND_ICON[p.trend as keyof typeof TREND_ICON] || TREND_ICON.estavel}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Plan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Plano de Ação Personalizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {diagnostic.actionPlan.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg border bg-card">
                <Badge variant={PRIORITY_COLORS[a.priority] as any || "secondary"} className="text-[10px] mt-0.5 shrink-0">
                  {a.priority}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{a.action}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">{a.target}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Personalized Suggestions */}
      {suggestions && (
        <>
          {/* Motivational Note */}
          {suggestions.motivationalNote && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="pt-5 pb-4 flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10 shrink-0">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Mensagem para {studentName}</p>
                  <p className="text-sm text-muted-foreground italic">"{suggestions.motivationalNote}"</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Routine */}
          {suggestions.weeklyRoutine && suggestions.weeklyRoutine.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" /> Rotina Semanal de Estudos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {suggestions.weeklyRoutine.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                      <div className={`w-2 h-10 rounded-full shrink-0 ${DAY_COLORS[r.day] || "bg-primary"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{r.day}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{r.subject}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.activity}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">{r.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Study Tips */}
          {suggestions.studyTips && suggestions.studyTips.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" /> Dicas de Estudo Personalizadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-2">
                  {suggestions.studyTips.map((t, i) => {
                    const cfg = TIP_CATEGORY_CONFIG[t.category] || TIP_CATEGORY_CONFIG.tecnica;
                    const TipIcon = cfg.icon;
                    return (
                      <div key={i} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-1.5">
                          <TipIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <Badge className={`${cfg.color} text-[10px] px-1.5 py-0`}>{cfg.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{t.tip}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Practical Activities */}
          {suggestions.practicalActivities && suggestions.practicalActivities.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Atividades Práticas por Disciplina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestions.practicalActivities.map((a, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground">{a.subject}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{a.frequency}</Badge>
                      </div>
                      <p className="text-sm text-foreground">{a.activity}</p>
                      <p className="text-xs text-muted-foreground mt-1">🎯 {a.objective}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Recommendations */}
      {diagnostic.recommendations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Recomendações para Pais e Professores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{diagnostic.recommendations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}