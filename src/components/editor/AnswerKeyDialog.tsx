import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { generateAnswerKeyHTML, type AnswerKeyEntry } from "@/lib/examQuestionUtils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertAnswerKey: (html: string) => void;
  examTitle: string;
  questionCount: number;
}

export function AnswerKeyDialog({ open, onOpenChange, onInsertAnswerKey, examTitle, questionCount }: Props) {
  const [altCount, setAltCount] = useState("5");
  const [entries, setEntries] = useState<AnswerKeyEntry[]>(() =>
    Array.from({ length: Math.max(questionCount, 1) }, (_, i) => ({
      questionNum: i + 1,
      answer: "",
    }))
  );

  // Reset when opened with new question count
  const resetEntries = (count: number) => {
    setEntries(
      Array.from({ length: Math.max(count, 1) }, (_, i) => ({
        questionNum: i + 1,
        answer: "",
      }))
    );
  };

  const letterOptions = "ABCDEFGHIJ".slice(0, parseInt(altCount)).split("");
  const filledCount = entries.filter((e) => e.answer.trim()).length;

  const setAnswer = (idx: number, letter: string) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === idx ? { ...e, answer: e.answer === letter ? "" : letter } : e
      )
    );
  };

  const addQuestion = () => {
    setEntries((prev) => [
      ...prev,
      { questionNum: prev.length + 1, answer: "" },
    ]);
  };

  const removeLastQuestion = () => {
    if (entries.length > 1) {
      setEntries((prev) => prev.slice(0, -1));
    }
  };

  const handleInsert = () => {
    const filled = entries.filter((e) => e.answer.trim());
    if (filled.length === 0) {
      toast.error("Preencha ao menos uma resposta.");
      return;
    }
    const html = generateAnswerKeyHTML(filled, examTitle);
    onInsertAnswerKey(html);
    toast.success(`Gabarito com ${filled.length} respostas inserido ao final da prova!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Gabarito da Prova
          </DialogTitle>
          <DialogDescription>
            Preencha as respostas corretas de cada questão. Uma folha de gabarito será inserida ao final da prova.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Alternativas</Label>
                <Select value={altCount} onValueChange={setAltCount}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 (A-C)</SelectItem>
                    <SelectItem value="4">4 (A-D)</SelectItem>
                    <SelectItem value="5">5 (A-E)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="mt-5 text-xs">
                {filledCount}/{entries.length} preenchidas
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addQuestion}>
                <Plus className="h-3.5 w-3.5" /> Questão
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive" onClick={removeLastQuestion} disabled={entries.length <= 1}>
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {entries.map((entry, idx) => (
              <div key={idx} className="text-center">
                <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                  {String(entry.questionNum).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-0.5">
                  {letterOptions.map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setAnswer(idx, letter)}
                      className={`text-[10px] font-bold rounded h-5 w-full transition-colors ${
                        entry.answer === letter
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

          {/* Discursive answers */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Para questões discursivas, digite a resposta no campo correspondente acima ou deixe em branco.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleInsert} className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Inserir Gabarito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
