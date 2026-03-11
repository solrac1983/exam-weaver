import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            Gabarito da Prova
          </SheetTitle>
          <SheetDescription className="text-xs">
            Preencha as respostas corretas. O gabarito será inserido ao final da prova.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Alternativas</Label>
                <Select value={altCount} onValueChange={setAltCount}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
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
            <div className="flex items-center gap-1.5 mt-5">
              <Button variant="outline" size="sm" className="gap-1 text-xs h-7 px-2" onClick={addQuestion}>
                <Plus className="h-3 w-3" /> Questão
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2 text-destructive" onClick={removeLastQuestion} disabled={entries.length <= 1}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
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

          <p className="text-[11px] text-muted-foreground">
            Para questões discursivas, deixe em branco.
          </p>
        </div>

        <SheetFooter className="px-5 py-3 border-t border-border gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleInsert} className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Inserir Gabarito
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
