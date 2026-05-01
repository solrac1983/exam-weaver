import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Image as ImageIcon, X, Loader2, CheckCircle2, XCircle, Brain, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/invokeFunction";
import { exportDiagnosticPDF } from "./DiagnosticPDFExport";
import { toast } from "@/hooks/use-toast";

interface BatchDiagnosticExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  userId: string;
  classGroups: string[];
}

interface StudentResult {
  id: string;
  name: string;
  status: "pending" | "generating" | "exporting" | "done" | "error";
  error?: string;
}

export default function BatchDiagnosticExportDialog({
  open,
  onOpenChange,
  companyId,
  userId,
  classGroups,
}: BatchDiagnosticExportDialogProps) {
  const [selectedClass, setSelectedClass] = useState("");
  const [processing, setProcessing] = useState(false);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleStart = async () => {
    if (!selectedClass) return;
    abortRef.current = false;
    setProcessing(true);

    // 1. Fetch students in this class
    const { data: studentList, error: studentsErr } = await supabase
      .from("students")
      .select("id, name, class_group, roll_number")
      .eq("company_id", companyId)
      .eq("class_group", selectedClass)
      .order("name");

    if (studentsErr || !studentList?.length) {
      toast({ title: "Nenhum aluno encontrado nesta turma", variant: "destructive" });
      setProcessing(false);
      return;
    }

    const results: StudentResult[] = studentList.map(s => ({
      id: s.id,
      name: s.name,
      status: "pending" as const,
    }));
    setStudents(results);

    // 2. Fetch all grades and attendance for these students
    const studentIds = studentList.map(s => s.id);
    const [gradesRes, attendanceRes, subjectsRes] = await Promise.all([
      supabase.from("grades").select("student_id, subject_id, bimester, score, max_score, subjects(name)").eq("company_id", companyId).in("student_id", studentIds),
      supabase.from("attendance").select("student_id, date, status, subject_id").eq("company_id", companyId).in("student_id", studentIds),
      supabase.from("subjects").select("id, name").eq("company_id", companyId),
    ]);

    const allGrades = (gradesRes.data || []) as any[];
    const allAttendance = (attendanceRes.data || []) as any[];
    const subjectNames = (subjectsRes.data || []).map((s: any) => s.name);

    // 3. Process each student sequentially
    for (let i = 0; i < studentList.length; i++) {
      if (abortRef.current) break;
      const student = studentList[i];
      setCurrentIndex(i);

      // Update status
      results[i].status = "generating";
      setStudents([...results]);

      const studentGrades = allGrades.filter((g: any) => g.student_id === student.id);
      const studentAttendance = allAttendance.filter((a: any) => a.student_id === student.id);

      if (studentGrades.length === 0) {
        results[i].status = "error";
        results[i].error = "Sem notas";
        setStudents([...results]);
        continue;
      }

      // Calculate attendance summary
      const total = studentAttendance.length;
      const present = studentAttendance.filter((a: any) => a.status === "present").length;
      const absent = studentAttendance.filter((a: any) => a.status === "absent").length;
      const justified = studentAttendance.filter((a: any) => a.status === "justified").length;
      const late = studentAttendance.filter((a: any) => a.status === "late").length;
      const rate = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 100;
      const attendanceSummary = { total, present, absent, justified, late, rate };

      try {
        // Check if saved diagnostic exists
        const { data: existing } = await supabase
          .from("student_diagnostics" as any)
          .select("id, diagnostic_data")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let diagnosticData: any;

        if (existing) {
          diagnosticData = (existing as any).diagnostic_data;
        } else {
          // Generate via AI
          const { data, error } = await invokeFunction<any>("student-diagnostic", {
            body: {
              studentName: student.name,
              grades: studentGrades.map((g: any) => ({
                subject: g.subjects?.name || "Sem disciplina",
                bimester: g.bimester,
                score: g.score,
                maxScore: g.max_score,
                percentage: Math.round((g.score / g.max_score) * 100),
              })),
              attendance: attendanceSummary,
              subjects: subjectNames,
            },
            silent: true,
          });

          if (error) throw new Error(error.message);
          diagnosticData = data;

          // Save to database
          await supabase.from("student_diagnostics" as any).insert({
            student_id: student.id,
            company_id: companyId,
            generated_by: userId,
            diagnostic_data: diagnosticData as any,
          } as any);
        }

        // Export PDF
        results[i].status = "exporting";
        setStudents([...results]);

        exportDiagnosticPDF({
          studentName: student.name,
          classGroup: student.class_group,
          rollNumber: student.roll_number || "",
          summary: diagnosticData.summary,
          riskLevel: diagnosticData.riskLevel,
          strengths: diagnosticData.strengths || [],
          weaknesses: diagnosticData.weaknesses || [],
          projections: diagnosticData.projections || [],
          actionPlan: diagnosticData.actionPlan || [],
          attendanceAlert: diagnosticData.attendanceAlert || "",
          recommendations: diagnosticData.recommendations || "",
          attendanceSummary,
          logoBase64,
          personalizedSuggestions: diagnosticData.personalizedSuggestions,
        });

        results[i].status = "done";
        setStudents([...results]);

        // Small delay between exports to avoid popup blocking
        if (i < studentList.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err: any) {
        results[i].status = "error";
        results[i].error = err.message || "Erro desconhecido";
        setStudents([...results]);
      }
    }

    const doneCount = results.filter(r => r.status === "done").length;
    const errorCount = results.filter(r => r.status === "error").length;
    toast({
      title: `Exportação concluída`,
      description: `${doneCount} de ${results.length} diagnósticos exportados${errorCount > 0 ? ` (${errorCount} com erro)` : ""}.`,
    });
    setProcessing(false);
  };

  const handleCancel = () => {
    abortRef.current = true;
  };

  const progressPercent = students.length > 0
    ? Math.round((students.filter(s => s.status === "done" || s.status === "error").length / students.length) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={processing ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Exportação em Lote — Diagnósticos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Class selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Turma</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={processing}>
              <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
              <SelectContent>
                {classGroups.map(cg => (
                  <SelectItem key={cg} value={cg}>{cg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logo upload */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Logo no cabeçalho (opcional)</Label>
            <div className="flex items-center gap-2">
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={processing} className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                {logoBase64 ? "Trocar logo" : "Adicionar logo"}
              </Button>
              {logoBase64 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setLogoBase64(null)} disabled={processing}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {logoBase64 && <img src={logoBase64} alt="Logo" className="h-10 mt-1 rounded" />}
          </div>

          {/* Progress */}
          {students.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progresso: {students.filter(s => s.status === "done" || s.status === "error").length} / {students.length}</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />

              <ScrollArea className="h-[200px] border rounded-lg p-2">
                <div className="space-y-1">
                  {students.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted/50">
                      <span className="truncate flex-1">{s.name}</span>
                      {s.status === "pending" && <Badge variant="outline" className="text-[10px]">Aguardando</Badge>}
                      {s.status === "generating" && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Gerando
                        </Badge>
                      )}
                      {s.status === "exporting" && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <FileDown className="h-3 w-3" /> Exportando
                        </Badge>
                      )}
                      {s.status === "done" && (
                        <Badge className="text-[10px] gap-1 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3" /> Concluído
                        </Badge>
                      )}
                      {s.status === "error" && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <XCircle className="h-3 w-3" /> {s.error || "Erro"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {processing ? (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              Cancelar
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button size="sm" onClick={handleStart} disabled={!selectedClass} className="gap-1.5">
                <Brain className="h-4 w-4" />
                Iniciar Exportação
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
