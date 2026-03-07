import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { StudentMetrics } from "@/lib/performanceMetrics";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

interface Props {
  students: StudentMetrics[];
  bimesters: string[];
}

function LearningCurve({ students, bimesters }: Props) {
  const data = useMemo(() => {
    if (bimesters.length < 2) return [];

    return bimesters.map(bim => {
      let sum = 0;
      let count = 0;
      let riskCount = 0;
      let excellentCount = 0;

      for (const s of students) {
        const score = s.bimesterScores.find(b => b.bimester === bim);
        if (score) {
          sum += score.average;
          count++;
          if (score.average < 50) riskCount++;
          if (score.average >= 80) excellentCount++;
        }
      }

      return {
        bimester: `${bim}º Bim`,
        media: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
        risco: riskCount,
        excelente: excellentCount,
      };
    });
  }, [students, bimesters]);

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Curva de Aprendizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            Necessário 2+ bimestres para exibir a curva de aprendizado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Curva de Aprendizado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradientMedia" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="bimester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => {
                if (name === "media") return [`${value}%`, "Média Geral"];
                if (name === "risco") return [value, "Alunos em Risco"];
                if (name === "excelente") return [value, "Alunos Excelentes"];
                return [value, name];
              }}
            />
            <ReferenceLine y={60} stroke="hsl(var(--warning))" strokeDasharray="5 5" label={{
              value: "Meta 60%", position: "insideTopRight", fill: "hsl(var(--warning))", fontSize: 10,
            }} />
            <Area
              type="monotone"
              dataKey="media"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fill="url(#gradientMedia)"
              dot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
              activeDot={{ r: 7 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-3">
          {data.map((d, i) => {
            const prev = i > 0 ? data[i - 1].media : d.media;
            const diff = d.media - prev;
            return (
              <div key={d.bimester} className="text-center">
                <p className="text-[10px] text-muted-foreground">{d.bimester}</p>
                <p className={`text-sm font-bold ${d.media >= 60 ? "text-success" : d.media >= 50 ? "text-warning" : "text-destructive"}`}>
                  {d.media}%
                </p>
                {i > 0 && (
                  <p className={`text-[10px] ${diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {diff > 0 ? `↑ +${diff.toFixed(1)}` : diff < 0 ? `↓ ${diff.toFixed(1)}` : "→ 0"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(LearningCurve);
