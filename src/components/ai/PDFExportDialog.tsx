import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileDown, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TemplateHeader } from "@/components/templates/TemplateConstants";
import { showInvokeError } from "@/lib/invokeFunction";

export interface PDFHeaderConfig {
  title: string;
  author: string;
  institution: string;
  subject: string;
  grade: string;
  studentName: string;
  className: string;
  examDate: string;
  logoBase64: string | null;
  /** When set, this image (base64) is rendered as a full-width banner at the top, replacing the standard text header. */
  headerImageBase64: string | null;
  /** Selected header template id (for UI state only). */
  headerTemplateId: string | null;
  pageBreakPerQuestion: boolean;
  includeAnswerKey: boolean;
}

interface PDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: PDFHeaderConfig) => void;
  defaultSubject?: string;
  defaultGrade?: string;
}

async function urlToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Failed to fetch header image:", err);
    return null;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function PDFExportDialog({
  open,
  onOpenChange,
  onExport,
  defaultSubject = "",
  defaultGrade = "",
}: PDFExportDialogProps) {
  const [config, setConfig] = useState<PDFHeaderConfig>({
    title: "Avaliação",
    author: "",
    institution: "",
    subject: defaultSubject,
    grade: defaultGrade,
    studentName: "",
    className: "",
    examDate: todayISO(),
    logoBase64: null,
    headerImageBase64: null,
    headerTemplateId: null,
    pageBreakPerQuestion: false,
    includeAnswerKey: true,
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [headerTemplates, setHeaderTemplates] = useState<TemplateHeader[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingHeader, setLoadingHeader] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      const { data, error } = await supabase
        .from("template_headers")
        .select("*")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (error) {
          console.error(error);
          showInvokeError("Não foi possível carregar os modelos de cabeçalho.");
        } else {
          setHeaderTemplates((data || []) as TemplateHeader[]);
        }
        setLoadingTemplates(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setConfig((prev) => ({ ...prev, logoBase64: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleSelectHeaderTemplate = async (id: string) => {
    if (id === "__none__") {
      setConfig((p) => ({ ...p, headerTemplateId: null, headerImageBase64: null }));
      return;
    }
    const tpl = headerTemplates.find((h) => h.id === id);
    if (!tpl) return;
    setLoadingHeader(true);
    const base64 = await urlToBase64(tpl.file_url);
    setLoadingHeader(false);
    if (!base64) {
      showInvokeError("Não foi possível carregar a imagem do cabeçalho.");
      return;
    }
    setConfig((p) => ({ ...p, headerTemplateId: id, headerImageBase64: base64 }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Exportar PDF — Cabeçalho e dados
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Header template selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Modelo de cabeçalho</Label>
            <Select
              value={config.headerTemplateId ?? "__none__"}
              onValueChange={handleSelectHeaderTemplate}
              disabled={loadingTemplates}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTemplates ? "Carregando..." : "Sem modelo (usar campos abaixo)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem modelo (usar campos abaixo)</SelectItem>
                {headerTemplates.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}{h.segment ? ` — ${h.segment}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingHeader && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando imagem do cabeçalho...
              </p>
            )}
            {config.headerImageBase64 && !loadingHeader && (
              <div className="mt-2 border border-border rounded p-1 bg-muted/30">
                <img src={config.headerImageBase64} alt="Cabeçalho selecionado" className="max-h-20 mx-auto object-contain" />
              </div>
            )}
          </div>

          {/* Logo (only useful when no header image) */}
          {!config.headerImageBase64 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Logotipo da escola/empresa</Label>
              <div className="flex items-center gap-3">
                {config.logoBase64 ? (
                  <div className="relative">
                    <img
                      src={config.logoBase64}
                      alt="Logo"
                      className="h-14 w-auto max-w-[120px] object-contain rounded border border-border p-1"
                    />
                    <button
                      onClick={() => setConfig((prev) => ({ ...prev, logoBase64: null }))}
                      className="absolute -top-1.5 -right-1.5 bg-destructive/90 text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="h-14 w-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-[9px]">Adicionar</span>
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Título do documento</Label>
            <Input
              value={config.title}
              onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Avaliação Bimestral"
            />
          </div>

          {/* Institution (hidden when header image exists, since image carries branding) */}
          {!config.headerImageBase64 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome da instituição</Label>
              <Input
                value={config.institution}
                onChange={(e) => setConfig((prev) => ({ ...prev, institution: e.target.value }))}
                placeholder="Ex: Colégio Exemplo"
              />
            </div>
          )}

          {/* Author + Subject row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Autor / Professor(a)</Label>
              <Input
                value={config.author}
                onChange={(e) => setConfig((prev) => ({ ...prev, author: e.target.value }))}
                placeholder="Nome do autor"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Disciplina</Label>
              <Input
                value={config.subject}
                onChange={(e) => setConfig((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Ex: Matemática"
              />
            </div>
          </div>

          {/* Series + Class */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Série</Label>
              <Input
                value={config.grade}
                onChange={(e) => setConfig((prev) => ({ ...prev, grade: e.target.value }))}
                placeholder="Ex: 9º Ano"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Turma</Label>
              <Input
                value={config.className}
                onChange={(e) => setConfig((prev) => ({ ...prev, className: e.target.value }))}
                placeholder="Ex: A"
              />
            </div>
          </div>

          {/* Student + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome do aluno (opcional)</Label>
              <Input
                value={config.studentName}
                onChange={(e) => setConfig((prev) => ({ ...prev, studentName: e.target.value }))}
                placeholder="Deixe em branco para preenchimento manual"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data da prova</Label>
              <Input
                type="date"
                value={config.examDate}
                onChange={(e) => setConfig((prev) => ({ ...prev, examDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Page break option */}
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="pageBreak"
              checked={config.pageBreakPerQuestion}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, pageBreakPerQuestion: !!checked }))
              }
            />
            <Label htmlFor="pageBreak" className="text-xs font-medium cursor-pointer">
              Uma questão por página (quebra de página entre questões)
            </Label>
          </div>

          {/* Answer key option */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="answerKey"
              checked={config.includeAnswerKey}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, includeAnswerKey: !!checked }))
              }
            />
            <Label htmlFor="answerKey" className="text-xs font-medium cursor-pointer">
              Incluir gabarito ao final do documento
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => { onExport(config); onOpenChange(false); }} className="gap-1.5">
            <FileDown className="h-4 w-4" /> Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
