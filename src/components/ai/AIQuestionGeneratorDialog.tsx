import { useState, useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Wand2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/invokeFunction";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

export interface GeneratedQuestion {
  type: "objetiva" | "dissertativa" | "verdadeiro_falso";
  content: string;
  options?: string[];
  answer: string;
  topic: string;
  difficulty: "facil" | "media" | "dificil";
  explanation: string;
}

interface UploadedFile {
  name: string;
  base64: string;
  preview: string | null; // null for PDFs
  type: "image" | "pdf";
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

const ACCEPTED_IMAGE_TYPES = [
  "image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp", "image/tiff", "image/webp",
];
const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024; // 25MB total
const MAX_QUANTITY = 50;

function isAcceptedFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type.startsWith("image/") || file.type === "application/pdf";
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function AIQuestionGeneratorDialog({
  open,
  onOpenChange,
  onInsertQuestions,
  subject,
  grade,
}: AIQuestionGeneratorDialogProps) {
  const [step, setStep] = useState<"upload" | "generating" | "results">("upload");
  const [textContent, setTextContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<GeneratedQuestion | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [quantity, setQuantity] = useState("5");
  const [difficulty, setDifficulty] = useState("todas");
  const [questionType, setQuestionType] = useState("todas");
  const [customInstructions, setCustomInstructions] = useState("");

  const totalSize = useMemo(
    () => uploadedFiles.reduce((acc, f) => acc + Math.ceil((f.base64.length * 3) / 4), 0),
    [uploadedFiles]
  );

  // Elapsed timer during generation
  useEffect(() => {
    if (step !== "generating") {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStep("upload");
    setTextContent("");
    setUploadedFiles([]);
    setQuestions([]);
    setSelected(new Set());
    setEditingIdx(null);
    setEditForm(null);
    setQuantity("5");
    setDifficulty("todas");
    setQuestionType("todas");
    setCustomInstructions("");
    setIsDragging(false);
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    // Filter by type
    const typeFiltered = fileArray.filter(isAcceptedFile);
    const invalidType = fileArray.length - typeFiltered.length;
    if (invalidType > 0) {
      showInvokeError(`${invalidType} arquivo(s) com formato não suportado ignorado(s).`);
    }

    // Filter by per-file size
    const sizeOk = typeFiltered.filter((f) => f.size <= MAX_FILE_SIZE_BYTES);
    const tooBig = typeFiltered.length - sizeOk.length;
    if (tooBig > 0) {
      showInvokeError(`${tooBig} arquivo(s) acima de ${formatBytes(MAX_FILE_SIZE_BYTES)} ignorado(s).`);
    }

    // Enforce overall max files count
    const remainingSlots = Math.max(0, MAX_FILES - uploadedFiles.length);
    const accepted = sizeOk.slice(0, remainingSlots);
    if (sizeOk.length > remainingSlots) {
      showInvokeError(`Máximo de ${MAX_FILES} arquivos. Excedente ignorado.`);
    }
    if (accepted.length === 0) return;

    // Enforce total size cap
    let runningTotal = totalSize;
    const finalAccepted: File[] = [];
    for (const f of accepted) {
      if (runningTotal + f.size > MAX_TOTAL_SIZE_BYTES) {
        showInvokeError(`Limite total de ${formatBytes(MAX_TOTAL_SIZE_BYTES)} atingido.`);
        break;
      }
      runningTotal += f.size;
      finalAccepted.push(f);
    }
    if (finalAccepted.length === 0) return;

    // Read files in parallel
    try {
      const newFiles = await Promise.all(
        finalAccepted.map(async (file) => {
          const base64 = await readFileAsBase64(file);
          const isImage = file.type.startsWith("image/");
          return {
            name: file.name,
            base64,
            preview: isImage ? base64 : null,
            type: isImage ? "image" as const : "pdf" as const,
          };
        })
      );
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    } catch (err) {
      console.error("File read error:", err);
      showInvokeError("Falha ao processar um ou mais arquivos.");
    }
  };

  const removeFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Use dragCounter to handle nested children correctly
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types?.includes("Files")) setIsDragging(true);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) { e.preventDefault(); processFiles(files); }
  };

  const handleGenerate = async () => {
    if (uploadedFiles.length === 0 && !textContent.trim()) {
      showInvokeError("Envie arquivos ou cole o texto do conteúdo.");
      return;
    }
    const qty = Math.max(1, Math.min(MAX_QUANTITY, parseInt(quantity, 10) || 5));
    setStep("generating");

    const imagesBase64 = uploadedFiles.map((f) => f.base64);

    const { data, error } = await invokeFunction<{ questions?: unknown[]; error?: string }>("generate-questions", {
      body: {
        imagesBase64: imagesBase64.length > 0 ? imagesBase64 : undefined,
        textContent: textContent.trim() || undefined,
        subject,
        grade,
        quantity: qty,
        difficulty: difficulty !== "todas" ? difficulty : undefined,
        questionType: questionType !== "todas" ? questionType : undefined,
        customInstructions: customInstructions.trim() || undefined,
      },
      errorMessage: "Erro ao gerar questões. Tente novamente.",
    });

    if (error) { setStep("upload"); return; }

    const generated = (data?.questions as any[]) || [];
    if (generated.length === 0) {
      showInvokeError("A IA não conseguiu gerar questões. Tente com outro conteúdo.");
      setStep("upload");
      return;
    }

    setQuestions(generated);
    setSelected(new Set(generated.map((_, i) => i)));
    setStep("results");
  };

  const handleCancelGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStep("upload");
    showInvokeError("Geração cancelada.");
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; });
  };

  const startEdit = (idx: number) => { setEditingIdx(idx); setEditForm({ ...questions[idx] }); };
  const saveEdit = () => {
    if (editingIdx === null || !editForm) return;
    // Validate
    if (!editForm.content.trim()) {
      showInvokeError("O enunciado não pode estar vazio.");
      return;
    }
    const cleaned: GeneratedQuestion = {
      ...editForm,
      content: editForm.content.trim(),
      answer: editForm.answer.trim(),
      topic: editForm.topic.trim(),
      options: editForm.options
        ? editForm.options.map((o) => o.trim()).filter((o) => o.length > 0)
        : undefined,
    };
    if (cleaned.type === "objetiva") {
      if (!cleaned.options || cleaned.options.length < 2) {
        showInvokeError("Questão objetiva precisa de pelo menos 2 alternativas.");
        return;
      }
      const letter = cleaned.answer.toUpperCase().charAt(0);
      if (!/^[A-E]$/.test(letter)) {
        showInvokeError("A resposta deve ser uma letra (A-E).");
        return;
      }
      cleaned.answer = letter;
    }
    setQuestions((prev) => prev.map((q, i) => (i === editingIdx ? cleaned : q)));
    setEditingIdx(null); setEditForm(null); showInvokeSuccess("Questão atualizada!");
  };
  const cancelEdit = () => { setEditingIdx(null); setEditForm(null); };

  const handleInsert = () => {
    const selectedQuestions = questions.filter((_, i) => selected.has(i));
    if (selectedQuestions.length === 0) { showInvokeError("Selecione pelo menos uma questão."); return; }
    onInsertQuestions(selectedQuestions);
    showInvokeSuccess(`${selectedQuestions.length} questão(ões) inserida(s)!`);
    reset(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente IA — Gerar Questões
          </DialogTitle>
          <DialogDescription>
            Envie fotos ou PDFs de páginas do livro, ou cole o texto. A IA irá gerar questões a partir de todo o conteúdo.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-2" onPaste={handlePaste}>
            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-border"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/bmp,image/tiff,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-3">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  <Upload className="h-6 w-6 text-muted-foreground/40" />
                  <FileText className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {isDragging ? "Solte os arquivos aqui" : "Arraste, cole (Ctrl+V) ou clique para enviar"}
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF, BMP, TIFF ou PDF — múltiplos arquivos</p>
              </div>
            </div>

            {/* File previews */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  {uploadedFiles.length}/{MAX_FILES} arquivo(s) — {formatBytes(totalSize)} de {formatBytes(MAX_TOTAL_SIZE_BYTES)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="relative group rounded-lg border border-border bg-muted/30 p-1.5 flex items-center gap-2 pr-7">
                      {f.preview ? (
                        <img src={f.preview} alt={f.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <FileText className="h-10 w-10 text-primary/60 p-1.5" />
                      )}
                      <span className="text-xs text-foreground max-w-[100px] truncate">{f.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="absolute top-0.5 right-0.5 rounded-full bg-destructive/10 hover:bg-destructive/20 p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Or paste text */}
            <div className="relative">
              <div className="absolute inset-x-0 top-0 flex items-center justify-center -translate-y-1/2">
                <span className="bg-background px-3 text-xs text-muted-foreground">ou cole o texto</span>
              </div>
              <Textarea
                placeholder="Cole aqui o texto do conteúdo do livro..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                className="mt-2 min-h-[120px]"
              />
            </div>

            {/* Custom Instructions */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <Pencil className="h-3 w-3 text-primary" />
                Orientações para a prova (opcional)
              </Label>
              <Textarea
                placeholder="Ex: Foque em frações e porcentagem. Use linguagem simples..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={2}
                className="min-h-[60px] text-xs"
              />
            </div>

            {/* Generation Options */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-primary" />
                Configurações de geração
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Quantidade</Label>
                  <Select value={parseInt(quantity) <= 10 ? quantity : "custom"} onValueChange={(v) => { if (v !== "custom") setQuantity(v); else setQuantity("15"); }}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={`${quantity} questões`} /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} questão{n > 1 ? "ões" : ""}</SelectItem>
                      ))}
                      <SelectItem value="custom">Personalizado...</SelectItem>
                    </SelectContent>
                  </Select>
                  {parseInt(quantity) > 10 && (
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="h-8 text-xs mt-1"
                      placeholder="Ex: 15"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Dificuldade</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Variada</SelectItem>
                      <SelectItem value="facil">Fácil</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="dificil">Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Tipo de questão</Label>
                  <Select value={questionType} onValueChange={setQuestionType}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Variado</SelectItem>
                      <SelectItem value="objetiva">Múltipla Escolha</SelectItem>
                      <SelectItem value="verdadeiro_falso">Verdadeiro ou Falso</SelectItem>
                      <SelectItem value="dissertativa">Dissertativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button onClick={handleGenerate} className="w-full gap-2" size="lg">
              <Wand2 className="h-4 w-4" />
              Gerar Questões com IA
              {uploadedFiles.length > 0 && (
                <span className="text-xs opacity-75">({uploadedFiles.length} arquivo{uploadedFiles.length > 1 ? "s" : ""})</span>
              )}
            </Button>
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Analisando conteúdo...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {uploadedFiles.length > 0
                  ? `Processando ${uploadedFiles.length} arquivo(s) e gerando ${quantity} questão(ões).`
                  : `Gerando ${quantity} questão(ões). Aguarde alguns segundos.`
                }
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2 tabular-nums">
                ⏱ {elapsed}s {elapsed > 30 && "— quase lá..."}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCancelGeneration} className="text-xs text-muted-foreground">
              <X className="h-3 w-3 mr-1" /> Cancelar
            </Button>
          </div>
        )}

        {step === "results" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {questions.length} gerada(s) — {selected.size} selecionada(s)
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(questions.map((_, i) => i)))}>Selecionar todas</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Limpar</Button>
              </div>
            </div>

            <ScrollArea className="flex-1 max-h-[400px] pr-2">
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-4 transition-all",
                      selected.has(i) ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    {editingIdx === i && editForm ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Tipo</Label>
                            <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v as any })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="objetiva">Múltipla Escolha</SelectItem>
                                <SelectItem value="verdadeiro_falso">V ou F</SelectItem>
                                <SelectItem value="dissertativa">Dissertativa</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Dificuldade</Label>
                            <Select value={editForm.difficulty} onValueChange={(v) => setEditForm({ ...editForm, difficulty: v as any })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="facil">Fácil</SelectItem>
                                <SelectItem value="media">Média</SelectItem>
                                <SelectItem value="dificil">Difícil</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Tópico</Label>
                            <Input className="h-8 text-xs" value={editForm.topic} onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Enunciado (HTML — fórmulas LaTeX e tags são preservadas)</Label>
                          <Textarea className="text-xs min-h-[80px] font-mono" value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} />
                        </div>
                        {editForm.type === "objetiva" && editForm.options && (
                          <div className="space-y-1">
                            <Label className="text-[10px]">Alternativas (uma por linha)</Label>
                            <Textarea className="text-xs min-h-[80px]" value={editForm.options.join("\n")} onChange={(e) => setEditForm({ ...editForm, options: e.target.value.split("\n") })} />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-[10px]">Resposta</Label>
                          <Input className="h-8 text-xs" value={editForm.answer} onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })} />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-xs h-7">Cancelar</Button>
                          <Button size="sm" onClick={saveEdit} className="text-xs h-7 gap-1"><Save className="h-3 w-3" /> Salvar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3" onClick={() => toggleSelect(i)}>
                        <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleSelect(i)} className="mt-1 cursor-pointer" />
                        <div className="flex-1 min-w-0 cursor-pointer">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{typeLabels[q.type] || q.type}</span>
                            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", difficultyColors[q.difficulty])}>{difficultyLabels[q.difficulty]}</span>
                            {q.topic && <span className="text-[10px] text-muted-foreground italic">{q.topic}</span>}
                          </div>
                          <div className="text-sm text-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: q.content }} />
                          {q.options && q.options.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {q.options.map((opt, j) => {
                                const letter = String.fromCharCode(65 + j);
                                const answerLetter = (q.answer || "").trim().charAt(0).toUpperCase();
                                const isCorrect = letter === answerLetter;
                                return (
                                  <p key={j} className={cn("text-xs pl-3", isCorrect ? "font-semibold text-emerald-600" : "text-muted-foreground")}>
                                    {letter}) {opt}{isCorrect && " ✓"}
                                  </p>
                                );
                              })}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2 italic">💡 {q.explanation}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={(e) => { e.stopPropagation(); startEdit(i); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 pt-4 border-t border-border mt-3">
              <Button variant="outline" onClick={reset} className="gap-1.5"><Wand2 className="h-4 w-4" /> Gerar novamente</Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
              <Button onClick={handleInsert} className="gap-1.5" disabled={selected.size === 0}>
                <CheckCircle2 className="h-4 w-4" /> Inserir {selected.size > 0 ? `(${selected.size})` : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
