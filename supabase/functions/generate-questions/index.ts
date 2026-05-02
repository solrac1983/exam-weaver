import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PAYLOAD_BYTES = 25 * 1024 * 1024; // 25MB request cap
const MAX_IMAGES = 10;
const MAX_TEXT_CHARS = 200_000;
const MAX_QUANTITY = 50;
const MIN_QUANTITY = 1;
const AI_TIMEOUT_MS = 120_000; // 2 minutes

const ALLOWED_DIFFICULTY = new Set(["facil", "media", "dificil", "todas"]);
const ALLOWED_TYPE = new Set(["objetiva", "dissertativa", "verdadeiro_falso", "todas"]);

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Método não permitido" }, 405);

  try {
    // Validate Content-Length to avoid huge payloads
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return jsonResp({ error: "Payload muito grande. Reduza o número/tamanho dos arquivos." }, 413);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY missing");
      return jsonResp({ error: "Configuração de IA indisponível." }, 500);
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return jsonResp({ error: "Corpo da requisição inválido." }, 400);
    }

    const {
      imagesBase64,
      imageBase64,
      textContent,
      subject,
      grade,
      quantity,
      difficulty,
      questionType,
      customInstructions,
    } = payload || {};

    // Normalize and validate inputs
    const allImages: string[] = Array.isArray(imagesBase64)
      ? imagesBase64.filter((x) => typeof x === "string" && x.startsWith("data:"))
      : imageBase64 && typeof imageBase64 === "string" && imageBase64.startsWith("data:")
        ? [imageBase64]
        : [];

    if (allImages.length > MAX_IMAGES) {
      return jsonResp({ error: `Limite de ${MAX_IMAGES} arquivos por geração.` }, 400);
    }

    const text = typeof textContent === "string" ? textContent.slice(0, MAX_TEXT_CHARS) : "";
    if (allImages.length === 0 && !text.trim()) {
      return jsonResp({ error: "Envie imagens ou texto para gerar questões." }, 400);
    }

    const qty = Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, Number(quantity) || 5));

    const safeDifficulty = ALLOWED_DIFFICULTY.has(String(difficulty)) ? String(difficulty) : "todas";
    const safeType = ALLOWED_TYPE.has(String(questionType)) ? String(questionType) : "todas";
    const safeSubject = typeof subject === "string" ? subject.slice(0, 200) : "";
    const safeGrade = typeof grade === "string" ? grade.slice(0, 100) : "";
    const safeInstructions = typeof customInstructions === "string" ? customInstructions.slice(0, 2000) : "";

    const difficultyInstruction = safeDifficulty !== "todas"
      ? `Todas as questões devem ter dificuldade "${safeDifficulty}".`
      : "Varie a dificuldade entre fácil, média e difícil de forma equilibrada.";
    const typeInstruction = safeType !== "todas"
      ? `Gere APENAS questões do tipo "${safeType}".`
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

PARA QUESTÕES OBJETIVAS:
- Sempre forneça EXATAMENTE 5 alternativas (A-E)
- O campo "answer" deve ser APENAS a letra correspondente (ex: "A", "B", "C", "D" ou "E")
- Apenas UMA alternativa correta

${difficultyInstruction}
${typeInstruction}
${safeSubject ? `Disciplina: ${safeSubject}` : ""}
${safeGrade ? `Série/Ano: ${safeGrade}` : ""}
${safeInstructions ? `\nORIENTAÇÕES ESPECÍFICAS DO PROFESSOR:\n${safeInstructions}` : ""}

Gere exatamente ${qty} questões.`;

    const userContent: any[] = [];

    if (allImages.length > 0) {
      for (const img of allImages) {
        userContent.push({ type: "image_url", image_url: { url: img } });
      }
      let imagePrompt = `Analise ${allImages.length > 1 ? "estas " + allImages.length + " páginas" : "esta página"} de livro didático. Extraia TODO o conteúdo, incluindo fórmulas, tabelas, gráficos e imagens. Gere questões de prova completas e elaboradas, reproduzindo fielmente os elementos visuais do material. IMPORTANTE: Se as imagens contiverem ilustrações, gráficos, tabelas ou diagramas relevantes para as questões, descreva-os detalhadamente no enunciado e, quando possível, recrie-os em HTML (tabelas, listas, formatação visual) para que as questões sejam autocontidas.`;
      if (text) imagePrompt += `\n\nO professor também forneceu o seguinte texto complementar:\n${text}`;
      userContent.push({ type: "text", text: imagePrompt });
    } else {
      userContent.push({
        type: "text",
        text: `Gere questões de prova elaboradas e pedagogicamente ricas baseadas no seguinte conteúdo. Reproduza fielmente todas as fórmulas (em LaTeX), tabelas e elementos visuais:\n\n${text}`,
      });
    }

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
                    options: { type: "array", items: { type: "string" }, description: "5 alternativas (apenas para objetiva). Pode incluir LaTeX." },
                    answer: { type: "string", description: "Apenas a letra (A-E) para objetiva, V/F, ou texto para dissertativa." },
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

    // Timeout for AI gateway
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
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
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === "AbortError") {
        return jsonResp({ error: "A geração demorou demais. Tente reduzir a quantidade de questões ou arquivos." }, 504);
      }
      console.error("AI gateway fetch error:", err);
      return jsonResp({ error: "Falha ao contatar o serviço de IA." }, 502);
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResp({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }, 429);
      }
      if (response.status === 402) {
        return jsonResp({ error: "Créditos de IA insuficientes." }, 402);
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return jsonResp({ error: "Erro ao gerar questões." }, 500);
    }

    const data = await response.json();

    // Extract from tool call (primary) or fallback to message content
    let questions: any[] = [];
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    if (questions.length === 0) {
      const raw = data.choices?.[0]?.message?.content || "[]";
      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) parsed = (parsed as Record<string, unknown>).questions || [];
        questions = Array.isArray(parsed) ? parsed : [];
      } catch {
        console.error("Failed to parse AI response");
        questions = [];
      }
    }

    // Sanitize the answer field for objetiva: ensure it's a single letter A-E
    questions = questions.map((q: any) => {
      if (q?.type === "objetiva" && typeof q.answer === "string") {
        const letter = q.answer.trim().match(/^[A-E]/i)?.[0]?.toUpperCase();
        if (letter) q.answer = letter;
      }
      return q;
    });

    return jsonResp({ questions });
  } catch (e) {
    console.error("generate-questions error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
