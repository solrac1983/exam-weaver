import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGrades, Grade } from "@/hooks/useGrades";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCadastroCompany } from "@/hooks/useCadastroCompany";
import { TablePageSkeleton } from "@/components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Plus, Trash2, Building2, Eye } from "lucide-react";
import { readSpreadsheetFile, downloadCSVTemplate } from "@/lib/spreadsheetUtils";

const BIMESTERS = ["1", "2", "3", "4"];
const GRADE_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "simulado", label: "Simulado" },
  { value: "recuperacao", label: "Recuperação" },
];

export default function GradesPage() {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const isSuperAdmin = role === "super_admin";
  const { companies, selectedCompanyId, setSelectedCompanyId, loading: companyLoading } = useCadastroCompany();
  const companyId = selectedCompanyId || profile?.company_id || "";

  const [classGroup, setClassGroup] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [bimester, setBimester] = useState("");
  const [classGroups, setClassGroups] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; class_group: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formStudentId, setFormStudentId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formBimester, setFormBimester] = useState("1");
  const [formScore, setFormScore] = useState("");
  const [formMaxScore, setFormMaxScore] = useState("10");
  const [formEvalName, setFormEvalName] = useState("");
  const [formGradeType, setFormGradeType] = useState("manual");
  const [formNotes, setFormNotes] = useState("");

  const { grades, loading, addGrade, addGradesBatch, deleteGrade } = useGrades({
    companyId,
    classGroup: classGroup || undefined,
    subjectId: subjectId || undefined,
    bimester: bimester || undefined,
  });

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      supabase.from("class_groups").select("id, name").eq("company_id", companyId).order("name"),
      supabase.from("subjects").select("id, name").eq("company_id", companyId).order("name"),
      supabase.from("students").select("id, name, class_group").eq("company_id", companyId).order("name"),
    ]).then(([cg, sub, st]) => {
      setClassGroups(cg.data || []);
      setSubjects(sub.data || []);
      setStudents(st.data || []);
    });
  }, [companyId]);

  const handleAddGrade = async () => {
    if (!formStudentId || !formSubjectId || !formScore) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const student = students.find(s => s.id === formStudentId);
    const ok = await addGrade({
      student_id: formStudentId,
      company_id: companyId,
      subject_id: formSubjectId,
      class_group: student?.class_group || "",
      grade_type: formGradeType,
      bimester: formBimester,
      score: parseFloat(formScore),
      max_score: parseFloat(formMaxScore) || 10,
      evaluation_name: formEvalName,
      simulado_result_id: null,
      notes: formNotes,
      recorded_by: user!.id,
    });
    if (ok) {
      setDialogOpen(false);
      setFormStudentId(""); setFormScore(""); setFormEvalName(""); setFormNotes("");
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawRows = await readSpreadsheetFile(file);
      if (rawRows.length < 2) {
        toast({ title: "Planilha vazia", variant: "destructive" });
        return;
      }
      const headers = rawRows[0].map(h => h.toLowerCase().trim());
      const alunoIdx = headers.findIndex(h => ["aluno", "nome"].includes(h));
      const notaIdx = headers.findIndex(h => ["nota", "score"].includes(h));
      const avalIdx = headers.findIndex(h => ["avaliação", "avaliacao", "evaluation"].includes(h));
      const bimIdx = headers.findIndex(h => ["bimestre"].includes(h));
      const discIdx = headers.findIndex(h => ["disciplina"].includes(h));
      const maxIdx = headers.findIndex(h => ["nota máxima", "nota maxima", "max"].includes(h));

      const gradesToInsert: any[] = [];
      let skipped = 0;

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        const studentName = (row[alunoIdx] || "").trim();
        const score = parseFloat(row[notaIdx] || "0");
        const evalName = (row[avalIdx] || "").trim();
        const bim = (row[bimIdx] || "1").trim();
        const subName = (row[discIdx] || "").trim();

        const student = students.find(s => s.name.toLowerCase() === studentName.toLowerCase());
        const subject = subjects.find(s => s.name.toLowerCase() === subName.toLowerCase());

        if (!student) { skipped++; continue; }

        gradesToInsert.push({
          student_id: student.id,
          company_id: companyId,
          subject_id: subject?.id || null,
          class_group: student.class_group,
          grade_type: "manual",
          bimester: bim,
          score,
          max_score: parseFloat(row[maxIdx] || "10") || 10,
          evaluation_name: evalName,
          simulado_result_id: null,
          notes: "",
          recorded_by: user!.id,
        });
      }

      if (gradesToInsert.length > 0) {
        await addGradesBatch(gradesToInsert);
      }
      if (skipped > 0) {
        toast({ title: `${skipped} aluno(s) não encontrado(s) e ignorado(s)` });
      }
    } catch (err: any) {
      toast({ title: err.message || "Erro ao importar", variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate(
      [
        ["Aluno", "Disciplina", "Nota", "Nota Máxima", "Bimestre", "Avaliação"],
        ["João Silva", "Matemática", "8.5", "10", "1", "Prova Mensal"],
        ["Maria Santos", "Português", "7.0", "10", "1", "Prova Mensal"],
      ],
      "modelo_notas.csv"
    );
  };

  if (companyLoading) return <TablePageSkeleton rows={6} />;

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">Selecione uma empresa</h2>
        <p className="text-sm text-muted-foreground mt-1">Para gerenciar notas, selecione uma empresa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Notas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Lançamento e consulta de notas dos alunos</p>
        </div>
        {isSuperAdmin && (
          <Select value={selectedCompanyId || "none"} onValueChange={(v) => setSelectedCompanyId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione uma empresa</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="consulta">
        <TabsList>
          <TabsTrigger value="consulta">Consulta</TabsTrigger>
          <TabsTrigger value="importar">Importar Planilha</TabsTrigger>
        </TabsList>

        <TabsContent value="consulta">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Notas Registradas</CardTitle>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Lançar Nota
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-3 flex-wrap mb-4">
                <Select value={classGroup || "all"} onValueChange={v => setClassGroup(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Turma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as turmas</SelectItem>
                    {classGroups.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={subjectId || "all"} onValueChange={v => setSubjectId(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Disciplina" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={bimester || "all"} onValueChange={v => setBimester(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Bimestre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {BIMESTERS.map(b => <SelectItem key={b} value={b}>{b}º Bimestre</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
              ) : grades.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma nota encontrada</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Disciplina</TableHead>
                        <TableHead>Avaliação</TableHead>
                        <TableHead>Bimestre</TableHead>
                        <TableHead>Nota</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map(g => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">
                            <button className="text-primary hover:underline flex items-center gap-1" onClick={() => navigate(`/aluno/${g.student_id}`)}>
                              {g.student_name} <Eye className="h-3 w-3" />
                            </button>
                          </TableCell>
                          <TableCell>{g.subject_name}</TableCell>
                          <TableCell>{g.evaluation_name}</TableCell>
                          <TableCell>{g.bimester}º</TableCell>
                          <TableCell>{g.score}/{g.max_score}</TableCell>
                          <TableCell className="capitalize">{g.grade_type}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteGrade(g.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="importar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Importar Notas via Planilha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Faça upload de uma planilha Excel (.xlsx, .xls, .csv) com as colunas: <strong>Aluno, Disciplina, Nota, Nota Máxima, Bimestre, Avaliação</strong>.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={handleDownloadTemplate}>Baixar Modelo</Button>
                <label className="cursor-pointer">
                  <Button variant="default" asChild><span>Importar Planilha</span></Button>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog - Lançar Nota */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Lançar Nota</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Aluno *</Label>
              <Select value={formStudentId} onValueChange={setFormStudentId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.class_group})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Disciplina *</Label>
              <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bimestre</Label>
                <Select value={formBimester} onValueChange={setFormBimester}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BIMESTERS.map(b => <SelectItem key={b} value={b}>{b}º</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formGradeType} onValueChange={setFormGradeType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRADE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nota *</Label>
                <Input type="number" step="0.1" min="0" value={formScore} onChange={e => setFormScore(e.target.value)} placeholder="8.5" />
              </div>
              <div>
                <Label>Nota Máxima</Label>
                <Input type="number" step="0.1" min="0" value={formMaxScore} onChange={e => setFormMaxScore(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Nome da Avaliação</Label>
              <Input value={formEvalName} onChange={e => setFormEvalName(e.target.value)} placeholder="Prova Mensal" />
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddGrade}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
