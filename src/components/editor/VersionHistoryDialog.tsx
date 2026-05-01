import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RotateCcw, Save, History } from "lucide-react";
import { useState } from "react";
import { useDocumentVersions, type DocumentType } from "@/hooks/useDocumentVersions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType | null;
  documentId: string | null;
  currentContent: string;
  currentTitle: string;
  onRestore: (content: string) => void;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  documentType,
  documentId,
  currentContent,
  currentTitle,
  onRestore,
}: VersionHistoryDialogProps) {
  const { versions, loading, createSnapshot, deleteVersion } = useDocumentVersions(
    open ? documentType : null,
    open ? documentId : null
  );
  const [label, setLabel] = useState("");

  const handleSnapshot = async () => {
    await createSnapshot(currentContent, currentTitle, label.trim());
    setLabel("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico de versões
          </DialogTitle>
          <DialogDescription>
            Salve manualmente um snapshot do documento atual ou restaure uma versão anterior.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Rótulo opcional (ex: 'antes da revisão final')"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSnapshot} disabled={!documentId} className="gap-1.5">
            <Save className="h-4 w-4" /> Salvar versão
          </Button>
        </div>

        <ScrollArea className="h-[360px] rounded-md border">
          {loading && <div className="p-4 text-sm text-muted-foreground">Carregando...</div>}
          {!loading && versions.length === 0 && (
            <div className="p-6 text-sm text-center text-muted-foreground">
              Nenhuma versão salva ainda. Clique em "Salvar versão" para criar a primeira.
            </div>
          )}
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>v{v.version_number}</span>
                  {v.label && (
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs">
                      {v.label}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: ptBR })}
                  {" · "}
                  {Math.round((v.content?.length || 0) / 1024)} KB
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRestore(v.content);
                  onOpenChange(false);
                }}
                className="gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteVersion(v.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
