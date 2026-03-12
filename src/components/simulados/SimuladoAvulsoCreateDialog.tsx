import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  GripVertical,
  Columns2,
  Columns3,
  FileUp,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SimuladoAvulsoConfig {
  title: string;
  documents: UploadedDoc[];
  formatting: FormattingConfig;
}

export interface UploadedDoc {
  id: string;
  file: File;
  name: string;
  type: "image" | "word" | "pdf" | "other";
  preview?: string;
}

export interface FormattingConfig {
  fontSize: string;
  fontFamily: string;
  columns: number;
  template: string;
}

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
  {
    id: "padrao",
    label: "Padrão",
    description: "Layout simples, uma coluna, sem cabeçalho especial.",
    fontSize: "12",
    fontFamily: "Arial",
    columns: 1,
  },
  {
    id: "enem",
    label: "Estilo ENEM",
    description: "Duas colunas, fonte 10pt Times New Roman, numeração contínua.",
    fontSize: "10",
    fontFamily: "Times New Roman",
    columns: 2,
  },
  {
    id: "personalizado",
    label: "Personalizado",
    description: "Duas colunas, questões com bordas, texto justificado, estilo prova oficial.",
    fontSize: "10",
    fontFamily: "Times New Roman",
    columns: 2,
  },
  {
    id: "concurso",
    label: "Estilo Concurso",
    description: "Duas colunas, fonte 10pt Arial, layout compacto.",
    fontSize: "10",
    fontFamily: "Arial",
    columns: 2,
  },
  {
    id: "vestibular",
    label: "Estilo Vestibular",
    description: "Uma coluna, fonte 11pt, espaçamento padrão.",
    fontSize: "11",
    fontFamily: "Georgia",
    columns: 1,
  },
];

function getDocType(file: File): UploadedDoc["type"] {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (["doc", "docx"].includes(ext)) return "word";
  if (ext === "pdf") return "pdf";
  return "other";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: SimuladoAvulsoConfig) => void;
}

export default function SimuladoAvulsoCreateDialog({ open, onOpenChange, onConfirm }: Props) {
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

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    const fileArray = Array.from(files);
    const newDocs: UploadedDoc[] = [];

    for (const file of fileArray) {
      const doc: UploadedDoc = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        type: getDocType(file),
      };
      if (doc.type === "image") {
        doc.preview = URL.createObjectURL(file);
      }
      newDocs.push(doc);
      await new Promise((r) => setTimeout(r, 0));
    }

    setDocuments((prev) => [...prev, ...newDocs]);
    setIsProcessing(false);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeaveZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

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
      setFormatting({
        fontSize: tmpl.fontSize,
        fontFamily: tmpl.fontFamily,
        columns: tmpl.columns,
        template: tmpl.id,
      });
      // Reset flag after React finishes all re-renders and effects
      setTimeout(() => {
        isApplyingTemplate.current = false;
      }, 100);
    }
  };

  const updateCustomFormatting = (updates: Partial<FormattingConfig>) => {
    // Ignore changes triggered by template application
    if (isApplyingTemplate.current) return;
    setFormatting((f) => ({ ...f, ...updates, template: "custom" }));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

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

  const handleConfirm = () => {
    onConfirm({ title: title.trim(), documents, formatting });
    // Reset
    setTitle("");
    setDocuments([]);
    setFormatting({ fontSize: "12", fontFamily: "Arial", columns: 1, template: "padrao" });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Novo Simulado Avulso
          </DialogTitle>
          <DialogDescription>
            Configure o simulado, importe documentos e escolha o formato desejado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="sim-title">Título do Simulado</Label>
            <Input
              id="sim-title"
              placeholder="Ex: Simulado ENEM 2026 - 1ª Aplicação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Document Import */}
          <div className="space-y-2">
            <Label>Documentos para importação</Label>
            <p className="text-xs text-muted-foreground">
              Insira imagens, arquivos Word (.docx) ou PDFs. As questões serão processadas na ordem em que aparecem abaixo. Arraste para reordenar.
            </p>
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
                "w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-lg h-20 cursor-pointer transition-all",
                isDragOver
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/50",
                isProcessing && "opacity-60 pointer-events-none"
              )}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Processando arquivos...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Clique ou arraste arquivos aqui</p>
                    <p className="text-xs text-muted-foreground">Imagens, Word (.docx) ou PDF</p>
                  </div>
                </>
              )}
            </div>

            {documents.length > 0 && (
              <div className="space-y-1.5 mt-2">
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
                    <span className="truncate flex-1 text-foreground">{doc.name}</span>
                    {docTypeBadge(doc.type)}
                    <button
                      onClick={() => removeDoc(doc.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center">
                  {documents.length} documento{documents.length !== 1 ? "s" : ""} — arraste para reordenar
                </p>
              </div>
            )}
          </div>

          {/* Formatting Templates */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <LayoutTemplate className="h-4 w-4" />
              Modelo de Formatação
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((tmpl) => (
                <Card
                  key={tmpl.id}
                  className={cn(
                    "p-3 cursor-pointer transition-all hover:shadow-sm border-2",
                    formatting.template === tmpl.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-border"
                  )}
                  onClick={() => applyTemplate(tmpl.id)}
                >
                  <p className="font-medium text-sm text-foreground">{tmpl.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px]">{tmpl.fontSize}pt</Badge>
                    <Badge variant="outline" className="text-[10px]">{tmpl.fontFamily}</Badge>
                    <Badge variant="outline" className="text-[10px]">{tmpl.columns === 1 ? "1 col" : `${tmpl.columns} col`}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Formatting */}
          <div className="space-y-3">
            <Label>Personalizar Formatação</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tamanho da Fonte</Label>
                <Select value={formatting.fontSize} onValueChange={(v) => updateCustomFormatting({ fontSize: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizes.map((fs) => (
                      <SelectItem key={fs.value} value={fs.value}>{fs.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tipo de Fonte</Label>
                <Select value={formatting.fontFamily} onValueChange={(v) => updateCustomFormatting({ fontFamily: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilies.map((ff) => (
                      <SelectItem key={ff.value} value={ff.value}>
                        <span style={{ fontFamily: ff.value }}>{ff.label}</span>
                      </SelectItem>
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
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!title.trim()} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {documents.length > 0 ? "Criar e processar documentos" : "Criar e abrir editor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
