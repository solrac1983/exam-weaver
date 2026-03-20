import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Trash2, X, Wand2, Printer, FileDown } from "lucide-react";
import { generateAnswerKeyHTML, type AnswerKeyEntry } from "@/lib/examQuestionUtils";
import { toast } from "sonner";

interface AIAnswer {
  questionNum: number;
  answer: string;
}

export interface SubjectSection {
  name: string;
  questionCount: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertAnswerKey: (html: string) => void;
  examTitle: string;
  questionCount: number;
  aiAnswers?: AIAnswer[];
  subjectSections?: SubjectSection[];
}

export function AnswerKeyDialog({ open, onOpenChange, onInsertAnswerKey, examTitle, questionCount, aiAnswers, subjectSections }: Props) {
  const [altCount, setAltCount] = useState("5");
  const [entries, setEntries] = useState<AnswerKeyEntry[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Sync entries when dialog opens or questionCount changes
  useEffect(() => {
    if (!open) return;
    const count = Math.max(questionCount, 1);
    setEntries(prev => {
      if (prev.length === count) {
        // If AI answers, fill them in
        if (aiAnswers && aiAnswers.length > 0) {
          return Array.from({ length: count }, (_, i) => {
            const ai = aiAnswers.find(a => a.questionNum === i + 1);
            return { questionNum: i + 1, answer: ai?.answer?.toUpperCase() || prev[i]?.answer || "" };
          });
        }
        return prev;
      }
      return Array.from({ length: count }, (_, i) => ({
        questionNum: i + 1,
        answer: aiAnswers?.find(a => a.questionNum === i + 1)?.answer?.toUpperCase() || "",
      }));
    });
  }, [open, questionCount]);

  const autoFillFromAI = () => {
    if (!aiAnswers || aiAnswers.length === 0) return;
    const count = Math.max(questionCount, 1);
    const newEntries = Array.from({ length: count }, (_, i) => {
      const ai = aiAnswers.find((a) => a.questionNum === i + 1);
      return { questionNum: i + 1, answer: ai?.answer?.toUpperCase() || "" };
    });
    setEntries(newEntries);
    toast.success(`Gabarito preenchido automaticamente com ${aiAnswers.length} respostas da IA.`);
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
    setEntries((prev) => [...prev, { questionNum: prev.length + 1, answer: "" }]);
  };

  const removeLastQuestion = () => {
    if (entries.length > 1) setEntries((prev) => prev.slice(0, -1));
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

  const buildPrintHTML = () => {
    const filled = entries.filter((e) => e.answer.trim());
    if (filled.length === 0) {
      toast.error("Preencha ao menos uma resposta.");
      return null;
    }

    let tableRows = "";
    let currentQ = 0;

    if (subjectSections && subjectSections.length > 0) {
      for (const section of subjectSections) {
        tableRows += `<tr><td colspan="2" style="padding:6px 12px;background:#f0f4ff;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#4a5568;border:1px solid #ddd;">${section.name}</td></tr>`;
        for (let i = 0; i < section.questionCount; i++) {
          const entry = entries[currentQ];
          if (entry && entry.answer.trim()) {
            tableRows += `<tr><td style="text-align:center;padding:4px 16px;border:1px solid #ddd;font-weight:bold;">Questão ${entry.questionNum}</td><td style="text-align:center;padding:4px 16px;border:1px solid #ddd;font-weight:bold;text-transform:uppercase;">${entry.answer}</td></tr>`;
          }
          currentQ++;
        }
      }
      while (currentQ < entries.length) {
        const entry = entries[currentQ];
        if (entry && entry.answer.trim()) {
          tableRows += `<tr><td style="text-align:center;padding:4px 16px;border:1px solid #ddd;font-weight:bold;">Questão ${entry.questionNum}</td><td style="text-align:center;padding:4px 16px;border:1px solid #ddd;font-weight:bold;text-transform:uppercase;">${entry.answer}</td></tr>`;
        }
        currentQ++;
      }
    } else {
      for (const entry of entries) {
        if (entry.answer.trim()) {
          tableRows += `<tr><td style="text-align:center;padding:4px 16px;border:1px solid #ddd;font-weight:bold;">Questão ${entry.questionNum}</td><td style="text-align:center;padding:4px 16px;border:1px solid #ddd;font-weight:bold;text-transform:uppercase;">${entry.answer}</td></tr>`;
        }
      }
    }

    return `<!DOCTYPE html><html><head><title>Gabarito - ${examTitle}</title><style>body{font-family:Arial,sans-serif;padding:40px}table{border-collapse:collapse;width:auto;margin:20px auto}@media print{body{padding:20px}}</style></head><body>
<h2 style="text-align:center">GABARITO</h2>
<p style="text-align:center;color:#666">${examTitle}</p>
<table><thead><tr><th style="padding:8px 16px;border:1px solid #ddd;background:#f5f5f5">Questão</th><th style="padding:8px 16px;border:1px solid #ddd;background:#f5f5f5">Resposta</th></tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;
  };

  const handlePrint = () => {
    const html = buildPrintHTML();
    if (!html) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportPDF = () => {
    const html = buildPrintHTML();
    if (!html) return;
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) {
      toast.error("Permita pop-ups para exportar o PDF.");
      return;
    }
    const pdfHtml = html.replace("</head>", `<style>@page{size:A4;margin:15mm}</style></head>`);
    pdfWindow.document.write(pdfHtml);
    pdfWindow.document.close();
    setTimeout(() => pdfWindow.print(), 300);
  };


  if (!open) return null;

  return (
    <div className="w-[320px] flex-shrink-0 bg-card border border-border rounded-lg overflow-hidden animate-slide-in-left flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Gabarito da Prova
        </h3>
        <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-2 border-b border-border space-y-1.5">
        <p className="text-[11px] text-muted-foreground">
          Preencha as respostas corretas. O gabarito será inserido ao final da prova.
        </p>
        {aiAnswers && aiAnswers.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7 w-full bg-primary/5 border-primary/20 text-primary hover:bg-primary/10" onClick={autoFillFromAI}>
            <Wand2 className="h-3 w-3" />
            Preencher automaticamente ({aiAnswers.length} respostas)
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Alternativas</Label>
            <Select value={altCount} onValueChange={setAltCount}>
              <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 (A-C)</SelectItem>
                <SelectItem value="4">4 (A-D)</SelectItem>
                <SelectItem value="5">5 (A-E)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="mt-5 text-[10px]">
            {filledCount}/{entries.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7 px-2" onClick={addQuestion}>
            <Plus className="h-3 w-3" /> Questão
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2 text-destructive" onClick={removeLastQuestion} disabled={entries.length <= 1}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <div ref={printRef}>
          {entries.length > 0 && subjectSections && subjectSections.length > 0 ? (
            <div className="space-y-2">
              {(() => {
                let globalIdx = 0;
                const totalSectionQ = subjectSections.reduce((s, sec) => s + sec.questionCount, 0);
                const elements: React.ReactNode[] = [];
                
                subjectSections.forEach((section, sIdx) => {
                  const startIdx = globalIdx;
                  const sectionEntries = entries.slice(startIdx, startIdx + section.questionCount);
                  globalIdx += section.questionCount;
                  if (sectionEntries.length === 0) return;
                  elements.push(
                    <div key={`section-${sIdx}`}>
                      <p className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider border-b border-primary/10 pb-0.5 mb-1">
                        {section.name}
                      </p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {sectionEntries.map((entry, i) => (
                          <div key={startIdx + i} className="text-center">
                            <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              {String(entry.questionNum).padStart(2, "0")}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              {letterOptions.map((letter) => (
                                <button key={letter} type="button" onClick={() => setAnswer(startIdx + i, letter)}
                                  className={`text-[10px] font-bold rounded h-5 w-full transition-colors ${entry.answer === letter ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}>
                                  {letter}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });

                if (totalSectionQ < entries.length) {
                  const remaining = entries.slice(totalSectionQ);
                  elements.push(
                    <div key="remaining" className="grid grid-cols-5 gap-1.5">
                      {remaining.map((entry, i) => (
                        <div key={totalSectionQ + i} className="text-center">
                          <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">{String(entry.questionNum).padStart(2, "0")}</span>
                          <div className="flex flex-col gap-0.5">
                            {letterOptions.map((letter) => (
                              <button key={letter} type="button" onClick={() => setAnswer(totalSectionQ + i, letter)}
                                className={`text-[10px] font-bold rounded h-5 w-full transition-colors ${entry.answer === letter ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}>
                                {letter}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                return elements;
              })()}
            </div>
          ) : entries.length > 0 ? (
            <div className="grid grid-cols-5 gap-1.5">
              {entries.map((entry, idx) => (
                <div key={idx} className="text-center">
                  <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">{String(entry.questionNum).padStart(2, "0")}</span>
                  <div className="flex flex-col gap-0.5">
                    {letterOptions.map((letter) => (
                      <button key={letter} type="button" onClick={() => setAnswer(idx, letter)}
                        className={`text-[10px] font-bold rounded h-5 w-full transition-colors ${entry.answer === letter ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}>
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Para questões discursivas, deixe em branco.
        </p>
      </div>

      <div className="px-4 py-3 border-t border-border flex justify-between gap-2">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs">
            <FileDown className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleInsert} className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Inserir Gabarito
          </Button>
        </div>
      </div>
    </div>
  );
}
