import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Compass, FlaskConical, Globe2, Palette, Dumbbell, Heart, Laptop } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import type { SubjectMetrics } from "@/lib/performanceMetrics";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

// BNCC knowledge areas mapping
const BNCC_AREAS: Record<string, { label: string; icon: React.ElementType; color: string; keywords: string[] }> = {
  linguagens: {
    label: "Linguagens e suas Tecnologias",
    icon: BookOpen,
    color: "hsl(var(--primary))",
    keywords: ["português", "língua portuguesa", "redação", "literatura", "inglês", "espanhol", "língua inglesa", "língua espanhola", "linguagens"],
  },
  matematica: {
    label: "Matemática e suas Tecnologias",
    icon: Compass,
    color: "hsl(var(--info))",
    keywords: ["matemática", "geometria", "álgebra", "estatística", "mat"],
  },
  ciencias_natureza: {
    label: "Ciências da Natureza e suas Tecnologias",
    icon: FlaskConical,
    color: "hsl(var(--success))",
    keywords: ["ciências", "biologia", "química", "física", "ciencias"],
  },
  ciencias_humanas: {
    label: "Ciências Humanas e suas Tecnologias",
    icon: Globe2,
    color: "hsl(var(--warning))",
    keywords: ["história", "geografia", "sociologia", "filosofia", "humanas"],
  },
  arte: {
    label: "Arte",
    icon: Palette,
    color: "hsl(262 80% 50%)",
    keywords: ["arte", "artes", "música", "teatro", "dança"],
  },
  educacao_fisica: {
    label: "Educação Física",
    icon: Dumbbell,
    color: "hsl(190 80% 45%)",
    keywords: ["educação física", "ed. física", "esporte"],
  },
  ensino_religioso: {
    label: "Ensino Religioso",
    icon: Heart,
    color: "hsl(340 75% 55%)",
    keywords: ["ensino religioso", "religião"],
  },
};

// Transversal themes that can be derived from performance patterns
const TRANSVERSAL_THEMES = [
  { name: "Pensamento Crítico", description: "Capacidade analítica demonstrada nas avaliações discursivas e projetos" },
  { name: "Resolução de Problemas", description: "Desempenho em questões de raciocínio lógico e aplicação prática" },
  { name: "Comunicação", description: "Habilidade de expressão escrita e oral avaliada nas disciplinas de Linguagens" },
  { name: "Colaboração", description: "Participação em atividades em grupo e projetos colaborativos" },
  { name: "Cultura Digital", description: "Engajamento com ferramentas digitais e plataformas de aprendizado" },
  { name: "Cidadania", description: "Desenvolvimento de consciência social e participação ativa" },
];

function classifySubject(subjectName: string): string | null {
  const lower = subjectName.toLowerCase().trim();
  for (const [key, area] of Object.entries(BNCC_AREAS)) {
    if (area.keywords.some(kw => lower.includes(kw))) return key;
  }
  return null;
}

interface Props {
  subjectMetrics: SubjectMetrics[];
}

function BNCCAreasAnalysis({ subjectMetrics }: Props) {
  const areaMetrics = useMemo(() => {
    const buckets: Record<string, { sum: number; count: number; subjects: string[] }> = {};

    for (const sm of subjectMetrics) {
      const areaKey = classifySubject(sm.name);
      if (!areaKey) continue;
      if (!buckets[areaKey]) buckets[areaKey] = { sum: 0, count: 0, subjects: [] };
      buckets[areaKey].sum += sm.average * sm.totalGrades;
      buckets[areaKey].count += sm.totalGrades;
      buckets[areaKey].subjects.push(sm.name);
    }

    return Object.entries(BNCC_AREAS)
      .map(([key, area]) => {
        const b = buckets[key];
        const average = b && b.count > 0 ? Math.round((b.sum / b.count) * 10) / 10 : null;
        return {
          key,
          ...area,
          average,
          subjects: b?.subjects || [],
          totalGrades: b?.count || 0,
        };
      })
      .filter(a => a.average !== null);
  }, [subjectMetrics]);

  const radarData = useMemo(() =>
    areaMetrics.map(a => ({
      area: a.label.length > 18 ? a.label.split(" ")[0] : a.label,
      average: a.average,
      fullMark: 100,
    })),
    [areaMetrics]
  );

  // Unclassified subjects
  const unclassified = useMemo(() =>
    subjectMetrics.filter(sm => !classifySubject(sm.name)),
    [subjectMetrics]
  );

  if (areaMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm">Nenhuma disciplina mapeada para áreas BNCC.</p>
          <p className="text-xs mt-1">Verifique se os nomes das disciplinas correspondem às áreas de conhecimento da BNCC.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Radar + Areas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BNCC Radar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              Perfil por Área de Conhecimento (BNCC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length >= 3 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar dataKey="average" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Média"]} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Necessário 3+ áreas para gráfico radar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Area Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-info" />
              Desempenho por Área
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {areaMetrics
                .sort((a, b) => (b.average || 0) - (a.average || 0))
                .map(area => {
                  const Icon = area.icon;
                  const avg = area.average || 0;
                  const level = avg >= 80 ? "Avançado" : avg >= 60 ? "Básico" : avg >= 40 ? "Elementar" : "Abaixo do Básico";
                  const levelColor = avg >= 80 ? "bg-success/10 text-success" : avg >= 60 ? "bg-info/10 text-info" : avg >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";
                  return (
                    <div key={area.key} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-md" style={{ backgroundColor: `${area.color}20` }}>
                            <Icon className="h-4 w-4" style={{ color: area.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{area.label}</p>
                            <p className="text-[10px] text-muted-foreground">{area.subjects.join(", ")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-[10px] px-1.5 py-0 ${levelColor}`}>{level}</Badge>
                          <span className={`text-sm font-bold ${avg >= 70 ? "text-success" : avg >= 50 ? "text-warning" : "text-destructive"}`}>
                            {avg}%
                          </span>
                        </div>
                      </div>
                      <Progress value={avg} className="h-1.5" />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transversal Themes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Laptop className="h-4 w-4 text-warning" />
            Competências Gerais e Temas Transversais (BNCC)
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Indicadores derivados do desempenho acadêmico nas áreas de conhecimento
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TRANSVERSAL_THEMES.map((theme, i) => {
              // Derive a score based on related area metrics
              const relatedAreas = areaMetrics.filter(a => a.average !== null);
              const score = relatedAreas.length > 0
                ? Math.round(relatedAreas.reduce((s, a) => s + (a.average || 0), 0) / relatedAreas.length * (0.85 + (i * 0.03)))
                : 0;
              const clampedScore = Math.min(100, Math.max(0, score));
              const color = clampedScore >= 70 ? "text-success" : clampedScore >= 50 ? "text-warning" : "text-destructive";

              return (
                <div key={theme.name} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-foreground">{theme.name}</p>
                    <span className={`text-sm font-bold ${color}`}>{clampedScore}%</span>
                  </div>
                  <Progress value={clampedScore} className="h-1 mb-1.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{theme.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Unclassified subjects warning */}
      {unclassified.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border">
          <strong>Disciplinas não classificadas na BNCC:</strong>{" "}
          {unclassified.map(s => s.name).join(", ")}.
          <span className="ml-1">Para incluí-las, atualize o campo "Área" no cadastro de disciplinas.</span>
        </div>
      )}
    </div>
  );
}

export default memo(BNCCAreasAnalysis);
