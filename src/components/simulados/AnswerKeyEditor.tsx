import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Simulado, SimuladoSubject } from "@/hooks/useSimulados";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, Save, Loader2 } from "lucide-react";

interface Props {
  sim: Simulado;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function buildQuestionMap(subjects: SimuladoSubject[]) {
  const items: { qNum: number; subjectId: string; subjectName: string; localIndex: number }[] = [];
  let currentQ = 1;
  for (const s of subjects) {
    if (s.type === "discursiva") continue;
    for (let i = 0; i < s.question_count; i++) {
      items.push({ qNum: currentQ, subjectId: s.id, subjectName: s.subject_name, localIndex: i + 1 });
      currentQ++;
    }
  }
  return items;
}

function parseExistingKeys(subjects: SimuladoSubject[]): Record<number, string> {
  const result: Record<number, string> = {};
  let currentQ = 1;
  for (const s of subjects) {
    if (s.type === "discursiva") continue;
    if (s.answer_key?.trim()) {
      const pairs = s.answer_key.trim().split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
      let offset = 0;
      for (const pair of pairs) {
        const matchNum = pair.match(/^(\d+)\s*[-).:\s]+\s*([A-Ea-e])/);
        if (matchNum) {
          result[parseInt(matchNum[1])] = matchNum[2].toUpperCase();
        } else {
          const matchLetter = pair.match(/^([A-Ea-e])$/);
          if (matchLetter) {
            result[currentQ + offset] = matchLetter[1].toUpperCase();
            offset++;
          }
        }
      }
    }
    currentQ += s.question_count;
  }
  return result;
}

export default function AnswerKeyEditor({ sim, open, onOpenChange, onSaved }: Props) {
  const [alternatives, setAlternatives] = useState("5");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const questionMap = buildQuestionMap(sim.subjects);
  const totalQ = questionMap.length;
  const altCount = parseInt(alternatives);
  const letterOptions = "ABCDEFGHIJ".slice(0, altCount).split("");

  useEffect(() => {
    if (open) {
      setAnswers(parseExistingKeys(sim.subjects));
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
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Group answers by subject
      const subjectAnswers: Record<string, { qNum: number; letter: string }[]> = {};
      for (const item of questionMap) {
        if (!subjectAnswers[item.subjectId]) subjectAnswers[item.subjectId] = [];
        const ans = answers[item.qNum];
        if (ans) {
          subjectAnswers[item.subjectId].push({ qNum: item.qNum, letter: ans });
        }
      }

      // Update each subject's answer_key
      for (const s of sim.subjects) {
        if (s.type === "discursiva") continue;
        const subAns = subjectAnswers[s.id] || [];
        const keyStr = subAns.map(a => `${a.qNum}-${a.letter}`).join(", ");
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
  const subjectGroups: { name: string; questions: typeof questionMap }[] = [];
  let lastSubject = "";
  for (const item of questionMap) {
    if (item.subjectName !== lastSubject) {
      subjectGroups.push({ name: item.subjectName, questions: [] });
      lastSubject = item.subjectName;
    }
    subjectGroups[subjectGroups.length - 1].questions.push(item);
  }

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
          <div className="flex items-center justify-between">
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
              <div className="pt-4">
                <Badge variant="outline" className="text-xs">
                  {filledCount}/{totalQ} preenchidas
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Clique na letra para marcar/desmarcar</p>
          </div>

          {subjectGroups.map(group => (
            <div key={group.name}>
              <div className="bg-muted/50 px-3 py-1.5 rounded-md mb-2">
                <Label className="text-xs font-semibold uppercase tracking-wide">{group.name}</Label>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {group.questions.map(item => (
                  <div key={item.qNum} className="text-center">
                    <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                      {String(item.qNum).padStart(2, '0')}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {letterOptions.map(letter => (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => setAnswer(item.qNum, letter)}
                          className={`text-[10px] font-bold rounded h-5 w-full transition-colors ${
                            answers[item.qNum] === letter
                              ? "bg-primary text-primary-foreground"
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
