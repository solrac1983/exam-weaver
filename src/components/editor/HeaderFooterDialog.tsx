import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { HeaderFooterConfig } from "./PageHeaderFooterOverlay";

interface HeaderFooterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: HeaderFooterConfig;
  onSave: (config: HeaderFooterConfig) => void;
}

export function HeaderFooterDialog({ open, onOpenChange, config, onSave }: HeaderFooterDialogProps) {
  const [local, setLocal] = useState<HeaderFooterConfig>(config);

  const update = (key: keyof HeaderFooterConfig, value: any) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(local);
    onOpenChange(false);
  };

  const applyABNT = () => {
    // ABNT NBR 14724: cabeçalho com título e rodapé com numeração à direita,
    // primeira página sem cabeçalho/rodapé.
    setLocal({
      headerLeft: "",
      headerCenter: local.headerCenter || "Título do Trabalho",
      headerRight: "",
      footerLeft: "",
      footerCenter: "",
      footerRight: "",
      showPageNumber: true,
      pageNumberPosition: "right",
      firstPageDifferent: true,
    });
  };

  const handleClear = () => {
    const cleared: HeaderFooterConfig = {
      headerLeft: "", headerCenter: "", headerRight: "",
      footerLeft: "", footerCenter: "", footerRight: "",
      showPageNumber: false, pageNumberPosition: "center", firstPageDifferent: false,
    };
    onSave(cleared);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cabeçalho e Rodapé</DialogTitle>
          <DialogDescription>Configure o conteúdo que aparece no topo e rodapé de cada página.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Header */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Cabeçalho</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Esquerda</Label>
                <Input
                  value={local.headerLeft}
                  onChange={(e) => update("headerLeft", e.target.value)}
                  placeholder="Ex: Nome da Escola"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Centro</Label>
                <Input
                  value={local.headerCenter}
                  onChange={(e) => update("headerCenter", e.target.value)}
                  placeholder="Ex: Avaliação Bimestral"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Direita</Label>
                <Input
                  value={local.headerRight}
                  onChange={(e) => update("headerRight", e.target.value)}
                  placeholder="Ex: Data"
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Rodapé</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Esquerda</Label>
                <Input
                  value={local.footerLeft}
                  onChange={(e) => update("footerLeft", e.target.value)}
                  placeholder="Ex: Confidencial"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Centro</Label>
                <Input
                  value={local.footerCenter}
                  onChange={(e) => update("footerCenter", e.target.value)}
                  placeholder="Ex: www.escola.com"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Direita</Label>
                <Input
                  value={local.footerRight}
                  onChange={(e) => update("footerRight", e.target.value)}
                  placeholder=""
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Page numbering */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Numeração de Páginas</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={local.showPageNumber}
                  onCheckedChange={(v) => update("showPageNumber", v)}
                />
                <Label className="text-xs">Exibir número da página</Label>
              </div>
              {local.showPageNumber && (
                <Select
                  value={local.pageNumberPosition}
                  onValueChange={(v) => update("pageNumberPosition", v)}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Separator />

          {/* Options */}
          <div className="flex items-center gap-2">
            <Switch
              checked={local.firstPageDifferent}
              onCheckedChange={(v) => update("firstPageDifferent", v)}
            />
            <Label className="text-xs">Primeira página diferente (sem cabeçalho)</Label>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Limpar tudo
            </Button>
            <Button variant="secondary" size="sm" onClick={applyABNT} title="Aplicar configuração ABNT NBR 14724">
              Padrão ABNT
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave}>
              Aplicar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
