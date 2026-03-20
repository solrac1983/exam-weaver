import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Simulado, SimuladoSubject } from "@/hooks/useSimulados";
import { supabase } from "@/integrations/supabase/client";
import { extractAnswerKeysFromContent } from "./SimuladoPDFGenerator";
import { ClipboardList, Save, Loader2, CheckCircle2, AlertCircle, Pencil, RotateCcw } from "lucide-react";

interface Props {
  sim: Simulado;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface QuestionItem {
  qNum: number;
  subjectId: string;
  subjectName: string;
  localIndex: number;
  autoFilled: boolean;
}

function buildQuestionMap(subjects: SimuladoSubject[]): QuestionItem[] {
  const items: QuestionItem[] = [];
  let currentQ = 1;
  for (const s of subjects) {
    if (s.type === "discursiva") continue;
    const hasAutoKey = s.status === "approved" && !!s.answer_key?.trim();
    for (let i = 0; i < s.question_count; i++) {
      items.push({
        qNum: currentQ,
        subjectId: s.id,
        subjectName: s.subject_name,
        localIndex: i + 1,
        autoFilled: hasAutoKey,
      });
      currentQ++;
    }
  }
  return items;
}

function parseSubjectAnswerKey(subject: SimuladoSubject, startQ: number): Record<number, string> {
  const result: Record<number, string> = {};
  if (!subject.answer_key?.trim()) return result;

  const pairs = subject.answer_key.trim().split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
  let offset = 0;

  for (const pair of pairs) {
    // Try "1-A" or "1) A" format
    const matchNum = pair.match(/^(\d+)\s*[-).:\s]+\s*([A-Ea-e])/);
    if (matchNum) {
      // Use the local question number relative to the subject
      const localNum = parseInt(matchNum[1]);
      result[startQ + localNum - 1] = matchNum[2].toUpperCase();
    } else {
      // Try just "A" format (sequential)
      const matchLetter = pair.match(/^([A-Ea-e])$/);
      if (matchLetter) {
        result[startQ + offset] = matchLetter[1].toUpperCase();
        offset++;
      }
    }
  }
  return result;
}

function parseAllKeys(subjects: SimuladoSubject[]): Record<number, string> {
  const result: Record<number, string> = {};
  let currentQ = 1;
  for (const s of subjects) {
    if (s.type === "discursiva") continue;
    const subKeys = parseSubjectAnswerKey(s, currentQ);
    Object.assign(result, subKeys);
    currentQ += s.question_count;
  }
  return result;
}

export default function AnswerKeyEditor({ sim, open, onOpenChange, onSaved }: Props) {
  const [alternatives, setAlternatives] = useState("5");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [manualOverrides, setManualOverrides] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const questionMap = useMemo(() => buildQuestionMap(sim.subjects), [sim.subjects]);
  const totalQ = questionMap.length;
  const altCount = parseInt(alternatives);
  const letterOptions = "ABCDEFGHIJ".slice(0, altCount).split("");

  // Count auto-filled vs manual
  const autoFilledCount = useMemo(() => {
    return questionMap.filter(q => q.autoFilled && answers[q.qNum] && !manualOverrides.has(q.qNum)).length;
  }, [questionMap, answers, manualOverrides]);

  useEffect(() => {
    if (open) {
      // Use enhanced extraction that checks both answer_key field and content HTML
      const contentAnswers = extractAnswerKeysFromContent(sim.subjects);
      const parsed = parseAllKeys(sim.subjects);
      // Merge: content extraction fills gaps
      const merged: Record<number, string> = {};
      for (const [k, v] of contentAnswers) merged[k] = v;
      Object.assign(merged, parsed); // parsed (from answer_key field) takes priority
      setAnswers(merged);
      setManualOverrides(new Set());
    }
  }, [open, sim.subjects]);

  const setAnswer = (qNum: number, letter: string) => {
    setAnswers(prev => {
      if (prev[qNum] === letter) {
        const next = { ...prev };
        delete next[qNum];
        return next;
      }
      return { ...prev, [qNum]: letter };
    });
    setManualOverrides(prev => {
      const next = new Set(prev);
      next.add(qNum);
      return next;
    });
  };

  const resetToAuto = () => {
    const contentAnswers = extractAnswerKeysFromContent(sim.subjects);
    const parsed = parseAllKeys(sim.subjects);
    const merged: Record<number, string> = {};
    for (const [k, v] of contentAnswers) merged[k] = v;
    Object.assign(merged, parsed);
    setAnswers(merged);
    setManualOverrides(new Set());
    toast({ title: "Gabarito restaurado com dados automáticos." });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Group answers by subject
      const subjectAnswers: Record<string, { localIndex: number; letter: string }[]> = {};
      for (const item of questionMap) {
        if (!subjectAnswers[item.subjectId]) subjectAnswers[item.subjectId] = [];
        const ans = answers[item.qNum];
        if (ans) {
          subjectAnswers[item.subjectId].push({ localIndex: item.localIndex, letter: ans });
        }
      }

      // Update each subject's answer_key
      for (const s of sim.subjects) {
        if (s.type === "discursiva") continue;
        const subAns = subjectAnswers[s.id] || [];
        const keyStr = subAns.map(a => `${a.localIndex}-${a.letter}`).join(", ");
        await (supabase as any)
          .from("simulado_subjects")
          .update({ answer_key: keyStr, updated_at: new Date().toISOString() })
          .eq("id", s.id);
      }

      toast({ title: `Gabarito salvo com ${Object.keys(answers).length} respostas!` });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar gabarito.", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filledCount = Object.keys(answers).length;

  // Group questions by subject for display
  const subjectGroups = useMemo(() => {
    const groups: { name: string; status: string; questions: QuestionItem[] }[] = [];
    let lastSubject = "";
    for (const item of questionMap) {
      if (item.subjectName !== lastSubject) {
        const sub = sim.subjects.find(s => s.subject_name === item.subjectName);
        groups.push({ name: item.subjectName, status: sub?.status || "pending", questions: [] });
        lastSubject = item.subjectName;
      }
      groups[groups.length - 1].questions.push(item);
    }
    return groups;
  }, [questionMap, sim.subjects]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Gabarito — {sim.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info banner */}
          <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
              O gabarito é preenchido automaticamente quando o professor envia e o administrador aprova a disciplina.
            </p>
            <p className="flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5 text-primary shrink-0" />
              Você pode editar manualmente qualquer resposta clicando na alternativa.
            </p>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Alternativas</Label>
                <Select value={alternatives} onValueChange={setAlternatives}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 (A-C)</SelectItem>
                    <SelectItem value="4">4 (A-D)</SelectItem>
                    <SelectItem value="5">5 (A-E)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {filledCount}/{totalQ} preenchidas
                </Badge>
                {autoFilledCount > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {autoFilledCount} automáticas
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={resetToAuto}>
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar automático
            </Button>
          </div>

          {subjectGroups.map(group => (
            <div key={group.name}>
              <div className="bg-muted/50 px-3 py-1.5 rounded-md mb-2 flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide">{group.name}</Label>
                {group.status === "approved" ? (
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" /> Aprovada - Gabarito automático
                  </Badge>
                ) : group.status === "submitted" ? (
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" /> Aguardando aprovação
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Pendente
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {group.questions.map(item => (
                  <div key={item.qNum} className="text-center">
                    <span className="text-[9px] font-bold text-muted-foreground block mb-0.5 leading-tight">
                      Q{item.qNum}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {letterOptions.map(letter => (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => setAnswer(item.qNum, letter)}
                          className={`text-[10px] font-bold rounded h-5 w-full transition-colors ${
                            answers[item.qNum] === letter
                              ? item.autoFilled && !manualOverrides.has(item.qNum)
                                ? "bg-green-600 text-white"
                                : "bg-primary text-primary-foreground"
                              : "bg-muted/30 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Gabarito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
