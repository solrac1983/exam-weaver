import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Users, BookOpen, FileText, ClipboardList, GraduationCap } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

interface ClassGroupDetail {
  id: string;
  name: string;
  grade: string | null;
  segment: string | null;
  shift: string | null;
  year: number;
}

interface DemandInfo {
  id: string;
  subjectName: string;
  examType: string;
  status: string;
  deadline: string;
  classGroups: string[];
}

interface StudentInfo {
  id: string;
  name: string;
  rollNumber: string;
}

interface SimuladoInfo {
  id: string;
  title: string;
  status: string;
  applicationDate: string | null;
  classGroups: string[];
}

export default function MinhasTurmasPage() {
  const { user, profile, role } = useAuth();
  const [classGroups, setClassGroups] = useState<ClassGroupDetail[]>([]);
  const [demands, setDemands] = useState<DemandInfo[]>([]);
  const [students, setStudents] = useState<Record<string, StudentInfo[]>>({});
  const [simulados, setSimulados] = useState<SimuladoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile) return;
    const load = async () => {
      setLoading(true);
      try {
        // Get teacher record to find linked class groups
        const { data: teacher } = await supabase
          .from("teachers")
          .select("class_groups, id")
          .eq("email", profile.email)
          .maybeSingle();

        const groupNames = teacher?.class_groups || [];
        if (groupNames.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch class group details
        const { data: cgData } = await supabase
          .from("class_groups")
          .select("id, name, grade, segment, shift, year")
          .in("name", groupNames);
        if (cgData) {
          setClassGroups(cgData);
          if (cgData.length > 0) setSelectedGroup(cgData[0].name);
        }

        // Fetch demands for this teacher
        if (teacher?.id) {
          const { data: demandData } = await supabase
            .from("demands")
            .select("id, exam_type, status, deadline, class_groups, subject_id")
            .eq("teacher_id", teacher.id);

          if (demandData) {
            // Get subject names
            const subjectIds = [...new Set(demandData.map(d => d.subject_id))];
            const { data: subjectsData } = await supabase
              .from("subjects")
              .select("id, name")
              .in("id", subjectIds);
            const subjectMap = new Map((subjectsData || []).map(s => [s.id, s.name]));

            setDemands(demandData.map(d => ({
              id: d.id,
              subjectName: subjectMap.get(d.subject_id) || "—",
              examType: d.exam_type,
              status: d.status,
              deadline: d.deadline,
              classGroups: d.class_groups,
            })));
          }
        }

        // Fetch students per class group
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, name, roll_number, class_group")
          .in("class_group", groupNames)
          .order("name");

        if (studentsData) {
          const grouped: Record<string, StudentInfo[]> = {};
          studentsData.forEach(s => {
            if (!grouped[s.class_group]) grouped[s.class_group] = [];
            grouped[s.class_group].push({ id: s.id, name: s.name, rollNumber: s.roll_number });
          });
          setStudents(grouped);
        }

        // Fetch simulados that include these class groups
        const { data: simuladosData } = await supabase
          .from("simulados")
          .select("id, title, status, application_date, class_groups")
          .overlaps("class_groups", groupNames);

        if (simuladosData) {
          setSimulados(simuladosData.map(s => ({
            id: s.id,
            title: s.title,
            status: s.status,
            applicationDate: s.application_date,
            classGroups: s.class_groups,
          })));
        }
      } catch (err) {
        console.error("Error loading turmas data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, profile]);

  const examTypeLabels: Record<string, string> = {
    mensal: "Mensal", bimestral: "Bimestral", trimestral: "Trimestral",
    semestral: "Semestral", recuperacao: "Recuperação", simulado: "Simulado",
  };

  const selectedDemands = selectedGroup
    ? demands.filter(d => d.classGroups.includes(selectedGroup))
    : [];

  const selectedStudents = selectedGroup ? (students[selectedGroup] || []) : [];

  const selectedSimulados = selectedGroup
    ? simulados.filter(s => s.classGroups.includes(selectedGroup))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Minhas Turmas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visualize as turmas vinculadas a você e seus conteúdos
        </p>
      </div>

      {classGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma turma vinculada ao seu perfil.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Class group selector */}
          <div className="flex flex-wrap gap-2">
            {classGroups.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g.name)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  selectedGroup === g.name
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-card text-foreground border-border hover:bg-accent hover:border-accent"
                }`}
              >
                {g.name}
                {g.segment || g.grade ? (
                  <span className="ml-1.5 text-xs opacity-70">
                    {[g.segment, g.grade].filter(Boolean).join(" • ")}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {selectedGroup && (
            <div className="space-y-6">
              {/* Class info header */}
              {(() => {
                const g = classGroups.find(c => c.name === selectedGroup);
                if (!g) return null;
                return (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" /> {g.name}
                      </CardTitle>
                      <CardDescription>
                        {[g.segment, g.grade, g.shift].filter(Boolean).join(" • ") || `Ano letivo ${g.year}`}
                        {g.shift && ` — Turno: ${g.shift}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-6 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{selectedStudents.length} aluno(s)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <ClipboardList className="h-4 w-4" />
                          <span>{selectedDemands.length} avaliação(ões)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{selectedSimulados.length} simulado(s)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Students */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Alunos
                  </CardTitle>
                  <CardDescription>{selectedStudents.length} aluno(s) nesta turma</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedStudents.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedStudents.map(s => (
                        <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            {s.rollNumber && <p className="text-xs text-muted-foreground">Matrícula: {s.rollNumber}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado nesta turma.</p>
                  )}
                </CardContent>
              </Card>

              {/* Demands/Exams */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" /> Avaliações
                  </CardTitle>
                  <CardDescription>{selectedDemands.length} avaliação(ões) para esta turma</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDemands.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDemands.map(d => (
                        <a
                          key={d.id}
                          href={`/demandas/${d.id}`}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium">{d.subjectName} — {examTypeLabels[d.examType] || d.examType}</p>
                            <p className="text-xs text-muted-foreground">
                              Prazo: {new Date(d.deadline).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <StatusBadge status={d.status} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma avaliação para esta turma.</p>
                  )}
                </CardContent>
              </Card>

              {/* Simulados */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Simulados
                  </CardTitle>
                  <CardDescription>{selectedSimulados.length} simulado(s) para esta turma</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedSimulados.length > 0 ? (
                    <div className="space-y-2">
                      {selectedSimulados.map(s => (
                        <a
                          key={s.id}
                          href="/simulados"
                          className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium">{s.title}</p>
                            {s.applicationDate && (
                              <p className="text-xs text-muted-foreground">
                                Aplicação: {new Date(s.applicationDate).toLocaleDateString("pt-BR")}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">{s.status}</Badge>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum simulado para esta turma.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
