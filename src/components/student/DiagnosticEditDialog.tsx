import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, Pencil, Trash2, Plus } from "lucide-react";

interface PersonalizedSuggestions {
  weeklyRoutine: { day: string; subject: string; activity: string; duration: string }[];
  studyTips: { tip: string; category: string }[];
  practicalActivities: { subject: string; activity: string; objective: string; frequency: string }[];
  motivationalNote: string;
}

interface DiagnosticEditData {
  summary: string;
  riskLevel: string;
  strengths: { subject: string; detail: string }[];
  weaknesses: { subject: string; detail: string; severity: string }[];
  projections: { subject: string; currentAvg: number; projectedFinal: number; trend: string }[];
  actionPlan: { action: string; priority: string; target: string }[];
  attendanceAlert: string;
  recommendations: string;
  personalizedSuggestions?: PersonalizedSuggestions;
}

interface DiagnosticEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnostic: DiagnosticEditData;
  onExport: (edited: DiagnosticEditData) => void;
}

export default function DiagnosticEditDialog({ open, onOpenChange, diagnostic, onExport }: DiagnosticEditDialogProps) {
  const [edited, setEdited] = useState<DiagnosticEditData>(diagnostic);

  useEffect(() => {
    if (open) setEdited(JSON.parse(JSON.stringify(diagnostic)));
  }, [open, diagnostic]);

  const updateField = <K extends keyof DiagnosticEditData>(key: K, value: DiagnosticEditData[K]) => {
    setEdited(prev => ({ ...prev, [key]: value }));
  };

  const updateSuggestions = (updates: Partial<PersonalizedSuggestions>) => {
    setEdited(prev => ({
      ...prev,
      personalizedSuggestions: prev.personalizedSuggestions
        ? { ...prev.personalizedSuggestions, ...updates }
        : undefined,
    }));
  };

  const removeActionItem = (index: number) => {
    setEdited(prev => ({ ...prev, actionPlan: prev.actionPlan.filter((_, i) => i !== index) }));
  };

  const addActionItem = () => {
    setEdited(prev => ({
      ...prev,
      actionPlan: [...prev.actionPlan, { action: "Nova ação", priority: "media", target: "professor" }],
    }));
  };

  const removeRoutineItem = (index: number) => {
    if (!edited.personalizedSuggestions) return;
    updateSuggestions({
      weeklyRoutine: edited.personalizedSuggestions.weeklyRoutine.filter((_, i) => i !== index),
    });
  };

  const removeActivity = (index: number) => {
    if (!edited.personalizedSuggestions) return;
    updateSuggestions({
      practicalActivities: edited.personalizedSuggestions.practicalActivities.filter((_, i) => i !== index),
    });
  };

  const removeTip = (index: number) => {
    if (!edited.personalizedSuggestions) return;
    updateSuggestions({
      studyTips: edited.personalizedSuggestions.studyTips.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Revisar Diagnóstico antes de Exportar
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="plano">Plano de Ação</TabsTrigger>
              <TabsTrigger value="sugestoes">Sugestões</TabsTrigger>
            </TabsList>

            {/* Tab Geral */}
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div>
                <Label className="text-xs font-medium">Resumo Geral</Label>
                <Textarea
                  value={edited.summary}
                  onChange={e => updateField("summary", e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Alerta de Frequência</Label>
                <Textarea
                  value={edited.attendanceAlert}
                  onChange={e => updateField("attendanceAlert", e.target.value)}
                  rows={2}
                  className="mt-1"
                  placeholder="Deixe vazio se não houver alerta"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Recomendações para Pais e Professores</Label>
                <Textarea
                  value={edited.recommendations}
                  onChange={e => updateField("recommendations", e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Strengths */}
              <div>
                <Label className="text-xs font-medium text-green-700 dark:text-green-400">Pontos Fortes</Label>
                <div className="space-y-2 mt-1">
                  {edited.strengths.map((s, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <Input
                        value={s.subject}
                        onChange={e => {
                          const arr = [...edited.strengths];
                          arr[i] = { ...arr[i], subject: e.target.value };
                          updateField("strengths", arr);
                        }}
                        className="w-32 text-xs"
                        placeholder="Disciplina"
                      />
                      <Input
                        value={s.detail}
                        onChange={e => {
                          const arr = [...edited.strengths];
                          arr[i] = { ...arr[i], detail: e.target.value };
                          updateField("strengths", arr);
                        }}
                        className="flex-1 text-xs"
                        placeholder="Detalhe"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => updateField("strengths", edited.strengths.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div>
                <Label className="text-xs font-medium text-destructive">Pontos Fracos</Label>
                <div className="space-y-2 mt-1">
                  {edited.weaknesses.map((w, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <Input
                        value={w.subject}
                        onChange={e => {
                          const arr = [...edited.weaknesses];
                          arr[i] = { ...arr[i], subject: e.target.value };
                          updateField("weaknesses", arr);
                        }}
                        className="w-32 text-xs"
                        placeholder="Disciplina"
                      />
                      <Input
                        value={w.detail}
                        onChange={e => {
                          const arr = [...edited.weaknesses];
                          arr[i] = { ...arr[i], detail: e.target.value };
                          updateField("weaknesses", arr);
                        }}
                        className="flex-1 text-xs"
                        placeholder="Detalhe"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => updateField("weaknesses", edited.weaknesses.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab Plano de Ação */}
            <TabsContent value="plano" className="space-y-3 mt-4">
              {edited.actionPlan.map((a, i) => (
                <div key={i} className="flex gap-2 items-start p-2 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <Input
                      value={a.action}
                      onChange={e => {
                        const arr = [...edited.actionPlan];
                        arr[i] = { ...arr[i], action: e.target.value };
                        updateField("actionPlan", arr);
                      }}
                      className="text-xs"
                      placeholder="Ação"
                    />
                    <div className="flex gap-2">
                      <select
                        value={a.priority}
                        onChange={e => {
                          const arr = [...edited.actionPlan];
                          arr[i] = { ...arr[i], priority: e.target.value };
                          updateField("actionPlan", arr);
                        }}
                        className="text-xs border rounded px-2 py-1 bg-background"
                      >
                        <option value="alta">Alta</option>
                        <option value="media">Média</option>
                        <option value="baixa">Baixa</option>
                      </select>
                      <Input
                        value={a.target}
                        onChange={e => {
                          const arr = [...edited.actionPlan];
                          arr[i] = { ...arr[i], target: e.target.value };
                          updateField("actionPlan", arr);
                        }}
                        className="text-xs flex-1"
                        placeholder="Responsável"
                      />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeActionItem(i)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addActionItem} className="gap-1.5 w-full">
                <Plus className="h-3 w-3" /> Adicionar ação
              </Button>
            </TabsContent>

            {/* Tab Sugestões */}
            <TabsContent value="sugestoes" className="space-y-4 mt-4">
              {edited.personalizedSuggestions ? (
                <>
                  {/* Motivational */}
                  <div>
                    <Label className="text-xs font-medium">Mensagem Motivacional</Label>
                    <Textarea
                      value={edited.personalizedSuggestions.motivationalNote}
                      onChange={e => updateSuggestions({ motivationalNote: e.target.value })}
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  {/* Weekly Routine */}
                  <div>
                    <Label className="text-xs font-medium">Rotina Semanal</Label>
                    <div className="space-y-2 mt-1">
                      {edited.personalizedSuggestions.weeklyRoutine.map((r, i) => (
                        <div key={i} className="flex gap-1.5 items-center">
                          <Input
                            value={r.day}
                            onChange={e => {
                              const arr = [...edited.personalizedSuggestions!.weeklyRoutine];
                              arr[i] = { ...arr[i], day: e.target.value };
                              updateSuggestions({ weeklyRoutine: arr });
                            }}
                            className="w-20 text-xs"
                          />
                          <Input
                            value={r.subject}
                            onChange={e => {
                              const arr = [...edited.personalizedSuggestions!.weeklyRoutine];
                              arr[i] = { ...arr[i], subject: e.target.value };
                              updateSuggestions({ weeklyRoutine: arr });
                            }}
                            className="w-24 text-xs"
                          />
                          <Input
                            value={r.activity}
                            onChange={e => {
                              const arr = [...edited.personalizedSuggestions!.weeklyRoutine];
                              arr[i] = { ...arr[i], activity: e.target.value };
                              updateSuggestions({ weeklyRoutine: arr });
                            }}
                            className="flex-1 text-xs"
                          />
                          <Input
                            value={r.duration}
                            onChange={e => {
                              const arr = [...edited.personalizedSuggestions!.weeklyRoutine];
                              arr[i] = { ...arr[i], duration: e.target.value };
                              updateSuggestions({ weeklyRoutine: arr });
                            }}
                            className="w-16 text-xs"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeRoutineItem(i)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Study Tips */}
                  <div>
                    <Label className="text-xs font-medium">Dicas de Estudo</Label>
                    <div className="space-y-2 mt-1">
                      {edited.personalizedSuggestions.studyTips.map((t, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <Input
                            value={t.tip}
                            onChange={e => {
                              const arr = [...edited.personalizedSuggestions!.studyTips];
                              arr[i] = { ...arr[i], tip: e.target.value };
                              updateSuggestions({ studyTips: arr });
                            }}
                            className="flex-1 text-xs"
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeTip(i)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Practical Activities */}
                  <div>
                    <Label className="text-xs font-medium">Atividades Práticas</Label>
                    <div className="space-y-2 mt-1">
                      {edited.personalizedSuggestions.practicalActivities.map((a, i) => (
                        <div key={i} className="flex gap-2 items-start p-2 border rounded-lg">
                          <div className="flex-1 space-y-1">
                            <div className="flex gap-2">
                              <Input
                                value={a.subject}
                                onChange={e => {
                                  const arr = [...edited.personalizedSuggestions!.practicalActivities];
                                  arr[i] = { ...arr[i], subject: e.target.value };
                                  updateSuggestions({ practicalActivities: arr });
                                }}
                                className="w-28 text-xs"
                                placeholder="Disciplina"
                              />
                              <Input
                                value={a.frequency}
                                onChange={e => {
                                  const arr = [...edited.personalizedSuggestions!.practicalActivities];
                                  arr[i] = { ...arr[i], frequency: e.target.value };
                                  updateSuggestions({ practicalActivities: arr });
                                }}
                                className="w-24 text-xs"
                                placeholder="Frequência"
                              />
                            </div>
                            <Input
                              value={a.activity}
                              onChange={e => {
                                const arr = [...edited.personalizedSuggestions!.practicalActivities];
                                arr[i] = { ...arr[i], activity: e.target.value };
                                updateSuggestions({ practicalActivities: arr });
                              }}
                              className="text-xs"
                              placeholder="Atividade"
                            />
                            <Input
                              value={a.objective}
                              onChange={e => {
                                const arr = [...edited.personalizedSuggestions!.practicalActivities];
                                arr[i] = { ...arr[i], objective: e.target.value };
                                updateSuggestions({ practicalActivities: arr });
                              }}
                              className="text-xs"
                              placeholder="Objetivo"
                            />
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeActivity(i)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma sugestão personalizada foi gerada. Clique em "Atualizar" no diagnóstico para gerar novamente.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onExport(edited); onOpenChange(false); }} className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}