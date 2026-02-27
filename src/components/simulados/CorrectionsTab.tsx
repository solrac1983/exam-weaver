import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Simulado, SimuladoSubject } from "@/hooks/useSimulados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trophy, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class_group: string;
}

interface SimuladoResult {
  id: string;
  simulado_id: string;
  student_id: string;
  answers: Record<string, string>;
  score: number;
  correct_count: number;
  wrong_count: number;
  total_questions: number;
  student_name?: string;
  student_roll?: string;
}

function parseAnswerKey(subjects: SimuladoSubject[]): Record<number, string> {
  const key: Record<number, string> = {};
  let currentQ = 1;
  for (const s of subjects) {
    if (s.type === "discursiva") continue;
    if (!s.answer_key?.trim()) {
      currentQ += s.question_count;
      continue;
    }
    // Parse formats: "1-A, 2-B, 3-C" or "A, B, C, D" or "1)A 2)B"
    const raw = s.answer_key.trim();
    // Try "1-A" format
    const pairs = raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    let offset = 0;
    for (const pair of pairs) {
      const matchNum = pair.match(/^(\d+)\s*[-).:\s]+\s*([A-Ea-e])/);
      if (matchNum) {
        const qNum = parseInt(matchNum[1]);
        key[qNum] = matchNum[2].toUpperCase();
      } else {
        // Just a letter
        const matchLetter = pair.match(/^([A-Ea-e])$/);
        if (matchLetter) {
          key[currentQ + offset] = matchLetter[1].toUpperCase();
          offset++;
        }
      }
    }
    if (offset === 0) {
      // Numbered format was used
      currentQ += s.question_count;
    } else {
      currentQ += s.question_count;
    }
  }
  return key;
}

interface Props {
  simulados: Simulado[];
}

export default function CorrectionsTab({ simulados }: Props) {
  const { profile } = useAuth();
  const [selectedSimId, setSelectedSimId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<SimuladoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [manualAnswers, setManualAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const selectedSim = simulados.find(s => s.id === selectedSimId);
  const answerKey = selectedSim ? parseAnswerKey(selectedSim.subjects) : {};
  const totalQ = selectedSim
    ? selectedSim.subjects.filter(s => s.type !== "discursiva").reduce((sum, s) => sum + s.question_count, 0)
    : 0;

  const fetchStudents = useCallback(async () => {
    if (!profile?.company_id) return;
    const { data } = await (supabase as any)
      .from("students")
      .select("id, name, roll_number, class_group")
      .eq("company_id", profile.company_id)
      .order("name");
    setStudents(data || []);
  }, [profile?.company_id]);

  const fetchResults = useCallback(async () => {
    if (!selectedSimId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("simulado_results")
      .select("*")
      .eq("simulado_id", selectedSimId)
      .order("score", { ascending: false });

    const enriched: SimuladoResult[] = (data || []).map((r: any) => {
      const student = students.find(s => s.id === r.student_id);
      return {
        ...r,
        answers: r.answers || {},
        student_name: student?.name || "Aluno desconhecido",
        student_roll: student?.roll_number || "",
      };
    });
    setResults(enriched);
    setLoading(false);
  }, [selectedSimId, students]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { if (selectedSimId && students.length > 0) fetchResults(); }, [selectedSimId, students, fetchResults]);

  const openAddResult = () => {
    setSelectedStudentId("");
    setManualAnswers({});
    setAddDialogOpen(true);
  };

  const gradeAndSave = async () => {
    if (!selectedStudentId || !selectedSimId) {
      toast({ title: "Selecione um aluno.", variant: "destructive" });
      return;
    }

    let correct = 0;
    let wrong = 0;
    for (let q = 1; q <= totalQ; q++) {
      const studentAnswer = manualAnswers[String(q)]?.toUpperCase();
      const correctAnswer = answerKey[q];
      if (!studentAnswer) continue;
      if (correctAnswer && studentAnswer === correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    }
    const score = totalQ > 0 ? Math.round((correct / totalQ) * 1000) / 10 : 0;

    setSaving(true);
    const { error } = await (supabase as any)
      .from("simulado_results")
      .upsert({
        simulado_id: selectedSimId,
        student_id: selectedStudentId,
        answers: manualAnswers,
        score,
        correct_count: correct,
        wrong_count: wrong,
        total_questions: totalQ,
        updated_at: new Date().toISOString(),
      }, { onConflict: "simulado_id,student_id" });

    if (error) {
      toast({ title: "Erro ao salvar resultado.", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Resultado salvo! Nota: ${score}%` });
      setAddDialogOpen(false);
      fetchResults();
    }
    setSaving(false);
  };

  const deleteResult = async (id: string) => {
    await (supabase as any).from("simulado_results").delete().eq("id", id);
    toast({ title: "Resultado removido." });
    fetchResults();
  };

  // Build question ranges for display
  const questionSubjects: { num: number; subject: string }[] = [];
  if (selectedSim) {
    let q = 1;
    for (const s of selectedSim.subjects) {
      if (s.type === "discursiva") continue;
      for (let i = 0; i < s.question_count; i++) {
        questionSubjects.push({ num: q, subject: s.subject_name });
        q++;
      }
    }
  }

  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length * 10) / 10
    : 0;
  const maxScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 0;
  const minScore = results.length > 0 ? Math.min(...results.map(r => r.score)) : 0;

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="space-y-1 min-w-[300px]">
          <Label className="text-xs text-muted-foreground">Selecione o simulado</Label>
          <Select value={selectedSimId} onValueChange={setSelectedSimId}>
            <SelectTrigger><SelectValue placeholder="Escolha um simulado" /></SelectTrigger>
            <SelectContent>
              {simulados.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSimId && (
          <Button onClick={openAddResult} className="gap-2 mt-5">
            <UserPlus className="h-4 w-4" /> Lançar Resultado
          </Button>
        )}
      </div>

      {!selectedSimId && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Selecione um simulado para ver ou lançar correções.</p>
        </div>
      )}

      {selectedSimId && !loading && (
        <>
          {/* Stats */}
          {results.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Alunos</p>
                <p className="text-2xl font-bold text-foreground">{results.length}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Média</p>
                <p className="text-2xl font-bold text-primary">{avgScore}%</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Maior Nota</p>
                <p className="text-2xl font-bold text-green-600">{maxScore}%</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Menor Nota</p>
                <p className="text-2xl font-bold text-red-600">{minScore}%</p>
              </Card>
            </div>
          )}

          {/* Ranking table */}
          {results.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" /> Classificação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                        <th className="px-4 py-2 text-center w-12">#</th>
                        <th className="px-4 py-2 text-left">Aluno</th>
                        <th className="px-4 py-2 text-center">Nº</th>
                        <th className="px-4 py-2 text-center">Acertos</th>
                        <th className="px-4 py-2 text-center">Erros</th>
                        <th className="px-4 py-2 text-center">Nota</th>
                        <th className="px-4 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={r.id} className="border-b last:border-b-0 border-border hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 text-center font-bold">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                          </td>
                          <td className="px-4 py-2.5 font-medium">{r.student_name}</td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">{r.student_roll || "—"}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> {r.correct_count}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              <XCircle className="h-3 w-3 mr-1" /> {r.wrong_count}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`font-bold text-lg ${r.score >= 70 ? "text-green-600" : r.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                              {r.score}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteResult(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Nenhum resultado lançado para este simulado.</p>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Manual entry dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Lançar Resultado — Entrada Manual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Aluno</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} {s.roll_number ? `(Nº ${s.roll_number})` : ""} — {s.class_group || "S/T"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Separator />

            <div>
              <Label className="text-sm font-semibold mb-2 block">
                Respostas ({totalQ} questões) — Gabarito: {Object.keys(answerKey).length > 0 ? "✓ Disponível" : "⚠ Não cadastrado"}
              </Label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {questionSubjects.map(({ num, subject }) => (
                  <div key={num} className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground block text-center" title={subject}>{num}</Label>
                    <Input
                      className="text-center h-8 text-xs uppercase px-1"
                      maxLength={1}
                      value={manualAnswers[String(num)] || ""}
                      onChange={(e) => setManualAnswers(prev => ({ ...prev, [String(num)]: e.target.value.toUpperCase() }))}
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={gradeAndSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Corrigir e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
