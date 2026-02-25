import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  X,
  BookOpen,
  Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface GeneratedQuestion {
  type: "objetiva" | "dissertativa" | "verdadeiro_falso";
  content: string;
  options?: string[];
  answer: string;
  topic: string;
  difficulty: "facil" | "media" | "dificil";
  explanation: string;
}

interface AIQuestionGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertQuestions: (questions: GeneratedQuestion[]) => void;
  subject?: string;
  grade?: string;
}

const difficultyLabels: Record<string, string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
};

const difficultyColors: Record<string, string> = {
  facil: "text-emerald-600 bg-emerald-500/10",
  media: "text-amber-600 bg-amber-500/10",
  dificil: "text-destructive bg-destructive/10",
};

const typeLabels: Record<string, string> = {
  objetiva: "Múltipla Escolha",
  dissertativa: "Dissertativa",
  verdadeiro_falso: "V ou F",
};

export function AIQuestionGeneratorDialog({
  open,
  onOpenChange,
  onInsertQuestions,
  subject,
  grade,
}: AIQuestionGeneratorDialogProps) {
  const [step, setStep] = useState<"upload" | "generating" | "results">("upload");
  const [textContent, setTextContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setTextContent("");
    setImagePreview(null);
    setImageBase64(null);
    setFileName(null);
    setQuestions([]);
    setSelected(new Set());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setImageBase64(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf") {
      // For PDFs, we send as base64 too — Gemini can handle it
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setImageBase64(base64);
        setImagePreview(null);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Formato não suportado. Use imagens (JPG, PNG) ou PDF.");
    }
  };

  const handleGenerate = async () => {
    if (!imageBase64 && !textContent.trim()) {
      toast.error("Envie uma imagem/PDF ou cole o texto do conteúdo.");
      return;
    }

    setStep("generating");

    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          imageBase64: imageBase64 || undefined,
          textContent: !imageBase64 ? textContent : undefined,
          subject,
          grade,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        setStep("upload");
        return;
      }

      const generated = data?.questions || [];
      if (generated.length === 0) {
        toast.error("A IA não conseguiu gerar questões. Tente com outro conteúdo.");
        setStep("upload");
        return;
      }

      setQuestions(generated);
      setSelected(new Set(generated.map((_: any, i: number) => i)));
      setStep("results");
    } catch (err: any) {
      console.error("Error generating questions:", err);
      toast.error("Erro ao gerar questões. Tente novamente.");
      setStep("upload");
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleInsert = () => {
    const selectedQuestions = questions.filter((_, i) => selected.has(i));
    if (selectedQuestions.length === 0) {
      toast.error("Selecione pelo menos uma questão.");
      return;
    }
    onInsertQuestions(selectedQuestions);
    toast.success(`${selectedQuestions.length} questão(ões) inserida(s)!`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente IA — Gerar Questões
          </DialogTitle>
          <DialogDescription>
            Envie uma foto ou PDF de páginas do livro, ou cole o texto. A IA irá gerar questões automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4 py-2">
            {/* File upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                imageBase64 ? "border-primary/30 bg-primary/5" : "border-border"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="space-y-3">
                  <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-md" />
                  <p className="text-sm text-muted-foreground">{fileName}</p>
                </div>
              ) : imageBase64 ? (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-primary/60" />
                  <p className="text-sm font-medium text-foreground">{fileName}</p>
                  <p className="text-xs text-muted-foreground">PDF carregado com sucesso</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    <Upload className="h-8 w-8 text-muted-foreground/40" />
                    <FileText className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Clique para enviar foto ou PDF
                  </p>
                  <p className="text-xs text-muted-foreground">JPG, PNG ou PDF</p>
                </div>
              )}
            </div>

            {/* Or paste text */}
            <div className="relative">
              <div className="absolute inset-x-0 top-0 flex items-center justify-center -translate-y-1/2">
                <span className="bg-background px-3 text-xs text-muted-foreground">ou cole o texto</span>
              </div>
              <Textarea
                placeholder="Cole aqui o texto do conteúdo do livro..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>

            <Button onClick={handleGenerate} className="w-full gap-2" size="lg">
              <Wand2 className="h-4 w-4" />
              Gerar Questões com IA
            </Button>
          </div>
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Analisando conteúdo...</p>
              <p className="text-sm text-muted-foreground mt-1">A IA está gerando questões. Aguarde alguns segundos.</p>
            </div>
          </div>
        )}

        {/* Step: Results */}
        {step === "results" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {questions.length} questão(ões) gerada(s) — {selected.size} selecionada(s)
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(questions.map((_, i) => i)))}>
                  Selecionar todas
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  Limpar seleção
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 max-h-[400px] pr-2">
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-4 transition-all cursor-pointer",
                      selected.has(i)
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                    onClick={() => toggleSelect(i)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleSelect(i)} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {typeLabels[q.type] || q.type}
                          </span>
                          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", difficultyColors[q.difficulty])}>
                            {difficultyLabels[q.difficulty]}
                          </span>
                          {q.topic && (
                            <span className="text-[10px] text-muted-foreground italic">{q.topic}</span>
                          )}
                        </div>
                        <div
                          className="text-sm text-foreground prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: q.content }}
                        />
                        {q.options && q.options.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {q.options.map((opt, j) => (
                              <p key={j} className={cn(
                                "text-xs pl-3",
                                opt.startsWith(q.answer) ? "font-semibold text-emerald-600" : "text-muted-foreground"
                              )}>
                                {String.fromCharCode(65 + j)}) {opt}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          💡 {q.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 pt-4 border-t border-border mt-3">
              <Button variant="outline" onClick={reset} className="gap-1.5">
                <Wand2 className="h-4 w-4" />
                Gerar novamente
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
                Cancelar
              </Button>
              <Button onClick={handleInsert} className="gap-1.5" disabled={selected.size === 0}>
                <CheckCircle2 className="h-4 w-4" />
                Inserir {selected.size > 0 ? `(${selected.size})` : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
