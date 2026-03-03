import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FileText, ChevronDown, ChevronUp, MessageSquare, FileEdit, Eye,
  CheckCircle2, Printer, FileSpreadsheet, ClipboardList, Pencil, Trash2,
} from "lucide-react";
import { Simulado, SimuladoSubject } from "@/hooks/useSimulados";
import {
  statusColors, statusLabels, subjectStatusColors, subjectStatusLabels,
  buildRanges, totalQuestions,
} from "./SimuladoConstants";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  sim: Simulado;
  isExpanded: boolean;
  onToggle: () => void;
  isCoordinator: boolean;
  isProfessor: boolean;
  onProfessorEdit: (sub: SimuladoSubject) => void;
  onRevision: (sub: SimuladoSubject) => void;
  onApprove: (subjectId: string) => void;
  onApproveAll: (sim: Simulado) => void;
  onGenerateFile: (sim: Simulado) => void;
  onGeneratePDF: (sim: Simulado) => void;
  onGenerateAnswerKey: (sim: Simulado) => void;
  onAnnouncement: (sim: Simulado) => void;
  onAnswerSheet: (sim: Simulado) => void;
  onAnswerKeyEditor: (sim: Simulado) => void;
  onEdit?: (sim: Simulado) => void;
  onDelete?: (sim: Simulado) => void;
}

export default function SimuladoCard({
  sim, isExpanded, onToggle, isCoordinator, isProfessor,
  onProfessorEdit, onRevision, onApprove, onApproveAll,
  onGenerateFile, onGeneratePDF, onGenerateAnswerKey,
  onAnnouncement, onAnswerSheet, onAnswerKeyEditor,
  onEdit, onDelete,
}: Props) {
  const ranged = buildRanges(sim.subjects);
  const submitted = sim.subjects.filter((s) => ["submitted", "approved"].includes(s.status)).length;
  const approved = sim.subjects.filter((s) => s.status === "approved").length;
  const total = sim.subjects.length;
  const allSubmitted = sim.subjects.every((s) => ["submitted", "approved"].includes(s.status));
  const allApproved = sim.subjects.every((s) => s.status === "approved");

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
        <button
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
          onClick={onToggle}
        >
          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{sim.title}</p>
            <p className="text-xs text-muted-foreground">
              {sim.class_groups.join(", ")} · {total} disciplina(s) · Prazo: {sim.deadline || "—"}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={statusColors[sim.status]}>{statusLabels[sim.status]}</Badge>
          <span className="text-xs text-muted-foreground">{submitted}/{total} enviadas</span>

          {isCoordinator && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Editar simulado"
                onClick={(e) => { e.stopPropagation(); onEdit?.(sim); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Excluir simulado"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir simulado?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir "{sim.title}"? Esta ação não pode ser desfeita e todas as disciplinas e resultados associados serão removidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => onDelete?.(sim)}
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          <button onClick={onToggle} className="p-1">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border">
          {isProfessor && sim.announcement && (
            <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-border">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> Comunicado da Coordenação:
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-200 mt-1">{sim.announcement}</p>
            </div>
          )}

          {isCoordinator && (
            <div className="px-5 py-2.5 bg-muted/10 border-b border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Fonte: <strong className="text-foreground">{sim.format.fontFamily}</strong></span>
              <span>Tamanho: <strong className="text-foreground">{sim.format.fontSize}pt</strong></span>
              <span>Colunas: <strong className="text-foreground">{sim.format.columns}</strong></span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="px-5 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Disciplina</th>
                  <th className="px-3 py-2 text-left">Questões</th>
                  <th className="px-3 py-2 text-left">Professor</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ranged.map((s, i) => (
                  <tr key={s.id} className="border-b last:border-b-0 border-border hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-2.5 font-semibold text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{s.subject_name}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-xs font-normal">
                        {s.type === "discursiva" ? "Discursiva" : `${s.rangeLabel} (${s.question_count})`}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.teacher_name || "—"}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={`${subjectStatusColors[s.status]} text-xs`}>
                        {subjectStatusLabels[s.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {isProfessor && ["pending", "in_progress", "revision_requested"].includes(s.status) && (
                          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => onProfessorEdit(s)}>
                            <FileEdit className="h-3 w-3" /> Elaborar
                          </Button>
                        )}
                        {isProfessor && s.status === "revision_requested" && s.revision_notes && (
                          <span className="text-xs text-destructive max-w-[150px] truncate" title={s.revision_notes}>⚠ {s.revision_notes}</span>
                        )}
                        {isCoordinator && s.status === "submitted" && (
                          <>
                            <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => onRevision(s)}>
                              <Eye className="h-3 w-3" /> Revisar
                            </Button>
                            <Button size="sm" className="gap-1 text-xs h-7 bg-green-600 hover:bg-green-700" onClick={() => onApprove(s.id)}>
                              <CheckCircle2 className="h-3 w-3" /> Aprovar
                            </Button>
                          </>
                        )}
                        {isCoordinator && s.status === "approved" && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">✓ Aprovada</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with improved button layout */}
          <div className="px-5 py-4 bg-muted/20 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {approved}/{total} aprovadas · {totalQuestions(sim.subjects)} questões objetivas
              </span>
              {isCoordinator && allSubmitted && !allApproved && (
                <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => onApproveAll(sim)}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar Tudo e Finalizar
                </Button>
              )}
            </div>

            {/* Main action buttons - well distributed */}
            <div className="flex items-center gap-2 flex-wrap">
              {isCoordinator && (
                <>
                  <Button size="sm" className="gap-2 font-semibold" onClick={() => onGenerateFile(sim)}>
                    <FileEdit className="h-3.5 w-3.5" /> Gerar Arquivo
                  </Button>
                  {sim.subjects.some((s) => s.status === "approved") && (
                    <>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => onGeneratePDF(sim)}>
                        <Printer className="h-3.5 w-3.5" /> Imprimir PDF
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => onGenerateAnswerKey(sim)}>
                        <FileText className="h-3.5 w-3.5" /> Gabarito
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => onAnnouncement(sim)}>
                    <MessageSquare className="h-3.5 w-3.5" /> Comunicado
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={() => onAnswerSheet(sim)}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Folha de Respostas
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => onAnswerKeyEditor(sim)}>
                <ClipboardList className="h-3.5 w-3.5" /> Preencher Gabarito
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}