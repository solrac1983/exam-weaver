import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis,
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
}

function FrequencyChart({ students }: Props) {
  const data = useMemo(() =>
    students
      .filter(s => s.totalAttendance > 0)
      .map(s => ({
        name: s.name,
        frequency: s.frequency,
        average: s.average,
        status: s.status,
      })),
    [students]
  );

  if (data.length < 3) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-success" /> Frequência × Rendimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            Necessário dados de frequência para exibir este gráfico
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-success" /> Frequência × Rendimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="frequency" name="Frequência" unit="%" domain={[0, 100]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "Frequência (%)", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis dataKey="average" name="Média" unit="%" domain={[0, 100]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "Média (%)", angle: -90, position: "insideLeft", offset: 15, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <ZAxis range={[40, 40]} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => [`${value}%`, name === "average" ? "Média" : "Frequência"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
            />
            <Scatter data={data} fill="hsl(var(--primary))" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span>📍 Cada ponto = 1 aluno</span>
          <span>Quadrante ideal: alta frequência + alto rendimento</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(FrequencyChart);
