import { useState, useRef } from "react";
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
import { FileDown, Upload, X, Image as ImageIcon } from "lucide-react";

export interface PDFHeaderConfig {
  title: string;
  author: string;
  institution: string;
  subject: string;
  grade: string;
  logoBase64: string | null;
  pageBreakPerQuestion: boolean;
}

interface PDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: PDFHeaderConfig) => void;
  defaultSubject?: string;
  defaultGrade?: string;
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
    logoBase64: null,
    pageBreakPerQuestion: false,
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Exportar PDF — Cabeçalho
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Logo */}
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

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Título do documento</Label>
            <Input
              value={config.title}
              onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Avaliação Bimestral"
            />
          </div>

          {/* Institution */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nome da instituição</Label>
            <Input
              value={config.institution}
              onChange={(e) => setConfig((prev) => ({ ...prev, institution: e.target.value }))}
              placeholder="Ex: Colégio Exemplo"
            />
          </div>

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

          {/* Grade */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Série / Turma</Label>
            <Input
              value={config.grade}
              onChange={(e) => setConfig((prev) => ({ ...prev, grade: e.target.value }))}
              placeholder="Ex: 9º Ano A"
            />
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
