import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SimuladoSubject } from "@/hooks/useSimulados";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2, XCircle, Trash2, Users, ImagePlus, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class_group: string;
}

interface BatchItem {
  id: string;
  fileName: string;
  status: "pending" | "processing" | "done" | "error";
  answers: Record<string, string>;
  studentId: string;
  correct: number;
  wrong: number;
  blank: number;
  score: number;
  errorMsg?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simuladoId: string;
  totalQuestions: number;
  answerKey: Record<number, string>;
  students: Student[];
  onSaved: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function gradeAnswers(
  answers: Record<string, string>,
  answerKey: Record<number, string>,
  totalQ: number
) {
  let correct = 0, wrong = 0, blank = 0;
  for (let q = 1; q <= totalQ; q++) {
    const studentAns = answers[String(q)];
    const correctAns = answerKey[q];
    if (!studentAns) { blank++; continue; }
    if (correctAns && studentAns === correctAns) correct++;
    else wrong++;
  }
  const score = totalQ > 0 ? Math.round((correct / totalQ) * 1000) / 10 : 0;
  return { correct, wrong, blank, score };
}

export default function BatchCorrectionDialog({
  open,
  onOpenChange,
  simuladoId,
  totalQuestions,
  answerKey,
  students,
  onSaved,
}: Props) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setItems([]);
    setProcessing(false);
    setSaving(false);
    setOverallProgress(0);
    abortRef.current = false;
    setDragging(false);
  };

  const processFiles = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 10 * 1024 * 1024) continue;
      validFiles.push(f);
    }

    if (validFiles.length === 0) {
      toast({ title: "Nenhuma imagem válida selecionada.", variant: "destructive" });
      return;
    }

    startProcessing(validFiles);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startProcessing = async (validFiles: File[]) => {
    const newItems: BatchItem[] = validFiles.map((f) => ({
      id: crypto.randomUUID(),
      fileName: f.name,
      status: "pending" as const,
      answers: {},
      studentId: "",
      correct: 0,
      wrong: 0,
      blank: totalQuestions,
      score: 0,
    }));

    setItems(newItems);
    setProcessing(true);
    abortRef.current = false;

    for (let i = 0; i < validFiles.length; i++) {
      if (abortRef.current) break;

      const file = validFiles[i];
      const itemId = newItems[i].id;

      setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: "processing" } : it));
      setOverallProgress(Math.round(((i) / validFiles.length) * 100));

      try {
        const base64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke("read-answer-sheet", {
          body: { image_base64: base64, total_questions: totalQuestions, alternatives_count: 5 },
        });
        if (error) throw new Error(error.message || "Erro ao processar");
        if (data?.error) throw new Error(data.error);
        if (data?.answers) {
          const answers: Record<string, string> = {};
          const rawAnswers = data.answers || {};
          for (const [k, v] of Object.entries(rawAnswers)) {
            const val = String(v).toUpperCase();
            if (val !== "X") answers[k] = val;
          }
          const grade = gradeAnswers(answers, answerKey, totalQuestions);
          
          // Auto-match student by roll_number
          let matchedStudentId = "";
          if (data.roll_number) {
            const rollNum = String(data.roll_number).replace(/_+$/, "");
            const matched = students.find(s => s.roll_number === rollNum);
            if (matched) matchedStudentId = matched.id;
          }
          
          setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: "done", answers, studentId: matchedStudentId || it.studentId, ...grade } : it));
        }
      } catch (err: any) {
        setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: "error", errorMsg: err.message || "Erro desconhecido" } : it));
      }

      if (i < validFiles.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setOverallProgress(100);
    setProcessing(false);
  };

  const updateStudentId = (itemId: string, studentId: string) => {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, studentId } : it));
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(it => it.id !== itemId));
  };

  const readyItems = items.filter(it => it.status === "done" && it.studentId);
  const assignedStudentIds = new Set(items.map(it => it.studentId).filter(Boolean));

  const saveAll = async () => {
    if (readyItems.length === 0) {
      toast({ title: "Atribua alunos às folhas antes de salvar.", variant: "destructive" });
      return;
    }

    // Check for duplicate students
    const studentIds = readyItems.map(it => it.studentId);
    const duplicates = studentIds.filter((id, i) => studentIds.indexOf(id) !== i);
    if (duplicates.length > 0) {
      toast({ title: "Há alunos duplicados. Cada aluno só pode ter um resultado.", variant: "destructive" });
      return;
    }

    setSaving(true);

    const rows = readyItems.map(it => ({
      simulado_id: simuladoId,
      student_id: it.studentId,
      answers: it.answers,
      score: it.score,
      correct_count: it.correct,
      wrong_count: it.wrong,
      total_questions: totalQuestions,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await (supabase as any)
      .from("simulado_results")
      .upsert(rows, { onConflict: "simulado_id,student_id" });

    if (error) {
      toast({ title: "Erro ao salvar resultados.", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `✅ ${readyItems.length} resultados salvos com sucesso!` });
      onSaved();
      onOpenChange(false);
      reset();
    }
    setSaving(false);
  };

  const doneCount = items.filter(it => it.status === "done").length;
  const errorCount = items.filter(it => it.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!processing) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Correção em Lote
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center py-12 gap-4 border-2 border-dashed rounded-lg transition-colors ${
              dragging ? "border-primary bg-primary/10" : "border-muted-foreground/25 bg-transparent"
            }`}
          >
            <div className="rounded-full bg-primary/10 p-6">
              <ImagePlus className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">
                {dragging ? "Solte as imagens aqui" : "Envie múltiplas fotos de folhas de resposta"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Arraste e solte imagens aqui ou clique no botão abaixo.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <Button size="lg" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-5 w-5" /> Selecionar Imagens
            </Button>
          </div>
        ) : (
          <>
            {/* Progress */}
            {processing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processando {doneCount + errorCount} de {items.length} folhas...</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            )}

            {!processing && items.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" /> {doneCount} processadas
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                    <AlertCircle className="h-3 w-3" /> {errorCount} erros
                  </Badge>
                )}
                <span className="text-muted-foreground ml-auto">
                  {readyItems.length} de {doneCount} prontas para salvar
                </span>
              </div>
            )}

            {/* Items list */}
            <ScrollArea className="flex-1 max-h-[50vh] pr-2">
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <Card key={item.id} className={`${item.status === "error" ? "border-destructive/40 bg-destructive/5" : item.status === "done" ? "border-border" : "border-muted"}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Index & status */}
                        <div className="flex flex-col items-center gap-1 min-w-[32px] pt-1">
                          <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                          {item.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                          {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          {item.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                          {item.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <p className="text-xs text-muted-foreground truncate">{item.fileName}</p>

                          {item.status === "error" && (
                            <p className="text-xs text-destructive">{item.errorMsg}</p>
                          )}

                          {item.status === "done" && (
                            <>
                              {/* Grade summary */}
                              <div className="flex items-center gap-3 text-xs">
                                <span className={`font-bold text-base ${item.score >= 70 ? "text-green-600" : item.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                                  {item.score}%
                                </span>
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                                  ✓ {item.correct}
                                </Badge>
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px]">
                                  ✗ {item.wrong}
                                </Badge>
                                {item.blank > 0 && (
                                  <span className="text-muted-foreground">⬜ {item.blank}</span>
                                )}
                              </div>

                              {/* Student select */}
                              <Select value={item.studentId} onValueChange={(v) => updateStudentId(item.id, v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Atribuir aluno..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {students.map(s => (
                                    <SelectItem
                                      key={s.id}
                                      value={s.id}
                                      disabled={assignedStudentIds.has(s.id) && item.studentId !== s.id}
                                    >
                                      {s.name} {s.roll_number ? `(Nº ${s.roll_number})` : ""} — {s.class_group || "S/T"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </>
                          )}
                        </div>

                        {/* Remove button */}
                        {!processing && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { abortRef.current = true; onOpenChange(false); reset(); }} disabled={saving}>
            Cancelar
          </Button>
          {items.length > 0 && !processing && (
            <Button onClick={saveAll} disabled={saving || readyItems.length === 0} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Salvar {readyItems.length} Resultado{readyItems.length !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
