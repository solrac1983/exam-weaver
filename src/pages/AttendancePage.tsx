import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAttendance } from "@/hooks/useAttendance";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCadastroCompany } from "@/hooks/useCadastroCompany";
import { TablePageSkeleton } from "@/components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Building2, Upload, Download, Save } from "lucide-react";
import { readSpreadsheetFile, downloadCSVTemplate } from "@/lib/spreadsheetUtils";

const STATUS_OPTIONS = [
  { value: "present", label: "Presente", color: "bg-green-100 text-green-800" },
  { value: "absent", label: "Falta", color: "bg-red-100 text-red-800" },
  { value: "justified", label: "Justificada", color: "bg-yellow-100 text-yellow-800" },
  { value: "late", label: "Atraso", color: "bg-orange-100 text-orange-800" },
];

export default function AttendancePage() {
  const { user, profile, role } = useAuth();
  const isSuperAdmin = role === "super_admin";
  const { companies, selectedCompanyId, setSelectedCompanyId, loading: companyLoading } = useCadastroCompany();
  const companyId = selectedCompanyId || profile?.company_id || "";

  const [classGroup, setClassGroup] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [classGroups, setClassGroups] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; class_group: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // For manual attendance entry
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

  const { records, loading, fetchRecords, upsertBatch } = useAttendance({
    companyId,
    classGroup: classGroup || undefined,
    date: selectedDate || undefined,
    subjectId: selectedSubjectId || undefined,
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

  // Build attendance map from existing records
  useEffect(() => {
    const map: Record<string, string> = {};
    records.forEach(r => { map[r.student_id] = r.status; });
    setAttendanceMap(map);
  }, [records]);

  const filteredStudents = classGroup
    ? students.filter(s => s.class_group === classGroup)
    : students;

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedDate || !classGroup) {
      toast({ title: "Selecione a data e turma", variant: "destructive" });
      return;
    }
    const items = filteredStudents.map(s => ({
      student_id: s.id,
      company_id: companyId,
      class_group: s.class_group,
      date: selectedDate,
      status: attendanceMap[s.id] || "present",
      subject_id: selectedSubjectId || null,
      notes: "",
      recorded_by: user!.id,
    }));
    await upsertBatch(items);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws);

    if (rows.length === 0) {
      toast({ title: "Planilha vazia", variant: "destructive" });
      return;
    }

    const items: any[] = [];
    let skipped = 0;

    for (const row of rows) {
      const studentName = (row["Aluno"] || row["aluno"] || row["Nome"] || "").toString().trim();
      const dateStr = (row["Data"] || row["data"] || "").toString().trim();
      const statusRaw = (row["Status"] || row["status"] || row["Situação"] || "present").toString().trim().toLowerCase();

      const student = students.find(s => s.name.toLowerCase() === studentName.toLowerCase());
      if (!student || !dateStr) { skipped++; continue; }

      const statusMap: Record<string, string> = {
        presente: "present", present: "present",
        falta: "absent", absent: "absent", ausente: "absent",
        justificada: "justified", justified: "justified",
        atraso: "late", late: "late",
      };

      items.push({
        student_id: student.id,
        company_id: companyId,
        class_group: student.class_group,
        date: dateStr,
        status: statusMap[statusRaw] || "present",
        subject_id: null,
        notes: "",
        recorded_by: user!.id,
      });
    }

    if (items.length > 0) await upsertBatch(items);
    if (skipped > 0) toast({ title: `${skipped} registro(s) ignorado(s)` });
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { Aluno: "João Silva", Data: "2026-03-07", Status: "Presente" },
      { Aluno: "Maria Santos", Data: "2026-03-07", Status: "Falta" },
      { Aluno: "Pedro Lima", Data: "2026-03-07", Status: "Justificada" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Frequência");
    XLSX.writeFile(wb, "modelo_frequencia.xlsx");
  };

  if (companyLoading) return <TablePageSkeleton rows={6} />;

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">Selecione uma empresa</h2>
        <p className="text-sm text-muted-foreground mt-1">Para gerenciar frequência, selecione uma empresa.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return <Badge variant="outline" className={opt?.color || ""}>{opt?.label || status}</Badge>;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Frequência
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Controle de presença e faltas dos alunos</p>
        </div>
        {isSuperAdmin && (
          <Select value={selectedCompanyId || "none"} onValueChange={v => setSelectedCompanyId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione uma empresa</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="lancamento">
        <TabsList>
          <TabsTrigger value="lancamento">Lançamento</TabsTrigger>
          <TabsTrigger value="consulta">Consulta</TabsTrigger>
          <TabsTrigger value="importar">Importar Planilha</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamento">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lançar Frequência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-[180px]" />
                </div>
                <div>
                  <Label>Turma</Label>
                  <Select value={classGroup || "none"} onValueChange={v => setClassGroup(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Turma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      {classGroups.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Disciplina (opcional)</Label>
                  <Select value={selectedSubjectId || "none"} onValueChange={v => setSelectedSubjectId(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geral</SelectItem>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {classGroup && filteredStudents.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Aluno</TableHead>
                          <TableHead>Turma</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>{s.class_group}</TableCell>
                            <TableCell>
                              <Select value={attendanceMap[s.id] || "present"} onValueChange={v => handleStatusChange(s.id, v)}>
                                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button onClick={handleSaveAttendance}>
                    <Save className="h-4 w-4 mr-1" /> Salvar Frequência
                  </Button>
                </>
              ) : classGroup ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno encontrado nesta turma</p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Selecione uma turma para lançar a frequência</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consulta">
          <Card>
            <CardHeader><CardTitle className="text-base">Registros de Frequência</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
              ) : records.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum registro encontrado</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Turma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.student_name}</TableCell>
                          <TableCell>{new Date(r.date).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{getStatusBadge(r.status)}</TableCell>
                          <TableCell>{r.class_group}</TableCell>
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
            <CardHeader><CardTitle className="text-base">Importar Frequência via Planilha</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Colunas aceitas: <strong>Aluno, Data (AAAA-MM-DD), Status</strong> (Presente/Falta/Justificada/Atraso).
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-1" /> Baixar Modelo
                </Button>
                <label className="cursor-pointer">
                  <Button variant="default" asChild>
                    <span><Upload className="h-4 w-4 mr-1" /> Importar Planilha</span>
                  </Button>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
