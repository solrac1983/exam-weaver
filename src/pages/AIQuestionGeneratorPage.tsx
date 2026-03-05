import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichEditor } from "@/components/editor/RichEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
  ArrowLeft,
  Tag,
  ChevronDown,
  ChevronUp,
  Clock,
  FileDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { renderMathInHTML, renderMathInText } from "@/lib/renderMath";
import { exportQuestionsToPDF } from "@/lib/exportQuestionsPDF";
import { PDFExportDialog, type PDFHeaderConfig } from "@/components/ai/PDFExportDialog";
import { BIMESTERS } from "@/data/constants";
import { useAuth } from "@/hooks/useAuth";

export interface GeneratedQuestion {
  type: "objetiva" | "dissertativa" | "verdadeiro_falso";
  content: string;
  options?: string[];
  answer: string;
  topic: string;
  difficulty: "facil" | "media" | "dificil";
  explanation: string;
  // Extra fields for editing
  tags?: string[];
  subjectId?: string;
  grade?: string;
}

interface UploadedFile {
  name: string;
  base64: string;
  preview: string | null;
  type: "image" | "pdf";
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
  "image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp", "image/tiff",
];

function isAcceptedFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type.startsWith("image/") || file.type === "application/pdf";
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AIQuestionGeneratorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, user, profile } = useAuth();
  const returnTo = searchParams.get("return") || "/banco-questoes";
  const subjectParam = searchParams.get("subject") || "";
  const gradeParam = searchParams.get("grade") || "";

  const [step, setStep] = useState<"upload" | "generating" | "results">("upload");
  const [textContent, setTextContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  const [quantity, setQuantity] = useState("5");
  const [difficulty, setDifficulty] = useState("todas");
  const [questionType, setQuestionType] = useState("todas");
  const [customInstructions, setCustomInstructions] = useState("");

  // Fetch subjects and class groups from DB
  const [dbSubjects, setDbSubjects] = useState<{ id: string; name: string }[]>([]);
  const [dbClassGroups, setDbClassGroups] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("subjects").select("id, name").order("name").then(({ data }) => {
      if (data) setDbSubjects(data);
    });
    supabase.from("class_groups").select("name").order("name").then(({ data }) => {
      setDbClassGroups((data || []).map((c: any) => c.name));
    });
  }, []);

  // Filter subjects by teacher if professor role
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<string[]>([]);
  useEffect(() => {
    if (role !== "professor" || !profile?.email) return;
    supabase.from("teachers").select("subjects").eq("email", profile.email).maybeSingle().then(({ data }) => {
      if (data?.subjects) setTeacherSubjectIds(data.subjects);
    });
  }, [role, profile?.email]);

  const availableSubjects = role === "professor" && teacherSubjectIds.length > 0
    ? dbSubjects.filter(s => teacherSubjectIds.includes(s.id))
    : dbSubjects;

  const reset = () => {
    setStep("upload");
    setTextContent("");
    setUploadedFiles([]);
    setQuestions([]);
    setSelected(new Set());
    setEditingIdx(null);
    setExpandedIdx(null);
    setQuantity("5");
    setDifficulty("todas");
    setQuestionType("todas");
    setCustomInstructions("");
    setIsDragging(false);
    setGenerationTime(null);
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const valid = fileArray.filter(isAcceptedFile);
    const invalid = fileArray.length - valid.length;
    if (invalid > 0) toast.error(`${invalid} arquivo(s) ignorado(s).`);
    if (valid.length === 0) return;
    const newFiles: UploadedFile[] = [];
    for (const file of valid) {
      const base64 = await readFileAsBase64(file);
      const isImage = file.type.startsWith("image/");
      newFiles.push({ name: file.name, base64, preview: isImage ? base64 : null, type: isImage ? "image" : "pdf" });
    }
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (idx: number) => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
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
      toast.error("Envie arquivos ou cole o texto do conteúdo.");
      return;
    }
    setStep("generating");
    const startTime = Date.now();
    try {
      const imagesBase64 = uploadedFiles.map((f) => f.base64);
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          imagesBase64: imagesBase64.length > 0 ? imagesBase64 : undefined,
          textContent: textContent.trim() || undefined,
          subject: subjectParam,
          grade: gradeParam,
          quantity: parseInt(quantity) || 5,
          difficulty: difficulty !== "todas" ? difficulty : undefined,
          questionType: questionType !== "todas" ? questionType : undefined,
          customInstructions: customInstructions.trim() || undefined,
        },
      });
      const elapsed = (Date.now() - startTime) / 1000;
      setGenerationTime(elapsed);
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setStep("upload"); return; }
      const generated: GeneratedQuestion[] = (data?.questions || []).map((q: any) => ({
        ...q,
        tags: q.topic ? [q.topic] : [],
        subjectId: subjectParam || "",
        grade: gradeParam || "",
      }));
      if (generated.length === 0) { toast.error("A IA não conseguiu gerar questões."); setStep("upload"); return; }
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
    setSelected((prev) => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; });
  };

  const updateQuestion = (idx: number, updates: Partial<GeneratedQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...updates } : q)));
  };

  const addTagToQuestion = (idx: number, tag: string) => {
    const q = questions[idx];
    if (!q.tags?.includes(tag)) {
      updateQuestion(idx, { tags: [...(q.tags || []), tag] });
    }
  };

  const removeTagFromQuestion = (idx: number, tag: string) => {
    const q = questions[idx];
    updateQuestion(idx, { tags: (q.tags || []).filter((t) => t !== tag) });
  };

  const handleInsert = () => {
    const selectedQuestions = questions.filter((_, i) => selected.has(i));
    if (selectedQuestions.length === 0) { toast.error("Selecione pelo menos uma questão."); return; }

    // Store in sessionStorage for the calling page to pick up
    sessionStorage.setItem("ai-generated-questions", JSON.stringify(selectedQuestions));
    toast.success(`${selectedQuestions.length} questão(ões) pronta(s) para inserção!`);
    navigate(returnTo);
  };

  return (
    <div className="space-y-4 animate-fade-in" onPaste={handlePaste}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(returnTo)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistente IA — Gerar Questões
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Envie fotos ou PDFs de páginas do livro, ou cole o texto. A IA irá gerar questões automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="max-w-3xl space-y-5">
          {/* Drop zone */}
          <div className="glass-card rounded-xl p-0 overflow-hidden">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all m-1",
                "hover:border-primary/50 hover:bg-primary/5",
                isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border"
              )}
            >
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/bmp,image/tiff,application/pdf" onChange={handleFileChange} className="hidden" multiple />
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-4">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                  <Upload className="h-8 w-8 text-muted-foreground/30" />
                  <FileText className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {isDragging ? "Solte os arquivos aqui" : "Arraste, cole (Ctrl+V) ou clique para enviar"}
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF, BMP, TIFF ou PDF — múltiplos arquivos</p>
              </div>
            </div>
          </div>

          {/* Uploaded file previews */}
          {uploadedFiles.length > 0 && (
            <div className="glass-card rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">{uploadedFiles.length} arquivo(s) carregado(s)</p>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="relative group rounded-lg border border-border bg-muted/30 p-1.5 flex items-center gap-2 pr-7">
                    {f.preview ? (
                      <img src={f.preview} alt={f.name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <FileText className="h-10 w-10 text-primary/60 p-1.5" />
                    )}
                    <span className="text-xs text-foreground max-w-[120px] truncate">{f.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="absolute top-0.5 right-0.5 rounded-full bg-destructive/10 hover:bg-destructive/20 p-0.5 transition-colors">
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Or paste text */}
          <div className="glass-card rounded-xl p-4 space-y-2">
            <Label className="text-xs font-semibold text-foreground">Ou cole o texto do conteúdo</Label>
            <Textarea
              placeholder="Cole aqui o texto do conteúdo do livro..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={8}
              className="min-h-[160px]"
            />
          </div>

          {/* Custom Instructions */}
          <div className="glass-card rounded-xl p-4 space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-primary" />
              Orientações para a prova (opcional)
            </Label>
            <Textarea
              placeholder="Ex: Foque em frações e porcentagem. Use linguagem simples para alunos do 5º ano. Inclua questões contextualizadas com situações do dia a dia..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
              className="min-h-[80px] text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Dê orientações específicas para personalizar as questões geradas pela IA.
            </p>
          </div>

          {/* Generation Options */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Configurações de geração
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Quantidade</Label>
                <Select value={parseInt(quantity) <= 10 ? quantity : "custom"} onValueChange={(v) => { if (v !== "custom") setQuantity(v); else setQuantity("15"); }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={`${quantity} questões`} /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} questão{n > 1 ? "ões" : ""}</SelectItem>
                    ))}
                    <SelectItem value="custom">Personalizado...</SelectItem>
                  </SelectContent>
                </Select>
                {parseInt(quantity) > 10 && (
                  <Input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9 text-sm mt-1" placeholder="Ex: 15" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Dificuldade</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Variada</SelectItem>
                    <SelectItem value="facil">Fácil</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="dificil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo de questão</Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
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
            {uploadedFiles.length > 0 && <span className="text-xs opacity-75">({uploadedFiles.length} arquivo{uploadedFiles.length > 1 ? "s" : ""})</span>}
          </Button>
        </div>
      )}

      {/* Step: Generating */}
      {step === "generating" && (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="relative">
            <Loader2 className="h-14 w-14 text-primary animate-spin" />
            <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">Analisando conteúdo...</p>
            <p className="text-sm text-muted-foreground mt-1">
              {uploadedFiles.length > 0
                ? `Processando ${uploadedFiles.length} arquivo(s) e gerando ${quantity} questão(ões).`
                : `Gerando ${quantity} questão(ões). Aguarde alguns segundos.`}
            </p>
          </div>
        </div>
      )}

      {/* Step: Results */}
      {step === "results" && (
        <div className="space-y-4">
          {/* Results header */}
          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-foreground font-medium">
                {questions.length} questão(ões) gerada(s) — <span className="text-primary">{selected.size} selecionada(s)</span>
              </p>
              {generationTime !== null && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  <Clock className="h-3 w-3" />
                  {generationTime < 60
                    ? `${generationTime.toFixed(1)}s`
                    : `${Math.floor(generationTime / 60)}m ${Math.round(generationTime % 60)}s`}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(questions.map((_, i) => i)))}>Selecionar todas</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Limpar seleção</Button>
            </div>
          </div>

          {/* Questions list */}
          <div className="space-y-4">
            {questions.map((q, i) => (
              <QuestionCard
                key={i}
                index={i}
                question={q}
                isSelected={selected.has(i)}
                isEditing={editingIdx === i}
                isExpanded={expandedIdx === i}
                onToggleSelect={() => toggleSelect(i)}
                onStartEdit={() => setEditingIdx(i)}
                onStopEdit={() => setEditingIdx(null)}
                onToggleExpand={() => setExpandedIdx(expandedIdx === i ? null : i)}
                onUpdate={(updates) => updateQuestion(i, updates)}
                onAddTag={(tag) => addTagToQuestion(i, tag)}
                onRemoveTag={(tag) => removeTagFromQuestion(i, tag)}
                availableSubjects={availableSubjects}
                classGroups={dbClassGroups}
              />
            ))}
          </div>

          {/* Bottom action bar */}
          <div className="glass-card rounded-xl p-4 flex items-center gap-3 sticky bottom-4">
            <Button variant="outline" onClick={reset} className="gap-1.5">
              <Wand2 className="h-4 w-4" /> Gerar novamente
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selected.size === 0) { toast.error("Selecione pelo menos uma questão."); return; }
                setPdfDialogOpen(true);
              }}
              className="gap-1.5"
              disabled={selected.size === 0}
            >
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => navigate(returnTo)}>Cancelar</Button>
            <Button onClick={handleInsert} className="gap-1.5" disabled={selected.size === 0}>
              <CheckCircle2 className="h-4 w-4" />
              Inserir {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </div>
      )}

      <PDFExportDialog
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        defaultSubject={subjectParam}
        defaultGrade={gradeParam}
        onExport={(config: PDFHeaderConfig) => {
          const selectedQuestions = questions.filter((_, i) => selected.has(i));
          exportQuestionsToPDF(selectedQuestions, config);
        }}
      />
    </div>
  );
}

/* ==================== Question Card Component ==================== */

interface QuestionCardProps {
  index: number;
  question: GeneratedQuestion;
  isSelected: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<GeneratedQuestion>) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  availableSubjects: { id: string; name: string }[];
  classGroups: string[];
}

function QuestionCard({
  index,
  question: q,
  isSelected,
  isEditing,
  isExpanded,
  onToggleSelect,
  onStartEdit,
  onStopEdit,
  onToggleExpand,
  onUpdate,
  onAddTag,
  onRemoveTag,
  availableSubjects,
  classGroups,
}: QuestionCardProps) {
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag) { onAddTag(tag); setTagInput(""); }
  };

  return (
    <div
      className={cn(
        "glass-card rounded-xl overflow-hidden transition-all",
        isSelected ? "ring-2 ring-primary/40 shadow-md" : "hover:shadow-sm"
      )}
    >
      {/* Card header */}
      <div className="p-4 flex items-start gap-3">
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="mt-1 cursor-pointer" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {typeLabels[q.type] || q.type}
            </span>
            <span className={cn("text-[11px] font-medium px-2.5 py-0.5 rounded-full", difficultyColors[q.difficulty])}>
              {difficultyLabels[q.difficulty]}
            </span>
            {q.topic && <span className="text-[11px] text-muted-foreground italic">{q.topic}</span>}
            <span className="text-[10px] text-muted-foreground ml-auto">Questão {index + 1}</span>
          </div>

          {/* Content preview or editor */}
          {isEditing ? (
            <div className="space-y-4">
              {/* Rich editor for content */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Enunciado</Label>
                <div className="border border-input rounded-lg overflow-hidden">
                  <RichEditor
                    content={q.content}
                    onChange={(html) => onUpdate({ content: html })}
                    placeholder="Edite o enunciado da questão..."
                  />
                </div>
              </div>

              {/* Options editor for objetiva */}
              {q.type === "objetiva" && q.options && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Alternativas (uma por linha)</Label>
                  <Textarea
                    className="text-sm min-h-[120px]"
                    value={q.options.join("\n")}
                    onChange={(e) => onUpdate({ options: e.target.value.split("\n") })}
                  />
                </div>
              )}

              {/* Metadata grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                  <Select value={q.type} onValueChange={(v) => onUpdate({ type: v as any })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="objetiva">Múltipla Escolha</SelectItem>
                      <SelectItem value="verdadeiro_falso">V ou F</SelectItem>
                      <SelectItem value="dissertativa">Dissertativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Dificuldade</Label>
                  <Select value={q.difficulty} onValueChange={(v) => onUpdate({ difficulty: v as any })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facil">Fácil</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="dificil">Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Disciplina</Label>
                  <Select value={q.subjectId || ""} onValueChange={(v) => onUpdate({ subjectId: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {availableSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Série / Turma</Label>
                  <Select value={q.grade || ""} onValueChange={(v) => onUpdate({ grade: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {classGroups.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Answer */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Resposta correta</Label>
                <Input className="h-9 text-sm" value={q.answer} onChange={(e) => onUpdate({ answer: e.target.value })} />
              </div>

              {/* Tópico */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Tópico</Label>
                <Input className="h-9 text-sm" value={q.topic} onChange={(e) => onUpdate({ topic: e.target.value })} />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Tags</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                    placeholder="Digite e pressione Enter"
                    className="flex-1 h-9 text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTag} className="h-9">
                    <Tag className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
                {q.tags && q.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {q.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                        <button onClick={() => onRemoveTag(tag)} className="ml-0.5 hover:text-destructive transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Explanation */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Explicação</Label>
                <Textarea className="text-sm min-h-[60px]" value={q.explanation} onChange={(e) => onUpdate({ explanation: e.target.value })} />
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={onStopEdit} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" /> Concluir edição
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMathInHTML(q.content) }} />
              {q.options && q.options.length > 0 && (
                <div className="mt-2 space-y-1">
                  {q.options.map((opt, j) => (
                    <p key={j} className={cn("text-xs pl-3", opt.startsWith(q.answer) ? "font-semibold text-emerald-600" : "text-muted-foreground")}>
                      <span dangerouslySetInnerHTML={{ __html: `${String.fromCharCode(65 + j)}) ${renderMathInText(opt)}` }} />
                    </p>
                  ))}
                </div>
              )}

              {/* Tags display */}
              {q.tags && q.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {q.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Collapsible explanation */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <p className="text-xs text-muted-foreground italic" dangerouslySetInnerHTML={{ __html: `💡 ${renderMathInText(q.explanation)}` }} />
                  <p className="text-xs text-muted-foreground"><strong>Resposta:</strong> <span dangerouslySetInnerHTML={{ __html: renderMathInText(q.answer) }} /></p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onStartEdit} title="Editar com editor completo">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleExpand}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
