import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Plus,
  GripVertical,
  Columns2,
  Columns3,
  FileUp,
  Sparkles,
  LayoutTemplate,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  saveStandaloneExamToDB,
  type StandaloneExam,
} from "@/data/examContentStore";

/* ─── Types ─── */
export interface UploadedDoc {
  id: string;
  file: File;
  name: string;
  type: "image" | "word" | "pdf" | "other";
  preview?: string;
  questionCount: number;
}

export interface FormattingConfig {
  fontSize: string;
  fontFamily: string;
  columns: number;
  template: string;
}

/* ─── 90-question default model ─── */
const defaultModel90: { name: string; questionCount: number }[] = [
  { name: "Inglês", questionCount: 5 },
  { name: "Gramática", questionCount: 10 },
  { name: "Interpretação Textual", questionCount: 10 },
  { name: "Literatura", questionCount: 8 },
  { name: "Arte", questionCount: 8 },
  { name: "Educação Física", questionCount: 4 },
  { name: "Redação", questionCount: 0 },
  { name: "Geografia", questionCount: 15 },
  { name: "História", questionCount: 8 },
  { name: "Filosofia", questionCount: 4 },
  { name: "Sociologia", questionCount: 3 },
];

/* ─── Constants ─── */
const fontSizes = [
  { label: "9pt", value: "9" },
  { label: "10pt", value: "10" },
  { label: "11pt", value: "11" },
  { label: "12pt", value: "12" },
  { label: "14pt", value: "14" },
];

const fontFamilies = [
  { label: "Arial", value: "Arial" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Calibri", value: "Calibri" },
  { label: "Georgia", value: "Georgia" },
  { label: "Verdana", value: "Verdana" },
  { label: "Courier New", value: "Courier New" },
];

const templates = [
  { id: "padrao", label: "Padrão", description: "Layout simples, uma coluna, sem cabeçalho especial.", fontSize: "12", fontFamily: "Arial", columns: 1 },
  { id: "enem", label: "Estilo ENEM", description: "Duas colunas, fonte 10pt Times New Roman, numeração contínua.", fontSize: "10", fontFamily: "Times New Roman", columns: 2 },
  { id: "personalizado", label: "Personalizado", description: "Duas colunas, fonte Arial 10pt, texto à esquerda, recuo 0.5cm no enunciado, gabarito automático.", fontSize: "10", fontFamily: "Arial", columns: 2 },
  { id: "concurso", label: "Estilo Concurso", description: "Duas colunas, fonte 10pt Arial, layout compacto.", fontSize: "10", fontFamily: "Arial", columns: 2 },
  { id: "vestibular", label: "Estilo Vestibular", description: "Uma coluna, fonte 11pt, espaçamento padrão.", fontSize: "11", fontFamily: "Georgia", columns: 1 },
];

function getDocType(file: File): UploadedDoc["type"] {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (["doc", "docx"].includes(ext)) return "word";
  if (ext === "pdf") return "pdf";
  return "other";
}

/* ─── Helpers ─── */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function wordToHtml(file: File): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

async function processDocuments(docs: UploadedDoc[], formatting: FormattingConfig): Promise<string> {
  const parts: string[] = [];
  const fontStyle = `font-family:'${formatting.fontFamily}',${formatting.fontFamily === "Times New Roman" ? "serif" : "sans-serif"};font-size:${formatting.fontSize}pt`;

  for (const doc of docs) {
    try {
      if (doc.type === "image") {
        const base64 = await fileToBase64(doc.file);
        parts.push(`<p><img src="${base64}" alt="${doc.name}" style="max-width:100%;height:auto" /></p>`);
      } else if (doc.type === "word") {
        const html = await wordToHtml(doc.file);
        parts.push(`<div style="${fontStyle}">${html}</div>`);
      } else if (doc.type === "pdf") {
        const base64 = await fileToBase64(doc.file);
        parts.push(
          `<p style="${fontStyle}"><strong>📄 ${doc.name}</strong></p>` +
          `<p style="color:#666;font-size:0.85em">Documento PDF importado. Use o gerador de IA para extrair e formatar as questões.</p>` +
          `<p><a href="${base64}" target="_blank" style="color:#2563eb">Visualizar PDF</a></p>`
        );
      } else {
        parts.push(`<p style="${fontStyle};color:#666"><em>Arquivo "${doc.name}" importado.</em></p>`);
      }
    } catch (err) {
      console.error(`Error processing ${doc.name}:`, err);
      parts.push(`<p style="color:red"><em>Erro ao processar "${doc.name}".</em></p>`);
    }
  }
  return parts.join("\n<hr>\n");
}

/* ─── Page Component ─── */
export default function NovoSimuladoAvulsoPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState("");
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [formatting, setFormatting] = useState<FormattingConfig>({
    fontSize: "12",
    fontFamily: "Arial",
    columns: 1,
    template: "padrao",
  });
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isApplyingTemplate = useRef(false);

  const docRanges = documents.reduce<{ start: number; end: number }[]>((acc, doc, i) => {
    const start = i === 0 ? 1 : acc[i - 1].end + 1;
    const end = start + doc.questionCount - 1;
    acc.push({ start, end });
    return acc;
  }, []);

  const totalQuestions = documents.reduce((sum, d) => sum + d.questionCount, 0);

  const updateDocQuestionCount = (id: string, count: number) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, questionCount: Math.max(0, count) } : d)));
  };

  const updateDocName = (id: string, name: string) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newDocs: UploadedDoc[] = Array.from(files).map((file) => {
      const type = getDocType(file);
      return { id: crypto.randomUUID(), file, name: file.name, type, preview: type === "image" ? URL.createObjectURL(file) : undefined, questionCount: 5 };
    });
    setDocuments((prev) => [...prev, ...newDocs]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDropZone = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); handleFiles(e.dataTransfer.files); };
  const handleDragOverZone = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeaveZone = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };

  const removeDoc = (id: string) => {
    setDocuments((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (doc?.preview) URL.revokeObjectURL(doc.preview);
      return prev.filter((d) => d.id !== id);
    });
  };

  const applyTemplate = (templateId: string) => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      isApplyingTemplate.current = true;
      setFormatting({ fontSize: tmpl.fontSize, fontFamily: tmpl.fontFamily, columns: tmpl.columns, template: tmpl.id });
      setTimeout(() => { isApplyingTemplate.current = false; }, 100);
    }
  };

  const updateCustomFormatting = (updates: Partial<FormattingConfig>) => {
    if (isApplyingTemplate.current) return;
    setFormatting((f) => ({ ...f, ...updates, template: "custom" }));
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setDocuments((prev) => {
      const newDocs = [...prev];
      const [dragged] = newDocs.splice(draggedIndex, 1);
      newDocs.splice(index, 0, dragged);
      return newDocs;
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const applyModel90 = () => {
    const placeholders: UploadedDoc[] = defaultModel90.map((item) => ({
      id: crypto.randomUUID(),
      file: new File([], `${item.name}.placeholder`),
      name: item.name,
      type: "other" as const,
      questionCount: item.questionCount,
    }));
    setDocuments(placeholders);
    applyTemplate("enem");
    toast({ title: "Modelo de 90 questões aplicado!" });
  };

  const handleConfirm = async () => {
    if (!user || !profile?.company_id || !title.trim()) return;
    setIsProcessing(true);

    try {
      let content = "";
      if (documents.length > 0) {
        content = await processDocuments(documents, formatting);
      }

      const id = `sim-avulso-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const exam: StandaloneExam = { id, title: title.trim(), content, createdAt: now, updatedAt: now, status: "in_progress" };
      await saveStandaloneExamToDB(exam, user.id, profile.company_id);

      const fmtParams = new URLSearchParams({
        ff: formatting.fontFamily,
        fs: formatting.fontSize,
        cols: String(formatting.columns),
        tmpl: formatting.template,
      });

      toast({ title: "Simulado avulso criado!" });
      navigate(`/provas/editor/${id}?${fmtParams.toString()}`);
    } catch (err) {
      console.error("Error creating sim avulso:", err);
      toast({ title: "Erro ao processar documentos.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const docTypeIcon = (type: UploadedDoc["type"]) => {
    switch (type) {
      case "image": return <ImageIcon className="h-4 w-4 text-primary" />;
      case "word": return <FileText className="h-4 w-4 text-blue-500" />;
      case "pdf": return <FileText className="h-4 w-4 text-destructive" />;
      default: return <FileUp className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const docTypeBadge = (type: UploadedDoc["type"]) => {
    const map: Record<string, { label: string; className: string }> = {
      image: { label: "Imagem", className: "bg-primary/10 text-primary" },
      word: { label: "Word", className: "bg-blue-500/10 text-blue-600" },
      pdf: { label: "PDF", className: "bg-destructive/10 text-destructive" },
      other: { label: "Arquivo", className: "bg-muted text-muted-foreground" },
    };
    const m = map[type] || map.other;
    return <Badge className={cn("text-[10px]", m.className)}>{m.label}</Badge>;
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/simulados")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Novo Simulado Avulso
          </h1>
          <p className="text-sm text-muted-foreground">Configure o simulado, importe documentos e escolha o formato desejado.</p>
        </div>
      </div>

      {/* Title */}
      <Card className="p-5 space-y-2">
        <Label htmlFor="sim-title" className="text-base font-semibold">Título do Simulado</Label>
        <Input
          id="sim-title"
          placeholder="Ex: Simulado ENEM 2026 - 1ª Aplicação"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="text-base"
        />
      </Card>

      {/* Document Import */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <Label className="text-base font-semibold">Documentos para importação</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Insira imagens, arquivos Word (.docx) ou PDFs. Arraste para reordenar.
              </p>
            </div>
            {documents.length > 0 && (
              <div className="flex items-center gap-2">
                <Progress value={Math.min((totalQuestions / 90) * 100, 100)} className="w-28 h-2.5" />
                <Badge variant={totalQuestions === 90 ? "default" : "secondary"} className="text-sm font-semibold px-3 py-1">
                  {totalQuestions}/90
                </Badge>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={applyModel90}>
            <LayoutTemplate className="h-4 w-4" />
            Modelo 90 questões
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.doc,.docx,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div
          onDrop={handleDropZone}
          onDragOver={handleDragOverZone}
          onDragLeave={handleDragLeaveZone}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={cn(
            "w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-lg h-24 cursor-pointer transition-all",
            isDragOver ? "border-primary bg-primary/10 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/50",
            isProcessing && "opacity-60 pointer-events-none"
          )}
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <div className="text-left">
            <p className="text-sm font-medium">Clique ou arraste arquivos aqui</p>
            <p className="text-xs text-muted-foreground">Imagens, Word (.docx) ou PDF</p>
          </div>
        </div>

        {documents.length > 0 && (
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="w-9 shrink-0" />
              <span className="flex-1">Documento</span>
              <span className="w-20 text-center shrink-0">Questões</span>
              <span className="w-28 text-center shrink-0">Numeração</span>
              <span className="w-16 shrink-0" />
            </div>
            {documents.map((doc, index) => (
              <div
                key={doc.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-all cursor-grab active:cursor-grabbing",
                  dragOverIndex === index && "border-primary bg-primary/5",
                  draggedIndex === index && "opacity-50"
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{index + 1}.</span>
                {docTypeIcon(doc.type)}
                <Input
                  value={doc.name}
                  onChange={(e) => updateDocName(doc.id, e.target.value)}
                  className="h-7 flex-1 text-xs truncate"
                />
                <Input
                  type="number"
                  min={0}
                  value={doc.questionCount}
                  onChange={(e) => updateDocQuestionCount(doc.id, parseInt(e.target.value) || 0)}
                  className="h-7 w-20 text-xs text-center shrink-0"
                />
                <span className="w-28 text-center text-xs font-medium text-muted-foreground shrink-0">
                  {docRanges[index]?.start} a {docRanges[index]?.end}
                </span>
                <div className="flex items-center gap-1 w-16 shrink-0 justify-end">
                  {docTypeBadge(doc.type)}
                  <button onClick={() => removeDoc(doc.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                {documents.length} documento{documents.length !== 1 ? "s" : ""} · {totalQuestions} questões — arraste para reordenar
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={() => {
                  setDocuments((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      file: new File([], "nova-disciplina.placeholder"),
                      name: "Nova Disciplina",
                      type: "other" as const,
                      questionCount: 5,
                    },
                  ]);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar disciplina
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Formatting Templates */}
      <Card className="p-5 space-y-3">
        <Label className="text-base font-semibold flex items-center gap-1.5">
          <LayoutTemplate className="h-4 w-4" />
          Modelo de Formatação
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {templates.map((tmpl) => (
            <Card
              key={tmpl.id}
              className={cn(
                "p-3 cursor-pointer transition-all hover:shadow-sm border-2",
                formatting.template === tmpl.id ? "border-primary bg-primary/5" : "border-transparent hover:border-border"
              )}
              onClick={() => applyTemplate(tmpl.id)}
            >
              <p className="font-medium text-sm text-foreground">{tmpl.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tmpl.description}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{tmpl.fontSize}pt</Badge>
                <Badge variant="outline" className="text-[10px]">{tmpl.fontFamily}</Badge>
                <Badge variant="outline" className="text-[10px]">{tmpl.columns === 1 ? "1 col" : `${tmpl.columns} col`}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Custom Formatting */}
      <Card className="p-5 space-y-3">
        <Label className="text-base font-semibold">Personalizar Formatação</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tamanho da Fonte</Label>
            <Select value={formatting.fontSize} onValueChange={(v) => updateCustomFormatting({ fontSize: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fontSizes.map((fs) => (<SelectItem key={fs.value} value={fs.value}>{fs.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo de Fonte</Label>
            <Select value={formatting.fontFamily} onValueChange={(v) => updateCustomFormatting({ fontFamily: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fontFamilies.map((ff) => (
                  <SelectItem key={ff.value} value={ff.value}><span style={{ fontFamily: ff.value }}>{ff.label}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Colunas</Label>
            <div className="flex gap-1">
              {[1, 2, 3].map((cols) => (
                <Button
                  key={cols}
                  variant={formatting.columns === cols ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => updateCustomFormatting({ columns: cols })}
                >
                  {cols === 1 ? "1" : cols === 2 ? <Columns2 className="h-4 w-4" /> : <Columns3 className="h-4 w-4" />}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate("/simulados")}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm} disabled={!title.trim() || isProcessing} className="gap-2">
          {isProcessing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Processando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {documents.length > 0 ? "Criar e processar documentos" : "Criar e abrir editor"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
