import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { studentName, grades, attendance, subjects } = await req.json();

    const systemPrompt = `Você é um especialista em pedagogia e análise de desempenho escolar brasileiro. Analise os dados do aluno e retorne um diagnóstico completo.

IMPORTANTE: Responda APENAS com o JSON usando a tool fornecida. Não adicione texto fora da tool call.`;

    const userPrompt = `Analise o desempenho do aluno "${studentName}":

NOTAS:
${JSON.stringify(grades, null, 1)}

FREQUÊNCIA:
- Total de registros: ${attendance.total}
- Presenças: ${attendance.present}
- Faltas: ${attendance.absent}
- Justificadas: ${attendance.justified}
- Atrasos: ${attendance.late}
- Taxa de presença: ${attendance.rate}%

DISCIPLINAS DISPONÍVEIS: ${subjects.join(", ")}

Considere:
1. Identifique pontos fracos e fortes por disciplina
2. Analise a evolução bimestral (tendência de melhora ou piora)
3. Projete notas finais baseado na tendência
4. Identifique se o aluno está em zona de risco (média < 6 ou frequência < 75%)
5. Crie um plano de ação personalizado com intervenções específicas
6. Dê recomendações para pais e professores`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "student_diagnostic",
              description: "Retorna diagnóstico pedagógico completo do aluno",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Resumo geral do desempenho em 2-3 frases"
                  },
                  riskLevel: {
                    type: "string",
                    enum: ["baixo", "moderado", "alto", "critico"],
                    description: "Nível de risco acadêmico"
                  },
                  strengths: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subject: { type: "string" },
                        detail: { type: "string" }
                      },
                      required: ["subject", "detail"],
                      additionalProperties: false
                    },
                    description: "Pontos fortes identificados"
                  },
                  weaknesses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subject: { type: "string" },
                        detail: { type: "string" },
                        severity: { type: "string", enum: ["leve", "moderada", "grave"] }
                      },
                      required: ["subject", "detail", "severity"],
                      additionalProperties: false
                    },
                    description: "Pontos fracos identificados"
                  },
                  projections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subject: { type: "string" },
                        currentAvg: { type: "number" },
                        projectedFinal: { type: "number" },
                        trend: { type: "string", enum: ["melhora", "estavel", "piora"] }
                      },
                      required: ["subject", "currentAvg", "projectedFinal", "trend"],
                      additionalProperties: false
                    },
                    description: "Projeções de notas finais por disciplina"
                  },
                  actionPlan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string" },
                        priority: { type: "string", enum: ["alta", "media", "baixa"] },
                        target: { type: "string", description: "Quem deve executar: professor, pais, aluno, coordenação" }
                      },
                      required: ["action", "priority", "target"],
                      additionalProperties: false
                    },
                    description: "Plano de ação com intervenções específicas"
                  },
                  attendanceAlert: {
                    type: "string",
                    description: "Alerta sobre frequência, se aplicável. Vazio se não houver problema."
                  },
                  recommendations: {
                    type: "string",
                    description: "Recomendações gerais para pais e professores em formato de texto"
                  }
                },
                required: ["summary", "riskLevel", "strengths", "weaknesses", "projections", "actionPlan", "attendanceAlert", "recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "student_diagnostic" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro ao chamar IA");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("IA não retornou diagnóstico estruturado");
    }

    const diagnostic = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(diagnostic), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("diagnostic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
