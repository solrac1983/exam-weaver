import { useState, useEffect, useCallback, useRef } from "react";
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
import { Loader2, UserPlus, Trophy, CheckCircle2, XCircle, Trash2, Camera, Upload, Users } from "lucide-react";
import BatchCorrectionDialog from "./BatchCorrectionDialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

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
    const raw = s.answer_key.trim();
    const pairs = raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    let offset = 0;
    for (const pair of pairs) {
      const matchNum = pair.match(/^(\d+)\s*[-).:\s]+\s*([A-Ea-e])/);
      if (matchNum) {
        const qNum = parseInt(matchNum[1]);
        key[qNum] = matchNum[2].toUpperCase();
      } else {
        const matchLetter = pair.match(/^([A-Ea-e])$/);
        if (matchLetter) {
          key[currentQ + offset] = matchLetter[1].toUpperCase();
          offset++;
        }
      }
    }
    currentQ += s.question_count;
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
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [manualAnswers, setManualAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiCorrectionPreview, setAiCorrectionPreview] = useState<{ correct: number; wrong: number; blank: number; score: number } | null>(null);

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
    setAiCorrectionPreview(null);
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
    const { data: resultData, error } = await (supabase as any)
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
      }, { onConflict: "simulado_id,student_id" })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Erro ao salvar resultado.", description: error.message, variant: "destructive" });
    } else {
      // Sync with grades table
      const student = students.find(s => s.id === selectedStudentId);
      if (profile?.company_id && resultData?.id) {
        await (supabase as any).from("grades").upsert({
          student_id: selectedStudentId,
          company_id: profile.company_id,
          subject_id: null,
          class_group: student?.class_group || "",
          grade_type: "simulado",
          bimester: "1",
          score: score / 10,
          max_score: 10,
          evaluation_name: selectedSim?.title || "Simulado",
          simulado_result_id: resultData.id,
          recorded_by: profile.id,
        }, { onConflict: "simulado_result_id" }).then(({ error: gradeErr }: any) => {
          if (gradeErr) console.error("Erro ao sincronizar nota do simulado:", gradeErr);
        });
      }
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

  // AI photo reading
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione uma imagem.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Imagem muito grande (máx 10MB).", variant: "destructive" });
      return;
    }

    setAiProcessing(true);
    setAiProgress(20);

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      setAiProgress(40);

      const { data, error } = await supabase.functions.invoke("read-answer-sheet", {
        body: {
          image_base64: base64,
          total_questions: totalQ,
          alternatives_count: 5,
        },
      });

      setAiProgress(80);

      if (error) {
        throw new Error(error.message || "Erro ao processar imagem");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.answers) {
        const answers: Record<string, string> = {};
        const rawAnswers = data.answers || {};
        for (const [k, v] of Object.entries(rawAnswers)) {
          const val = String(v).toUpperCase();
          if (val !== "X") {
            answers[k] = val;
          }
        }
        setManualAnswers(answers);
        
        // Auto-select student by roll_number
        if (data.roll_number && !selectedStudentId) {
          const rollNum = String(data.roll_number).replace(/_+$/, "");
          const matched = students.find(s => s.roll_number === rollNum);
          if (matched) {
            setSelectedStudentId(matched.id);
            toast({ title: `Aluno identificado: ${matched.name} (Nº ${matched.roll_number})` });
          }
        }
        
        // Auto-grade preview
        let correct = 0, wrong = 0, blank = 0;
        for (let q = 1; q <= totalQ; q++) {
          const studentAns = answers[String(q)];
          const correctAns = answerKey[q];
          if (!studentAns) { blank++; continue; }
          if (correctAns && studentAns === correctAns) correct++;
          else wrong++;
        }
        const previewScore = totalQ > 0 ? Math.round((correct / totalQ) * 1000) / 10 : 0;
        setAiCorrectionPreview({ correct, wrong, blank, score: previewScore });

        const filledCount = Object.keys(answers).length;
        toast({ 
          title: `✅ IA leu ${filledCount} de ${totalQ} respostas!`,
          description: `Pré-correção: ${correct} acertos, ${wrong} erros. Revise antes de salvar.`,
        });
      }

      setAiProgress(100);
    } catch (err: any) {
      console.error("AI read error:", err);
      toast({ 
        title: "Erro na leitura por IA", 
        description: err.message || "Tente novamente com uma foto mais nítida.",
        variant: "destructive" 
      });
    } finally {
      setAiProcessing(false);
      setAiProgress(0);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
          <div className="flex gap-2 mt-5">
            <Button onClick={openAddResult} className="gap-2">
              <UserPlus className="h-4 w-4" /> Lançar Resultado
            </Button>
            <Button onClick={() => setBatchDialogOpen(true)} variant="outline" className="gap-2">
              <Users className="h-4 w-4" /> Correção em Lote
            </Button>
          </div>
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
              <UserPlus className="h-5 w-5 text-primary" /> Lançar Resultado
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

            {/* AI Photo Upload Section */}
            <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Camera className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-sm">Correção por IA</p>
                    <p className="text-xs text-muted-foreground">Envie uma foto da folha de respostas preenchida</p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={aiProcessing}
                />

                {aiProcessing ? (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processando imagem com IA...</span>
                    </div>
                    <Progress value={aiProgress} className="h-2" />
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" /> Tirar Foto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.removeAttribute("capture");
                          fileInputRef.current.click();
                          // Restore capture for next time
                          setTimeout(() => fileInputRef.current?.setAttribute("capture", "environment"), 100);
                        }
                      }}
                    >
                      <Upload className="h-4 w-4" /> Enviar Imagem
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Correction Preview Summary */}
            {aiCorrectionPreview && Object.keys(answerKey).length > 0 && (
              <Card className="border-primary/40 bg-primary/5">
                <CardContent className="p-4">
                  <p className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Resultado da Correção Automática
                  </p>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{aiCorrectionPreview.score}%</p>
                      <p className="text-[10px] text-muted-foreground">Nota</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{aiCorrectionPreview.correct}</p>
                      <p className="text-[10px] text-muted-foreground">Acertos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{aiCorrectionPreview.wrong}</p>
                      <p className="text-[10px] text-muted-foreground">Erros</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-muted-foreground">{aiCorrectionPreview.blank}</p>
                      <p className="text-[10px] text-muted-foreground">Em branco</p>
                    </div>
                  </div>
                  <Progress value={aiCorrectionPreview.score} className="h-2 mt-3" />
                  <p className="text-[10px] text-muted-foreground mt-2">Revise as respostas abaixo. Verde = acerto, Vermelho = erro em relação ao gabarito.</p>
                </CardContent>
              </Card>
            )}

            <Separator />
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                Respostas ({totalQ} questões) — Gabarito: {Object.keys(answerKey).length > 0 ? "✓ Disponível" : "⚠ Não cadastrado"}
              </Label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {questionSubjects.map(({ num, subject }) => {
                  const studentAns = manualAnswers[String(num)]?.toUpperCase();
                  const correctAns = answerKey[num];
                  const isCorrect = studentAns && correctAns && studentAns === correctAns;
                  const isWrong = studentAns && correctAns && studentAns !== correctAns;
                  
                    return (
                      <div key={num} className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground block text-center" title={subject}>{num}</Label>
                        <Input
                          className={`text-center h-8 text-xs uppercase px-1 ${
                            isCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/20" : 
                            isWrong ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""
                          }`}
                          maxLength={1}
                          value={manualAnswers[String(num)] || ""}
                          onChange={(e) => setManualAnswers(prev => ({ ...prev, [String(num)]: e.target.value.toUpperCase() }))}
                          placeholder="—"
                          title={correctAns ? `Gabarito: ${correctAns}` : "Sem gabarito"}
                        />
                        {isWrong && correctAns && (
                          <p className="text-[9px] text-center text-green-600 font-bold">{correctAns}</p>
                        )}
                      </div>
                    );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={gradeAndSave} disabled={saving || aiProcessing} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Corrigir e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch correction dialog */}
      <BatchCorrectionDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        simuladoId={selectedSimId}
        simuladoTitle={selectedSim?.title}
        totalQuestions={totalQ}
        answerKey={answerKey}
        students={students}
        onSaved={fetchResults}
      />
    </div>
  );
}
