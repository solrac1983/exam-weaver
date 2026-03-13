import { useState } from "react";
import { X, SpellCheck, AlertCircle, BookOpen, Paintbrush, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface SpellSuggestion {
  original: string;
  correction: string;
  type: "ortografia" | "gramatica" | "estilo";
  explanation: string;
}

interface SpellCheckPanelProps {
  suggestions: SpellSuggestion[];
  isLoading: boolean;
  onClose: () => void;
  onApply: (suggestion: SpellSuggestion) => void;
  onApplyAll: () => void;
}

const typeConfig = {
  ortografia: { label: "Ortografia", icon: SpellCheck, color: "text-destructive", bg: "bg-destructive/10" },
  gramatica: { label: "Gramática", icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
  estilo: { label: "Estilo", icon: BookOpen, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
};

export function SpellCheckPanel({ suggestions, isLoading, onClose, onApply, onApplyAll }: SpellCheckPanelProps) {
  const [appliedIndices, setAppliedIndices] = useState<Set<number>>(new Set());

  const handleApply = (suggestion: SpellSuggestion, index: number) => {
    onApply(suggestion);
    setAppliedIndices((prev) => new Set(prev).add(index));
  };

  const remainingCount = suggestions.length - appliedIndices.size;

  return (
    <div className="w-[320px] border-l bg-card flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <SpellCheck className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Revisão com IA</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm">Analisando texto...</span>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
          <Check className="h-10 w-10 text-green-500" />
          <span className="text-sm font-medium text-foreground">Nenhum problema encontrado!</span>
          <span className="text-xs text-center">Seu texto está correto. Continue o bom trabalho!</span>
        </div>
      ) : (
        <>
          <div className="px-4 py-2 flex items-center justify-between border-b">
            <span className="text-xs text-muted-foreground">
              {remainingCount} {remainingCount === 1 ? "sugestão" : "sugestões"} restante{remainingCount !== 1 ? "s" : ""}
            </span>
            {remainingCount > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onApplyAll}>
                <Paintbrush className="h-3 w-3 mr-1" /> Aplicar todas
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {suggestions.map((s, i) => {
                const config = typeConfig[s.type];
                const applied = appliedIndices.has(i);
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-3 transition-all",
                      applied ? "opacity-50 bg-muted/30" : "hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className={cn("text-[10px] gap-1", config.bg, config.color)}>
                        <config.icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      {!applied && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10"
                          onClick={() => handleApply(s, i)}
                        >
                          Aplicar
                        </Button>
                      )}
                      {applied && (
                        <Badge variant="outline" className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/20">
                          <Check className="h-3 w-3 mr-0.5" /> Aplicado
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="text-muted-foreground">De: </span>
                        <span className="line-through text-destructive/80">{s.original}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Para: </span>
                        <span className="font-medium text-green-700 dark:text-green-400">{s.correction}</span>
                      </div>
                      <p className="text-muted-foreground mt-1 leading-relaxed">{s.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
