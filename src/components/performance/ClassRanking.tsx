import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import type { ClassMetrics } from "@/lib/performanceMetrics";

interface Props {
  classMetrics: ClassMetrics[];
}

function ClassRanking({ classMetrics }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          Ranking de Turmas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {classMetrics.map((cm, i) => (
            <div key={cm.name} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
              <div className={`flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold ${
                i === 0 ? "bg-warning/15 text-warning" :
                i === 1 ? "bg-muted text-muted-foreground" :
                i === 2 ? "bg-amber-900/15 text-amber-700" :
                "bg-muted/50 text-muted-foreground"
              }`}>
                {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}º`}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{cm.name}</span>
                  <span className="text-[10px] text-muted-foreground">{cm.studentsCount} alunos · {cm.totalGrades} notas</span>
                  {cm.average >= 70 && (
                    <Badge className="bg-success/10 text-success text-[10px] px-1.5 py-0">
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5" />Acima
                    </Badge>
                  )}
                  {cm.average < 50 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      <TrendingDown className="h-2.5 w-2.5 mr-0.5" />Crítico
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={cm.average} className="flex-1 h-2" />
                  <span className={`text-sm font-bold w-14 text-right ${
                    cm.average >= 70 ? "text-success" : cm.average >= 50 ? "text-warning" : "text-destructive"
                  }`}>
                    {cm.average}%
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                  <span>🔴 Abaixo de 60%: <strong>{cm.below60Pct}%</strong></span>
                  <span>🟢 Acima de 80%: <strong>{cm.above80Pct}%</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(ClassRanking);
