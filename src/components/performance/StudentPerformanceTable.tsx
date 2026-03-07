import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Users, Search, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus,
  AlertTriangle, BookOpen, Lightbulb, Target,
} from "lucide-react";
import type { StudentMetrics } from "@/lib/performanceMetrics";

interface Props {
  students: StudentMetrics[];
}

const STATUS_CONFIG = {
  satisfatorio: { label: "Satisfatório", className: "bg-success/10 text-success border-success/20" },
  atencao: { label: "Atenção", className: "bg-warning/10 text-warning border-warning/20" },
  risco: { label: "Risco", className: "bg-destructive/10 text-destructive border-destructive/20" },
  evolucao: { label: "Em Evolução", className: "bg-info/10 text-info border-info/20" },
} as const;

function StudentDetailPanel({ student }: { student: StudentMetrics }) {
  const weakSubjects = student.subjectScores.filter(s => s.average < 60);
  const strongSubjects = student.subjectScores.filter(s => s.average >= 70);

  return (
    <div className="p-4 bg-muted/30 border-t space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Diagnosis */}
        <Card className="border-destructive/20">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              Diagnóstico de Falhas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {weakSubjects.length > 0 ? (
              <ul className="space-y-1.5">
                {weakSubjects.map(s => (
                  <li key={s.name} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{s.name}</span>
                    <span className="font-bold text-destructive">{s.average}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma disciplina abaixo de 60%</p>
            )}
          </CardContent>
        </Card>

        {/* Strong points */}
        <Card className="border-success/20">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-success">
              <Target className="h-3.5 w-3.5" />
              Pontos Fortes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {strongSubjects.length > 0 ? (
              <ul className="space-y-1.5">
                {strongSubjects.map(s => (
                  <li key={s.name} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{s.name}</span>
                    <span className="font-bold text-success">{s.average}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma disciplina acima de 70%</p>
            )}
          </CardContent>
        </Card>

        {/* Action Plan */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-primary">
              <Lightbulb className="h-3.5 w-3.5" />
              Plano de Ação
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <p className="text-xs text-foreground">{student.recommendation}</p>
            {weakSubjects.length > 0 && (
              <div className="space-y-1">
                {weakSubjects.slice(0, 3).map(s => (
                  <div key={s.name} className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    <BookOpen className="h-2.5 w-2.5 inline mr-1" />
                    Reforço em <strong>{s.name}</strong> — foco em atividades práticas
                  </div>
                ))}
              </div>
            )}
            {student.frequency < 75 && (
              <div className="text-[10px] text-warning bg-warning/5 rounded px-2 py-1">
                ⚠️ Frequência baixa ({student.frequency}%) — contatar responsáveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bimester evolution */}
      {student.bimesterScores.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Evolução Bimestral:</span>
          {student.bimesterScores.map((b, i) => {
            const prev = i > 0 ? student.bimesterScores[i - 1].average : b.average;
            const diff = b.average - prev;
            return (
              <div key={b.bimester} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-card border text-xs">
                <span className="text-muted-foreground">{b.bimester}º</span>
                <span className={`font-bold ${b.average >= 60 ? "text-success" : b.average >= 50 ? "text-warning" : "text-destructive"}`}>
                  {b.average}%
                </span>
                {i > 0 && (
                  <span className={`text-[10px] ${diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentPerformanceTable({ students }: Props) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"average" | "frequency" | "evolution">("average");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = students
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.classGroup.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const diff = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
      return sortAsc ? diff : -diff;
    });

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Tabela de Alunos ({filtered.length})
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno ou turma..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Aluno</TableHead>
                <TableHead className="text-[11px]">Turma</TableHead>
                <TableHead className="text-[11px] cursor-pointer select-none" onClick={() => handleSort("average")}>
                  Média <SortIcon col="average" />
                </TableHead>
                <TableHead className="text-[11px] cursor-pointer select-none" onClick={() => handleSort("frequency")}>
                  Frequência <SortIcon col="frequency" />
                </TableHead>
                <TableHead className="text-[11px] cursor-pointer select-none" onClick={() => handleSort("evolution")}>
                  Evolução <SortIcon col="evolution" />
                </TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
                <TableHead className="text-[11px]">Recomendação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-xs">
                    Nenhum aluno encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(s => {
                  const isExpanded = expandedId === s.id;
                  const cfg = STATUS_CONFIG[s.status];
                  return (
                    <TableRow key={s.id} className="group" >
                      <TableCell colSpan={7} className="p-0">
                        <div
                          className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_1fr] items-center gap-0 px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        >
                          <span className="text-xs font-medium text-foreground truncate">{s.name}</span>
                          <span className="text-xs text-muted-foreground w-20 text-center">{s.classGroup}</span>
                          <div className="flex items-center gap-1.5 w-24">
                            <Progress value={s.average} className="h-1.5 flex-1" />
                            <span className={`text-xs font-bold w-10 text-right ${
                              s.average >= 70 ? "text-success" : s.average >= 50 ? "text-warning" : "text-destructive"
                            }`}>{s.average}%</span>
                          </div>
                          <span className={`text-xs font-medium w-16 text-center ${
                            s.frequency >= 80 ? "text-success" : s.frequency >= 70 ? "text-warning" : "text-destructive"
                          }`}>{s.frequency > 0 ? `${s.frequency}%` : "—"}</span>
                          <span className="flex items-center gap-0.5 text-xs w-16 justify-center">
                            {s.evolution > 0 ? <TrendingUp className="h-3 w-3 text-success" /> :
                             s.evolution < 0 ? <TrendingDown className="h-3 w-3 text-destructive" /> :
                             <Minus className="h-3 w-3 text-muted-foreground" />}
                            <span className={s.evolution > 0 ? "text-success" : s.evolution < 0 ? "text-destructive" : "text-muted-foreground"}>
                              {s.evolution > 0 ? `+${s.evolution}` : s.evolution}%
                            </span>
                          </span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.className}`}>
                            {cfg.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground truncate pl-2">{s.recommendation}</span>
                        </div>
                        {isExpanded && <StudentDetailPanel student={s} />}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(StudentPerformanceTable);
