/**
 * AnswerKeyPanel — side panel that lists the auto-generated answer key and
 * surfaces validator issues. Reads directly from the editor on every render
 * cycle triggered by the parent (which subscribes to Tiptap updates).
 */
import { useMemo } from "react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { buildAnswerKey, groupBySubject, serializeAnswerKey } from "@/editor-core/education/AnswerKeyModel";
import { validateExam, type IssueSeverity } from "@/editor-core/education/ExamValidator";

interface AnswerKeyPanelProps {
  editor: Editor;
  onClose: () => void;
  /** A counter that bumps whenever the editor updates so memos refresh. */
  refreshKey: number;
}

const sevIcon: Record<IssueSeverity, React.ElementType> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};
const sevColor: Record<IssueSeverity, string> = {
  error: "text-destructive",
  warning: "text-yellow-500",
  info: "text-muted-foreground",
};

export function AnswerKeyPanel({ editor, onClose, refreshKey }: AnswerKeyPanelProps) {
  const entries = useMemo(() => buildAnswerKey(editor), [editor, refreshKey]);
  const issues = useMemo(() => validateExam(editor), [editor, refreshKey]);
  const grouped = useMemo(() => groupBySubject(entries), [entries]);

  const copyKey = () => {
    const text = serializeAnswerKey(entries);
    if (!text) {
      toast.info("Nenhuma resposta marcada ainda.");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Gabarito copiado!");
  };

  return (
    <aside className="w-[300px] shrink-0 border-l bg-background flex flex-col h-full">
      <header className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">Gabarito & Validação</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Gabarito ({entries.length})
              </span>
              <Button variant="ghost" size="sm" onClick={copyKey} className="h-7 px-2">
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>

            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Insira questões pela aba <strong>Provas</strong> para gerar o gabarito.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(grouped).map(([subject, list]) => (
                  <div key={subject}>
                    {Object.keys(grouped).length > 1 && (
                      <div className="text-[11px] font-medium text-muted-foreground mb-1">{subject}</div>
                    )}
                    <div className="grid grid-cols-5 gap-1">
                      {list.map((e) => (
                        <div
                          key={e.questionId}
                          className={`text-xs rounded border px-1.5 py-1 text-center ${
                            e.letter
                              ? "border-primary/40 bg-primary/5 text-primary font-semibold"
                              : "border-dashed border-destructive/40 text-destructive"
                          }`}
                          title={e.letter ? `Questão ${e.number}: ${e.letter}` : `Questão ${e.number}: sem resposta`}
                        >
                          {e.number}-{e.letter ?? "?"}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Validação ({issues.length})
            </div>
            {issues.length === 0 ? (
              <Badge variant="secondary" className="text-[11px]">Tudo certo</Badge>
            ) : (
              <ul className="space-y-1.5">
                {issues.map((it, i) => {
                  const Icon = sevIcon[it.severity];
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${sevColor[it.severity]}`} />
                      <span>
                        {it.questionNumber !== undefined && (
                          <strong className="mr-1">Q{it.questionNumber}:</strong>
                        )}
                        {it.message}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
