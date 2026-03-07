import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Brain, Loader2, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, BarChart3, Sparkles, Target,
} from "lucide-react";
import { toast } from "sonner";

interface SubjectAnalysis {
  subjectId: string;
  subjectName: string;
  average: number;
  totalGrades: number;
  below60Pct: number;
  above80Pct: number;
  weakArea: boolean;
  strongArea: boolean;
}

interface AnalysisResult {
  hasData: boolean;
  classAverage: number;
  totalGrades: number;
  recommendation: { facil: number; media: number; dificil: number };
  strategy: string;
  subjectAnalysis: SubjectAnalysis[];
  weakSubjects: string[];
  strongSubjects: string[];
  message?: string;
}

interface AdaptiveExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (config: {
    difficulty: string;
    customInstructions: string;
    distribution: { facil: number; media: number; dificil: number };
  }) => void;
}

export default function AdaptiveExamDialog({ open, onOpenChange, onApply }: AdaptiveExamDialogProps) {
  const { profile } = useAuth();
  const [classGroups, setClassGroups] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [distribution, setDistribution] = useState({ facil: 30, media: 40, dificil: 30 });

  useEffect(() => {
    if (!open || !profile?.company_id) return;
    Promise.all([
      supabase.from("class_groups").select("id, name").eq("company_id", profile.company_id).order("name"),
      supabase.from("subjects").select("id, name").eq("company_id", profile.company_id).order("name"),
    ]).then(([cgRes, subRes]) => {
      setClassGroups(cgRes.data || []);
      setSubjects(subRes.data || []);
    });
  }, [open, profile?.company_id]);

  const handleAnalyze = async () => {
    if (!selectedClass) {
      toast.error("Selecione uma turma.");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("adaptive-analysis", {
        body: {
          companyId: profile?.company_id,
          classGroup: selectedClass,
          subjectId: selectedSubject !== "all" ? selectedSubject : null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data);
      if (data.recommendation) {
        setDistribution(data.recommendation);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao analisar turma.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const weakTopics = analysis?.weakSubjects?.length
      ? `\nFOCO ESPECIAL nos tópicos com baixo desempenho: ${analysis.weakSubjects.join(", ")}.`
      : "";
    const strongTopics = analysis?.strongSubjects?.length
      ? `\nPara os tópicos de alto desempenho (${analysis.strongSubjects.join(", ")}), crie questões mais desafiadoras que exijam análise e síntese.`
      : "";

    const instructions = `PROVA ADAPTATIVA — Baseada no desempenho da turma (média: ${analysis?.classAverage || 0}%).
Distribuição de dificuldade: ${distribution.facil}% fácil, ${distribution.media}% média, ${distribution.dificil}% difícil.
${analysis?.strategy || ""}${weakTopics}${strongTopics}
Ajuste a complexidade dos enunciados e distratores de acordo com o nível recomendado.`;

    onApply({
      difficulty: "todas",
      customInstructions: instructions,
      distribution,
    });
    onOpenChange(false);
  };

  const adjustDistribution = (key: "facil" | "media" | "dificil", value: number) => {
    const remaining = 100 - value;
    const otherKeys = (["facil", "media", "dificil"] as const).filter(k => k !== key);
    const otherTotal = otherKeys.reduce((s, k) => s + distribution[k], 0);
    const newDist = { ...distribution, [key]: value };
    if (otherTotal > 0) {
      for (const k of otherKeys) {
        newDist[k] = Math.round((distribution[k] / otherTotal) * remaining);
      }
    } else {
      newDist[otherKeys[0]] = Math.round(remaining / 2);
      newDist[otherKeys[1]] = remaining - newDist[otherKeys[0]];
    }
    setDistribution(newDist);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Prova Adaptativa — Análise de Desempenho
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Turma *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                <SelectContent>
                  {classGroups.map(cg => (
                    <SelectItem key={cg.id} value={cg.name}>{cg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Disciplina (opcional)</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={loading || !selectedClass} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {loading ? "Analisando..." : "Analisar Desempenho da Turma"}
          </Button>

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4 animate-fade-in">
              {!analysis.hasData ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>{analysis.message || "Sem dados disponíveis."}</p>
                    <p className="text-xs mt-1">A distribuição padrão será utilizada.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Média da Turma</p>
                        <p className={`text-2xl font-bold ${analysis.classAverage >= 70 ? "text-green-600" : analysis.classAverage >= 50 ? "text-amber-600" : "text-destructive"}`}>
                          {analysis.classAverage}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Notas Analisadas</p>
                        <p className="text-2xl font-bold text-foreground">{analysis.totalGrades}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Disciplinas</p>
                        <p className="text-2xl font-bold text-foreground">{analysis.subjectAnalysis.length}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Strategy */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-primary mb-1">Estratégia Recomendada</p>
                          <p className="text-sm text-muted-foreground">{analysis.strategy}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Subject breakdown */}
                  {analysis.subjectAnalysis.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Desempenho por Disciplina</Label>
                      <div className="space-y-1.5">
                        {analysis.subjectAnalysis.map(s => (
                          <div key={s.subjectId} className="flex items-center gap-3 p-2 rounded-md border bg-card">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{s.subjectName}</span>
                                {s.weakArea && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    <TrendingDown className="h-2.5 w-2.5 mr-0.5" />Fraco
                                  </Badge>
                                )}
                                {s.strongArea && (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5 py-0">
                                    <TrendingUp className="h-2.5 w-2.5 mr-0.5" />Forte
                                  </Badge>
                                )}
                              </div>
                              <Progress value={s.average} className="h-1.5 mt-1" />
                            </div>
                            <span className={`text-sm font-bold w-12 text-right ${s.average >= 70 ? "text-green-600" : s.average >= 50 ? "text-amber-600" : "text-destructive"}`}>
                              {s.average}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Difficulty Distribution */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">Distribuição de Dificuldade (ajustável)</Label>
                    {(["facil", "media", "dificil"] as const).map(key => {
                      const labels = { facil: "Fácil", media: "Média", dificil: "Difícil" };
                      const colors = { facil: "text-green-600", media: "text-amber-600", dificil: "text-destructive" };
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className={`text-sm font-medium w-16 ${colors[key]}`}>{labels[key]}</span>
                          <Slider
                            value={[distribution[key]]}
                            onValueChange={([v]) => adjustDistribution(key, v)}
                            max={100}
                            min={0}
                            step={5}
                            className="flex-1"
                          />
                          <span className="text-sm font-bold w-10 text-right">{distribution[key]}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Alerts */}
                  {analysis.weakSubjects.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-destructive">Áreas críticas detectadas</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {analysis.weakSubjects.join(", ")} — Questões focadas serão priorizadas nestes tópicos.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApply} disabled={!analysis} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Aplicar e Gerar Questões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
