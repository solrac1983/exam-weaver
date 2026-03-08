import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface DiagnosticHistoryItem {
  id: string;
  created_at: string;
  riskLevel?: string;
}

interface DiagnosticHistorySelectorProps {
  items: DiagnosticHistoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

const RISK_LABELS: Record<string, string> = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
};

export default function DiagnosticHistorySelector({ items, selectedId, onSelect, onDelete, canDelete }: DiagnosticHistorySelectorProps) {
  if (items.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <History className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={selectedId || ""} onValueChange={onSelect}>
        <SelectTrigger className="h-8 w-[220px] text-xs">
          <SelectValue placeholder="Selecionar diagnóstico" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item, index) => (
            <SelectItem key={item.id} value={item.id} className="text-xs">
              <div className="flex items-center gap-2">
                <span>
                  {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
                {index === 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">Atual</Badge>
                )}
                {item.riskLevel && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {RISK_LABELS[item.riskLevel] || item.riskLevel}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Badge variant="outline" className="text-[10px]">{items.length} versões</Badge>
      {canDelete && selectedId && items.length > 1 && selectedId !== items[0]?.id && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir diagnóstico?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta versão do diagnóstico será removida permanentemente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete?.(selectedId)}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
