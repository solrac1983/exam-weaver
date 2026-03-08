import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Printer, RotateCcw, User } from "lucide-react";
import type { StudentMetrics } from "@/lib/performanceMetrics";
import { exportStudentReports } from "./StudentReportExport";

const statusLabels: Record<string, string> = {
  satisfatorio: "Satisfatório",
  atencao: "Atenção",
  risco: "Risco",
  evolucao: "Em Evolução",
};

function generateDefaultComment(s: StudentMetrics): string {
  const strengths = s.subjectScores.filter(sub => sub.average >= 70).sort((a, b) => b.average - a.average);
  const weaknesses = s.subjectScores.filter(sub => sub.average < 70).sort((a, b) => a.average - b.average);
  const parts: string[] = [];

  if (s.status === "satisfatorio") {
    parts.push(`${s.name} apresenta desempenho satisfatório com média geral de ${s.average}%, demonstrando domínio consistente dos conteúdos avaliados.`);
  } else if (s.status === "evolucao") {
    parts.push(`${s.name} encontra-se em trajetória de evolução acadêmica, com média atual de ${s.average}% e melhora de +${s.evolution} pontos percentuais ao longo dos bimestres.`);
  } else if (s.status === "atencao") {
    parts.push(`${s.name} requer atenção pedagógica, com média geral de ${s.average}%, ficando abaixo do patamar ideal de desempenho acadêmico.`);
  } else {
    parts.push(`${s.name} encontra-se em situação de risco acadêmico, com média geral de ${s.average}%, necessitando de intervenção pedagógica imediata.`);
  }

  if (s.bimesterScores.length >= 2) {
    const first = s.bimesterScores[0];
    const last = s.bimesterScores[s.bimesterScores.length - 1];
    if (s.evolution > 0) {
      parts.push(`Crescimento de +${s.evolution} pontos (${first.average}% → ${last.average}%).`);
    } else if (s.evolution < 0) {
      parts.push(`Queda de ${s.evolution} pontos (${first.average}% → ${last.average}%).`);
    }
  }

  if (strengths.length > 0) {
    parts.push(`Destaca-se em ${strengths.slice(0, 3).map(s => `${s.name} (${s.average}%)`).join(", ")}.`);
  }
  if (weaknesses.length > 0) {
    parts.push(`Reforço em ${weaknesses.slice(0, 3).map(s => `${s.name} (${s.average}%)`).join(", ")}.`);
  }

  parts.push(`Frequência: ${s.frequency}%. ${s.recommendation}.`);
  return parts.join(" ");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentMetrics[];
}

export default function StudentReportEditDialog({ open, onOpenChange, students }: Props) {
  const sorted = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students]);

  const [comments, setComments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    sorted.forEach(s => { map[s.id] = generateDefaultComment(s); });
    return map;
  });

  // Reset comments when students change
  const studentIds = sorted.map(s => s.id).join(",");
  const [prevIds, setPrevIds] = useState(studentIds);
  if (studentIds !== prevIds) {
    setPrevIds(studentIds);
    const map: Record<string, string> = {};
    sorted.forEach(s => { map[s.id] = generateDefaultComment(s); });
    setComments(map);
  }

  const handleReset = (id: string) => {
    const student = sorted.find(s => s.id === id);
    if (student) {
      setComments(prev => ({ ...prev, [id]: generateDefaultComment(student) }));
    }
  };

  const handleExport = () => {
    exportStudentReports(sorted, comments);
    onOpenChange(false);
  };

  const avgColor = (avg: number) => avg >= 70 ? "text-success" : avg >= 50 ? "text-warning" : "text-destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Revisar Resumos do Boletim Individual
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Edite os comentários de desempenho antes de gerar o boletim. {sorted.length} aluno(s) selecionado(s).
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4">
            {sorted.map(s => (
              <div key={s.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {s.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.classGroup}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-lg font-bold ${avgColor(s.average)}`}>{s.average}%</span>
                    <Badge variant="outline" className="text-[10px]">{statusLabels[s.status] || s.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReset(s.id)} title="Restaurar texto original">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={comments[s.id] || ""}
                  onChange={e => setComments(prev => ({ ...prev, [s.id]: e.target.value }))}
                  rows={4}
                  className="text-xs leading-relaxed resize-none"
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleExport} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Gerar Boletim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
