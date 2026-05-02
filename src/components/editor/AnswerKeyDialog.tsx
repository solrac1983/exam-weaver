import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Trash2, X, Wand2, Printer, FileDown, Eraser, Copy, Keyboard, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { generateAnswerKeyHTML, type AnswerKeyEntry } from "@/lib/examQuestionUtils";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

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
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchStrategy, setBatchStrategy] = useState<"clear" | "fixed" | "suggest" | "ai">("suggest");
  const [batchLetter, setBatchLetter] = useState("A");
  const [syncScroll, setSyncScroll] = useState(true);
  const [activeQuestionNum, setActiveQuestionNum] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const userScrollingPanelRef = useRef(false);

  // Initialize only once per open cycle — prevents wiping user edits when aiAnswers identity changes
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    const sectionTotal = subjectSections?.reduce((sum, s) => sum + s.questionCount, 0) || 0;
    const count = Math.max(questionCount, sectionTotal, 1);
    const newEntries = Array.from({ length: count }, (_, i) => {
      const ai = aiAnswers?.find(a => a.questionNum === i + 1);
      return { questionNum: i + 1, answer: ai?.answer?.toUpperCase() || "" };
    });
    setEntries(newEntries);
    initializedRef.current = true;
  }, [open, questionCount, aiAnswers, subjectSections]);

  const letterOptions = useMemo(
    () => "ABCDEFGHIJ".slice(0, parseInt(altCount, 10) || 5).split(""),
    [altCount]
  );

  // When altCount decreases, clamp out-of-range answers
  useEffect(() => {
    setEntries(prev =>
      prev.map(e => (e.answer && !letterOptions.includes(e.answer) ? { ...e, answer: "" } : e))
    );
  }, [letterOptions]);

  const filledCount = useMemo(() => entries.filter(e => e.answer.trim()).length, [entries]);
  const progressPct = entries.length > 0 ? Math.round((filledCount / entries.length) * 100) : 0;

  const autoFillFromAI = useCallback(() => {
    if (!aiAnswers || aiAnswers.length === 0) return;
    setEntries(prev =>
      prev.map((e, i) => {
        const ai = aiAnswers.find(a => a.questionNum === i + 1);
        const letter = ai?.answer?.toUpperCase() || e.answer;
        return { ...e, answer: letterOptions.includes(letter) ? letter : e.answer };
      })
    );
    showInvokeSuccess(`Gabarito preenchido com ${aiAnswers.length} respostas da IA.`);
  }, [aiAnswers, letterOptions]);

  const setAnswer = useCallback((idx: number, letter: string) => {
    setEntries(prev =>
      prev.map((e, i) => (i === idx ? { ...e, answer: e.answer === letter ? "" : letter } : e))
    );
  }, []);

  const addQuestion = () => {
    setEntries(prev => [...prev, { questionNum: prev.length + 1, answer: "" }]);
  };

  const removeLastQuestion = () => {
    if (entries.length > 1) setEntries(prev => prev.slice(0, -1));
  };

  const clearAll = () => {
    if (filledCount === 0) return;
    setEntries(prev => prev.map(e => ({ ...e, answer: "" })));
    showInvokeSuccess("Gabarito limpo.");
  };

  const validation = useMemo(() => {
    const missing: number[] = [];
    const invalid: { q: number; a: string }[] = [];
    entries.forEach(e => {
      const a = e.answer.trim().toUpperCase();
      if (!a) missing.push(e.questionNum);
      else if (!letterOptions.includes(a)) invalid.push({ q: e.questionNum, a });
    });
    return { missing, invalid };
  }, [entries, letterOptions]);

  // Suggests the closest valid letter for an invalid one (e.g. "F" -> "E", "G" -> "E").
  const suggestLetter = useCallback((bad: string): string => {
    const up = bad.trim().toUpperCase();
    if (!up) return letterOptions[0] ?? "A";
    const code = up.charCodeAt(0);
    if (code < 65) return letterOptions[0];
    const last = letterOptions[letterOptions.length - 1];
    if (code > last.charCodeAt(0)) return last;
    // Numeric like "1" -> "A", "2" -> "B"
    if (/^\d$/.test(up)) {
      const idx = Math.min(parseInt(up, 10) - 1, letterOptions.length - 1);
      return letterOptions[Math.max(0, idx)];
    }
    return letterOptions[0];
  }, [letterOptions]);

  const applyBatchFix = useCallback(() => {
    if (validation.invalid.length === 0) {
      showInvokeError("Nenhuma resposta inválida para corrigir.");
      return;
    }
    const invalidNums = new Set(validation.invalid.map(i => i.q));
    let updated = 0;
    setEntries(prev =>
      prev.map(e => {
        if (!invalidNums.has(e.questionNum)) return e;
        let next = "";
        if (batchStrategy === "clear") {
          next = "";
        } else if (batchStrategy === "fixed") {
          next = letterOptions.includes(batchLetter) ? batchLetter : letterOptions[0];
        } else if (batchStrategy === "suggest") {
          next = suggestLetter(e.answer);
        } else if (batchStrategy === "ai") {
          const ai = aiAnswers?.find(a => a.questionNum === e.questionNum);
          const candidate = ai?.answer?.toUpperCase() || "";
          next = letterOptions.includes(candidate) ? candidate : suggestLetter(e.answer);
        }
        updated++;
        return { ...e, answer: next };
      })
    );
    setBatchOpen(false);
    showInvokeSuccess(`${updated} resposta(s) corrigida(s) em lote.`);
  }, [validation.invalid, batchStrategy, batchLetter, letterOptions, aiAnswers, suggestLetter]);

  const performInsert = () => {
    const filled = entries
      .filter(e => e.answer.trim() && letterOptions.includes(e.answer.trim().toUpperCase()))
      .map(e => ({ ...e, answer: e.answer.trim().toUpperCase() }));
    const html = generateAnswerKeyHTML(filled, examTitle);
    onInsertAnswerKey(html);
    showInvokeSuccess(`Gabarito com ${filled.length} respostas inserido ao final da prova!`);
    onOpenChange(false);
  };

  const handleInsert = () => {
    const filled = entries.filter(e => e.answer.trim());
    if (filled.length === 0) {
      showInvokeError("Preencha ao menos uma resposta antes de inserir o gabarito.");
      return;
    }

    const { missing, invalid } = validation;

    if (invalid.length > 0) {
      const sample = invalid.slice(0, 5).map(i => `Q${i.q}=${i.a}`).join(", ");
      showInvokeError(
        `${invalid.length} resposta(s) fora das alternativas A–${letterOptions[letterOptions.length - 1]}: ${sample}${invalid.length > 5 ? "…" : ""}. Corrija antes de inserir.`
      );
      setFocusedIdx(entries.findIndex(e => e.questionNum === invalid[0].q));
      return;
    }

    if (missing.length > 0) {
      const sample = missing.slice(0, 8).join(", ");
      const ok = window.confirm(
        `Atenção: ${missing.length} questão(ões) sem resposta (Q${sample}${missing.length > 8 ? "…" : ""}).\n\nDeseja inserir o gabarito mesmo assim? As questões em branco serão omitidas.`
      );
      if (!ok) {
        setFocusedIdx(entries.findIndex(e => e.questionNum === missing[0]));
        return;
      }
    }

    performInsert();
  };

  const handleCopy = async () => {
    const filled = entries.filter(e => e.answer.trim());
    if (filled.length === 0) {
      showInvokeError("Nada para copiar.");
      return;
    }
    const text = filled.map(e => `${e.questionNum}-${e.answer}`).join(", ");
    try {
      await navigator.clipboard.writeText(text);
      showInvokeSuccess("Gabarito copiado!");
    } catch {
      showInvokeError("Não foi possível copiar.");
    }
  };

  const buildPrintHTML = () => {
    const filled = entries.filter(e => e.answer.trim());
    if (filled.length === 0) {
      showInvokeError("Preencha ao menos uma resposta.");
      return null;
    }

    const cell = (q: number, a: string) =>
      `<tr><td style="text-align:center;padding:4px 16px;border:1px solid #ddd;font-weight:bold;">Questão ${q}</td><td style="text-align:center;padding:4px 16px;border:1px solid #ddd;font-weight:bold;text-transform:uppercase;">${a}</td></tr>`;

    let tableRows = "";
    if (subjectSections && subjectSections.length > 0) {
      let currentQ = 0;
      for (const section of subjectSections) {
        tableRows += `<tr><td colspan="2" style="padding:6px 12px;background:#f0f4ff;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#4a5568;border:1px solid #ddd;">${section.name}</td></tr>`;
        for (let i = 0; i < section.questionCount; i++) {
          const entry = entries[currentQ];
          if (entry?.answer.trim()) tableRows += cell(entry.questionNum, entry.answer);
          currentQ++;
        }
      }
      while (currentQ < entries.length) {
        const entry = entries[currentQ];
        if (entry?.answer.trim()) tableRows += cell(entry.questionNum, entry.answer);
        currentQ++;
      }
    } else {
      for (const entry of entries) {
        if (entry.answer.trim()) tableRows += cell(entry.questionNum, entry.answer);
      }
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gabarito - ${examTitle}</title><style>body{font-family:Arial,sans-serif;padding:40px}table{border-collapse:collapse;width:auto;margin:20px auto}@media print{body{padding:20px}}</style></head><body>
<h2 style="text-align:center">GABARITO</h2>
<p style="text-align:center;color:#666">${examTitle}</p>
<table><thead><tr><th style="padding:8px 16px;border:1px solid #ddd;background:#f5f5f5">Questão</th><th style="padding:8px 16px;border:1px solid #ddd;background:#f5f5f5">Resposta</th></tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;
  };

  const openPrintWindow = (html: string, autoPrintDelay = 250) => {
    const w = window.open("", "_blank");
    if (!w) {
      showInvokeError("Permita pop-ups para esta ação.");
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        /* noop */
      }
    }, autoPrintDelay);
  };

  const handlePrint = () => {
    const html = buildPrintHTML();
    if (html) openPrintWindow(html);
  };

  const handleExportPDF = () => {
    const html = buildPrintHTML();
    if (!html) return;
    const pdfHtml = html.replace("</head>", `<style>@page{size:A4;margin:15mm}</style></head>`);
    openPrintWindow(pdfHtml, 300);
  };

  // Keyboard navigation: A-E to answer focused, arrows to move
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (focusedIdx === null) return;
      const target = e.target as HTMLElement;
      // Skip when typing into inputs (selects use roving)
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

      const key = e.key.toUpperCase();
      if (letterOptions.includes(key)) {
        e.preventDefault();
        setAnswer(focusedIdx, key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setEntries(prev => prev.map((it, i) => (i === focusedIdx ? { ...it, answer: "" } : it)));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx(i => Math.min((i ?? 0) + 1, entries.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx(i => Math.max((i ?? 0) - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, focusedIdx, letterOptions, setAnswer, entries.length]);

  const invalidSet = useMemo(
    () => new Set(validation.invalid.map(i => i.q)),
    [validation.invalid]
  );

  const jumpToNextInvalid = useCallback(() => {
    if (validation.invalid.length === 0) return;
    const current = focusedIdx ?? -1;
    const invalidIdxs = entries
      .map((e, i) => (invalidSet.has(e.questionNum) ? i : -1))
      .filter(i => i >= 0);
    const next = invalidIdxs.find(i => i > current) ?? invalidIdxs[0];
    setFocusedIdx(next);
    // Scroll the cell into view
    setTimeout(() => {
      const el = document.querySelector(`[data-answer-cell="${next}"]`) as HTMLElement | null;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  }, [validation.invalid, entries, invalidSet, focusedIdx]);

  if (!open) return null;

  const renderQuestionCell = (entry: AnswerKeyEntry, globalIdx: number) => {
    const isInvalid = invalidSet.has(entry.questionNum);
    const isFocused = focusedIdx === globalIdx;
    return (
      <button
        type="button"
        key={globalIdx}
        data-answer-cell={globalIdx}
        onClick={() => setFocusedIdx(globalIdx)}
        title={isInvalid ? `Resposta "${entry.answer}" fora de A–${letterOptions[letterOptions.length - 1]}` : undefined}
        className={`relative text-center rounded p-0.5 transition-colors ${
          isInvalid
            ? "ring-1 ring-destructive bg-destructive/10 animate-pulse"
            : isFocused
              ? "ring-1 ring-primary bg-primary/5"
              : ""
        }`}
      >
        {isInvalid && (
          <AlertTriangle className="absolute -top-1 -right-1 h-3 w-3 text-destructive bg-card rounded-full" />
        )}
        <span className={`text-[9px] font-bold block mb-0.5 leading-tight ${isInvalid ? "text-destructive" : "text-muted-foreground"}`}>
          Q{entry.questionNum}
        </span>
        <div className="flex flex-col gap-0.5">
          {letterOptions.map(letter => (
            <button
              key={letter}
              type="button"
              onClick={(e) => { e.stopPropagation(); setFocusedIdx(globalIdx); setAnswer(globalIdx, letter); }}
              className={`text-[10px] font-bold rounded h-5 w-full transition-colors ${entry.answer === letter ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}
            >
              {letter}
            </button>
          ))}
        </div>
      </button>
    );
  };

  return (
    <div className="w-[320px] flex-shrink-0 bg-card border border-border rounded-lg overflow-hidden animate-slide-in-left flex flex-col max-h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Gabarito da Prova
        </h3>
        <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-colors" title="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-2 border-b border-border space-y-1.5">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Keyboard className="h-3 w-3" /> Selecione uma questão e digite A–{letterOptions[letterOptions.length - 1]} no teclado.
        </p>
        {aiAnswers && aiAnswers.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7 w-full bg-primary/5 border-primary/20 text-primary hover:bg-primary/10" onClick={autoFillFromAI}>
            <Wand2 className="h-3 w-3" />
            Preencher automaticamente ({aiAnswers.length} respostas)
          </Button>
        )}
        <div className="h-1 w-full bg-muted rounded overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
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
            {filledCount}/{entries.length} ({progressPct}%)
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7 px-2" onClick={addQuestion} title="Adicionar questão">
            <Plus className="h-3 w-3" /> Questão
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2 text-destructive" onClick={removeLastQuestion} disabled={entries.length <= 1} title="Remover última">
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2" onClick={clearAll} disabled={filledCount === 0} title="Limpar todas as respostas">
            <Eraser className="h-3 w-3" /> Limpar
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2" onClick={handleCopy} disabled={filledCount === 0} title="Copiar (1-A, 2-B, ...)">
            <Copy className="h-3 w-3" />
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
                        {sectionEntries.map((entry, i) => renderQuestionCell(entry, startIdx + i))}
                      </div>
                    </div>
                  );
                });

                if (totalSectionQ < entries.length) {
                  const remaining = entries.slice(totalSectionQ);
                  elements.push(
                    <div key="remaining" className="grid grid-cols-5 gap-1.5">
                      {remaining.map((entry, i) => renderQuestionCell(entry, totalSectionQ + i))}
                    </div>
                  );
                }

                return elements;
              })()}
            </div>
          ) : entries.length > 0 ? (
            <div className="grid grid-cols-5 gap-1.5">
              {entries.map((entry, idx) => renderQuestionCell(entry, idx))}
            </div>
          ) : null}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Para questões discursivas, deixe em branco.
        </p>

        {(validation.missing.length > 0 || validation.invalid.length > 0) && (
          <div className={`text-[11px] rounded border p-2 space-y-1 ${validation.invalid.length > 0 ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400"}`}>
            {validation.invalid.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {validation.invalid.length} resposta(s) fora de A–{letterOptions[letterOptions.length - 1]}.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={jumpToNextInvalid}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold underline hover:no-underline"
                      title="Ir para a próxima questão inválida"
                    >
                      Próxima <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchOpen(o => !o)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold underline hover:no-underline"
                      title="Corrigir todas as inválidas em lote"
                    >
                      <Sparkles className="h-3 w-3" /> Corrigir em lote
                    </button>
                  </div>
                </div>
                {batchOpen && (
                  <div className="rounded border border-destructive/30 bg-card p-2 space-y-1.5 text-foreground">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Aplicar a {validation.invalid.length} questão(ões):
                    </p>
                    <Select value={batchStrategy} onValueChange={(v: typeof batchStrategy) => setBatchStrategy(v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suggest">Sugestão automática (mais próxima válida)</SelectItem>
                        {aiAnswers && aiAnswers.length > 0 && (
                          <SelectItem value="ai">Usar resposta da IA quando disponível</SelectItem>
                        )}
                        <SelectItem value="fixed">Definir letra fixa…</SelectItem>
                        <SelectItem value="clear">Limpar (deixar em branco)</SelectItem>
                      </SelectContent>
                    </Select>
                    {batchStrategy === "fixed" && (
                      <Select value={batchLetter} onValueChange={setBatchLetter}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {letterOptions.map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setBatchOpen(false)}>
                        Cancelar
                      </Button>
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={applyBatchFix}>
                        <Sparkles className="h-3 w-3" /> Aplicar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {validation.missing.length > 0 && (
              <p>○ {validation.missing.length} questão(ões) sem resposta.</p>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border flex justify-between gap-2">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handlePrint} className="gap-1.5 text-xs" title="Imprimir gabarito">
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs" title="Exportar como PDF">
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
