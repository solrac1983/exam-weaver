import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StudentMetrics } from "@/lib/performanceMetrics";

interface Props {
  students: StudentMetrics[];
  classFilter: string;
}

function getHeatColor(avg: number): string {
  if (avg >= 80) return "bg-success/20 text-success border-success/30";
  if (avg >= 70) return "bg-success/10 text-success border-success/20";
  if (avg >= 60) return "bg-info/10 text-info border-info/20";
  if (avg >= 50) return "bg-warning/10 text-warning border-warning/20";
  if (avg >= 40) return "bg-warning/20 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/25";
}

function getLevel(avg: number): string {
  if (avg >= 80) return "Avançado";
  if (avg >= 70) return "Proficiente";
  if (avg >= 60) return "Básico";
  if (avg >= 50) return "Elementar";
  if (avg >= 40) return "Insuficiente";
  return "Crítico";
}

function CompetencyHeatmap({ students, classFilter }: Props) {
  // Collect all subjects
  const { subjects, matrix } = useMemo(() => {
    const subjectSet = new Set<string>();
    for (const s of students) {
      for (const sub of s.subjectScores) subjectSet.add(sub.name);
    }
    const subjects = [...subjectSet].sort();

    const matrix = students.slice(0, 50).map(student => ({
      ...student,
      scores: subjects.map(subName => {
        const found = student.subjectScores.find(ss => ss.name === subName);
        return found ? found.average : null;
      }),
    }));

    return { subjects, matrix };
  }, [students]);

  if (students.length === 0 || subjects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Grid3X3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm">Sem dados para gerar o mapa de competências.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />
            Mapa de Habilidades e Competências
          </CardTitle>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/20 border border-success/30" /> ≥80%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-info/10 border border-info/20" /> 60-79%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/10 border border-warning/20" /> 40-59%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/15 border border-destructive/25" /> &lt;40%</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Cada célula indica o nível de domínio do aluno na disciplina. {classFilter !== "all" ? `Turma: ${classFilter}` : "Todas as turmas"}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground sticky left-0 bg-card z-10 min-w-[140px]">
                  Aluno
                </th>
                {subjects.map(sub => (
                  <th key={sub} className="text-center px-2 py-2 font-semibold text-muted-foreground min-w-[80px]">
                    <span className="truncate block max-w-[80px]">{sub}</span>
                  </th>
                ))}
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground min-w-[60px]">Média</th>
              </tr>
            </thead>
            <tbody>
              <TooltipProvider>
                {matrix.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-1.5 font-medium text-foreground sticky left-0 bg-card z-10 truncate max-w-[160px]">
                      {row.name}
                      <span className="text-[10px] text-muted-foreground ml-1">({row.classGroup})</span>
                    </td>
                    {row.scores.map((score, i) => (
                      <td key={subjects[i]} className="text-center px-1 py-1">
                        {score !== null ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`inline-flex items-center justify-center w-full px-1.5 py-1 rounded border text-[11px] font-bold cursor-default ${getHeatColor(score)}`}>
                                {score}%
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{row.name} — {subjects[i]}</p>
                              <p className="text-[10px] text-muted-foreground">Nível: {getLevel(score)}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    ))}
                    <td className="text-center px-1 py-1">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-[11px] ${getHeatColor(row.average)}`}>
                        {row.average}%
                      </span>
                    </td>
                  </tr>
                ))}
              </TooltipProvider>
            </tbody>
          </table>
        </div>
        {students.length > 50 && (
          <div className="text-center text-[10px] text-muted-foreground py-2 border-t">
            Exibindo os primeiros 50 alunos de {students.length}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(CompetencyHeatmap);
