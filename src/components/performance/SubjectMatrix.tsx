import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import type { SubjectMetrics } from "@/lib/performanceMetrics";

interface Props {
  subjectMetrics: SubjectMetrics[];
}

function SubjectMatrix({ subjectMetrics }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-info" />
          Disciplinas — Detalhamento por Turma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {subjectMetrics.map(sm => (
            <div key={sm.id} className="p-3 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{sm.name}</span>
                  <span className="text-[10px] text-muted-foreground">{sm.totalGrades} notas</span>
                </div>
                <span className={`text-sm font-bold ${
                  sm.average >= 70 ? "text-success" : sm.average >= 50 ? "text-warning" : "text-destructive"
                }`}>
                  {sm.average}%
                </span>
              </div>
              {sm.classBreakdown.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {sm.classBreakdown.map(cb => (
                    <div key={cb.className} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                      <span className="text-xs text-muted-foreground truncate flex-1">{cb.className}</span>
                      <span className={`text-xs font-bold ${
                        cb.average >= 70 ? "text-success" : cb.average >= 50 ? "text-warning" : "text-destructive"
                      }`}>
                        {cb.average}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(SubjectMatrix);
