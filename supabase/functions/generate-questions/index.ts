import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imagesBase64, imageBase64, textContent, subject, grade, quantity, difficulty, questionType, customInstructions } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const qty = quantity || 5;
    const difficultyInstruction = difficulty && difficulty !== "todas"
      ? `Todas as questões devem ter dificuldade "${difficulty}".`
      : "Varie a dificuldade entre fácil, média e difícil de forma equilibrada.";
    const typeInstruction = questionType && questionType !== "todas"
      ? `Gere APENAS questões do tipo "${questionType}".`
      : "Varie os tipos entre objetiva, dissertativa e verdadeiro_falso.";

    const systemPrompt = `Você é um pedagogo e especialista em avaliação educacional brasileira com vasta experiência na elaboração de provas para ensino fundamental e médio. Sua missão é criar questões de alta qualidade pedagógica que avaliem competências cognitivas diversas segundo a Taxonomia de Bloom (lembrar, compreender, aplicar, analisar, avaliar e criar).

DIRETRIZES PEDAGÓGICAS:
1. Cada questão deve ter um objetivo de aprendizagem claro e mensurável.
2. Os enunciados devem ser claros, objetivos e sem ambiguidades.
3. Para questões objetivas: crie distratores plausíveis e pedagogicamente relevantes (não absurdos). As alternativas devem ter comprimento similar.
4. Contextualize as questões com situações do cotidiano, textos de apoio ou cenários práticos sempre que possível.
5. Inclua questões que exijam interpretação, análise crítica e aplicação — não apenas memorização.
6. Use linguagem adequada à faixa etária e série informada.
7. Evite pegadinhas, negativas duplas e linguagem confusa.

ELEMENTOS VISUAIS (OBRIGATÓRIO):
- Fórmulas e equações: use notação LaTeX dentro de tags <span data-type="math" data-formula="LATEX"></span>
- Tabelas: recrie em HTML (<table>) com dados relevantes
- Gráficos e diagramas: descreva detalhadamente e recrie em HTML quando possível
- Preserve formatação: <strong>, <em>, <ul>/<ol>, <sub>, <sup>
- Para ciências exatas, SEMPRE use LaTeX para fórmulas

${difficultyInstruction}
${typeInstruction}
${subject ? `Disciplina: ${subject}` : ""}
${grade ? `Série/Ano: ${grade}` : ""}
${customInstructions ? `\nORIENTAÇÕES ESPECÍFICAS DO PROFESSOR:\n${customInstructions}` : ""}

Gere exatamente ${qty} questões.`;

    const userContent: any[] = [];
    const allImages = imagesBase64 || (imageBase64 ? [imageBase64] : []);

    if (allImages.length > 0) {
      for (const img of allImages) {
        userContent.push({ type: "image_url", image_url: { url: img } });
      }
      let imagePrompt = `Analise ${allImages.length > 1 ? "estas " + allImages.length + " páginas" : "esta página"} de livro didático. Extraia TODO o conteúdo, incluindo fórmulas, tabelas, gráficos e imagens. Gere questões de prova completas e elaboradas, reproduzindo fielmente os elementos visuais do material. IMPORTANTE: Se as imagens contiverem ilustrações, gráficos, tabelas ou diagramas relevantes para as questões, descreva-os detalhadamente no enunciado e, quando possível, recrie-os em HTML (tabelas, listas, formatação visual) para que as questões sejam autocontidas.`;
      if (textContent) {
        imagePrompt += `\n\nO professor também forneceu o seguinte texto complementar:\n${textContent}`;
      }
      userContent.push({ type: "text", text: imagePrompt });
    } else if (textContent) {
      userContent.push({ type: "text", text: `Gere questões de prova elaboradas e pedagogicamente ricas baseadas no seguinte conteúdo. Reproduza fielmente todas as fórmulas (em LaTeX), tabelas e elementos visuais:\n\n${textContent}` });
    } else {
      throw new Error("Envie imagens ou texto para gerar questões.");
    }

    // Use tool calling for structured output — faster and more reliable than JSON parsing
    const tools = [
      {
        type: "function",
        function: {
          name: "return_questions",
          description: "Retorna as questões geradas em formato estruturado.",
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["objetiva", "dissertativa", "verdadeiro_falso"] },
                    content: { type: "string", description: "Enunciado em HTML rico com fórmulas LaTeX em <span data-type='math'>, tabelas, formatação." },
                    options: { type: "array", items: { type: "string" }, description: "5 alternativas A-E (apenas para objetiva). Pode incluir LaTeX." },
                    answer: { type: "string", description: "Letra (objetiva), V/F, ou texto (dissertativa)." },
                    topic: { type: "string", description: "Tópico/assunto da questão." },
                    difficulty: { type: "string", enum: ["facil", "media", "dificil"] },
                    explanation: { type: "string", description: "Explicação pedagógica da resposta." },
                  },
                  required: ["type", "content", "answer", "topic", "difficulty", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
    ];

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
          { role: "user", content: userContent },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "return_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar questões." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Extract from tool call (primary) or fallback to message content
    let questions: any[] = [];
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        questions = parsed.questions || [];
      } catch {
        console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
      }
    }

    // Fallback: try parsing from message content
    if (questions.length === 0) {
      const raw = data.choices?.[0]?.message?.content || "[]";
      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) parsed = (parsed as Record<string, unknown>).questions || [];
        questions = Array.isArray(parsed) ? parsed : [];
      } catch {
        console.error("Failed to parse AI response:", raw);
        questions = [];
      }
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
