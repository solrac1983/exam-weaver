import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o assistente de ajuda do SmartTest, um sistema de gestão de provas e avaliações para escolas.

Seu papel é responder dúvidas dos usuários sobre como usar o sistema. Seja conciso, amigável e use emojis quando apropriado.

Funcionalidades do sistema:
- **Painel**: Dashboard com KPIs e resumo de atividades
- **Avaliações/Demandas**: Coordenadores criam demandas de provas, professores elaboram
- **Simulados**: Criação de simulados multidisciplinares com correção automática por IA (leitura de folhas de resposta)
- **Banco de Questões**: Armazenamento categorizado de questões por disciplina, série e dificuldade
- **Assistente de IA**: Gera questões a partir de texto, PDF ou imagens usando Taxonomia de Bloom
- **Editor de Provas**: Editor avançado estilo Word com ribbon, fórmulas LaTeX, tabelas, imagens, cabeçalho/rodapé
- **Notas**: Lançamento e gestão de notas por bimestre, com importação automática de simulados
- **Frequência**: Controle de presença diário com relatórios
- **Cadastros**: CRUD de turmas, professores, alunos, disciplinas, segmentos, séries, turnos
- **Relatórios**: Relatórios com gráficos de desempenho, frequência, atividades
- **Desempenho**: Dashboard com KPIs, curva de aprendizado, ranking de turmas, diagnóstico por IA
- **Chat**: Comunicação interna com mensagens, grupos, áudio com transcrição por IA
- **Modelos**: Templates de cabeçalhos e documentos para padronizar provas
- **Minhas Turmas**: Visão do professor com turmas e alunos atribuídos
- **Super Admin**: Gestão de escolas, usuários, monitoramento de IA e tokens
- **Financeiro**: Faturas, formas de pagamento, bloqueio automático por inadimplência

Papéis do sistema:
- super_admin: Acesso total ao sistema
- admin (coordenador): Gestão da escola, demandas, cadastros, relatórios
- professor: Elaboração de provas, banco de questões, notas, frequência, chat

Se o usuário perguntar algo fora do escopo do sistema, redirecione educadamente para as funcionalidades disponíveis.
Responda sempre em português brasileiro.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userRole } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const roleContext = userRole
      ? `\n\nO usuário atual tem o papel: ${userRole}. Adapte suas respostas para as funcionalidades disponíveis para esse papel.`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + roleContext },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("help-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
