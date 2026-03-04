import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, FileText, ClipboardList, GraduationCap, ChevronRight, ChevronDown, BookOpen } from "lucide-react";
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
  const { user, profile } = useAuth();
  const [classGroups, setClassGroups] = useState<ClassGroupDetail[]>([]);
  const [demands, setDemands] = useState<DemandInfo[]>([]);
  const [students, setStudents] = useState<Record<string, StudentInfo[]>>({});
  const [simulados, setSimulados] = useState<SimuladoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !profile) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("class_groups, id, subjects")
          .eq("email", profile.email)
          .maybeSingle();

        if (teacher?.subjects && teacher.subjects.length > 0) {
          const { data: subjectsData } = await supabase
            .from("subjects").select("id, name").in("id", teacher.subjects);
          if (subjectsData) setTeacherSubjects(subjectsData.map(s => s.name));
        }

        const groupNames = teacher?.class_groups || [];
        if (groupNames.length === 0) { setLoading(false); return; }

        const { data: cgData } = await supabase
          .from("class_groups")
          .select("id, name, grade, segment, shift, year")
          .in("name", groupNames);
        if (cgData) setClassGroups(cgData);

        if (teacher?.id) {
          const { data: demandData } = await supabase
            .from("demands")
            .select("id, exam_type, status, deadline, class_groups, subject_id")
            .eq("teacher_id", teacher.id);
          if (demandData) {
            const subjectIds = [...new Set(demandData.map(d => d.subject_id))];
            const { data: subjectsData } = await supabase
              .from("subjects").select("id, name").in("id", subjectIds);
            const subjectMap = new Map((subjectsData || []).map(s => [s.id, s.name]));
            setDemands(demandData.map(d => ({
              id: d.id, subjectName: subjectMap.get(d.subject_id) || "—",
              examType: d.exam_type, status: d.status, deadline: d.deadline, classGroups: d.class_groups,
            })));
          }
        }

        const { data: studentsData } = await supabase
          .from("students").select("id, name, roll_number, class_group")
          .in("class_group", groupNames).order("name");
        if (studentsData) {
          const grouped: Record<string, StudentInfo[]> = {};
          studentsData.forEach(s => {
            if (!grouped[s.class_group]) grouped[s.class_group] = [];
            grouped[s.class_group].push({ id: s.id, name: s.name, rollNumber: s.roll_number });
          });
          setStudents(grouped);
        }

        const { data: simuladosData } = await supabase
          .from("simulados").select("id, title, status, application_date, class_groups")
          .overlaps("class_groups", groupNames);
        if (simuladosData) {
          setSimulados(simuladosData.map(s => ({
            id: s.id, title: s.title, status: s.status,
            applicationDate: s.application_date, classGroups: s.class_groups,
          })));
        }
      } catch (err) {
        console.error("Error loading turmas data:", err);
      } finally { setLoading(false); }
    };
    load();
  }, [user, profile]);

  const examTypeLabels: Record<string, string> = {
    mensal: "Mensal", bimestral: "Bimestral", trimestral: "Trimestral",
    semestral: "Semestral", recuperacao: "Recuperação", simulado: "Simulado",
  };

  const toggleGroup = (name: string) => {
    setExpandedGroup(prev => prev === name ? null : name);
  };

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
          Clique em uma turma para ver alunos, avaliações e simulados
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
        <div className="space-y-4">
          {classGroups.map(g => {
            const isOpen = expandedGroup === g.name;
            const groupStudents = students[g.name] || [];
            const groupDemands = demands.filter(d => d.classGroups.includes(g.name));
            const groupSimulados = simulados.filter(s => s.classGroups.includes(g.name));

            return (
              <div key={g.id} className="space-y-3">
                {/* Clickable turma card */}
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${isOpen ? "ring-2 ring-primary/30 shadow-md" : "hover:border-primary/30"}`}
                  onClick={() => toggleGroup(g.name)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">{g.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {[g.segment, g.grade, g.shift].filter(Boolean).join(" • ") || `Ano ${g.year}`}
                          </p>
                          {teacherSubjects.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <BookOpen className="h-3 w-3 text-muted-foreground" />
                              {teacherSubjects.map(s => (
                                <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {groupStudents.length}</span>
                          <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> {groupDemands.length}</span>
                          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {groupSimulados.length}</span>
                        </div>
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Expanded content */}
                {isOpen && (
                  <div className="pl-4 border-l-2 border-primary/20 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Students */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" /> Alunos
                          <Badge variant="secondary" className="text-xs ml-auto">{groupStudents.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {groupStudents.length > 0 ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {groupStudents.map(s => (
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

                    {/* Demands */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-primary" /> Avaliações
                          <Badge variant="secondary" className="text-xs ml-auto">{groupDemands.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {groupDemands.length > 0 ? (
                          <div className="space-y-2">
                            {groupDemands.map(d => (
                              <a key={d.id} href={`/demandas/${d.id}`}
                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                                <div>
                                  <p className="text-sm font-medium">{d.subjectName} — {examTypeLabels[d.examType] || d.examType}</p>
                                  <p className="text-xs text-muted-foreground">Prazo: {new Date(d.deadline).toLocaleDateString("pt-BR")}</p>
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
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" /> Simulados
                          <Badge variant="secondary" className="text-xs ml-auto">{groupSimulados.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {groupSimulados.length > 0 ? (
                          <div className="space-y-2">
                            {groupSimulados.map(s => (
                              <a key={s.id} href="/simulados"
                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                                <div>
                                  <p className="text-sm font-medium">{s.title}</p>
                                  {s.applicationDate && (
                                    <p className="text-xs text-muted-foreground">Aplicação: {new Date(s.applicationDate).toLocaleDateString("pt-BR")}</p>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}