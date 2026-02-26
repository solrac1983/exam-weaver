import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imagesBase64, imageBase64, textContent, subject, grade, quantity, difficulty, questionType } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const qty = quantity || 5;
    const difficultyInstruction = difficulty && difficulty !== "todas"
      ? `Todas as questões devem ter dificuldade "${difficulty}".`
      : "Varie a dificuldade entre fácil, média e difícil.";
    const typeInstruction = questionType && questionType !== "todas"
      ? `Gere APENAS questões do tipo "${questionType}".`
      : "Varie os tipos entre objetiva, dissertativa e verdadeiro_falso.";

    const systemPrompt = `Você é um especialista em educação brasileira que gera questões de prova a partir de conteúdo de livros didáticos.

Analise o conteúdo fornecido (texto ou imagens de páginas de livro) e gere exatamente ${qty} questões.

${difficultyInstruction}
${typeInstruction}

REGRAS CRÍTICAS PARA ELEMENTOS VISUAIS:
- Se o conteúdo contiver fórmulas, equações ou expressões matemáticas, você DEVE reproduzi-las fielmente usando notação LaTeX dentro de tags <span data-type="math" data-formula="LATEX_AQUI"></span>. Exemplo: <span data-type="math" data-formula="\\frac{a^2 + b^2}{c}"></span>
- Se o conteúdo contiver gráficos, diagramas ou figuras, descreva-os detalhadamente no enunciado e, quando possível, recrie usando tabelas HTML (<table>) ou representações textuais estruturadas.
- Se o conteúdo contiver imagens essenciais para a questão (fotos, mapas, ilustrações), inclua uma tag <img> com o atributo src sendo a URL base64 da imagem original quando disponível, ou descreva a imagem entre colchetes como [Imagem: descrição detalhada da imagem].
- Preserve TODA a formatação visual do conteúdo original: negrito (<strong>), itálico (<em>), listas (<ul>/<ol>), tabelas (<table>), subscritos (<sub>), sobrescritos (<sup>).
- Para questões de ciências, física, química e matemática, SEMPRE use notação LaTeX para fórmulas em vez de texto simples.

Para cada questão, retorne um objeto JSON com:
- "type": "objetiva" | "dissertativa" | "verdadeiro_falso"
- "content": o enunciado da questão em HTML rico, incluindo fórmulas LaTeX em <span data-type="math">, tabelas, formatação e descrições de imagens
- "options": array de alternativas (apenas para objetiva, 5 opções A-E). Use LaTeX para fórmulas nas alternativas também.
- "answer": resposta correta (letra para objetiva, "V" ou "F" para V/F, texto para dissertativa)
- "topic": tópico/assunto identificado
- "difficulty": "facil" | "media" | "dificil"
- "explanation": breve explicação da resposta (pode incluir LaTeX)

Retorne APENAS um array JSON válido, sem markdown ou texto adicional.
${subject ? `Disciplina: ${subject}` : ""}
${grade ? `Série/Ano: ${grade}` : ""}`;

    const userContent: any[] = [];

    // Support multiple images (new format) or single image (legacy)
    const allImages = imagesBase64 || (imageBase64 ? [imageBase64] : []);

    if (allImages.length > 0) {
      for (const img of allImages) {
        userContent.push({ type: "image_url", image_url: { url: img } });
      }
      userContent.push({
        type: "text",
        text: `Analise ${allImages.length > 1 ? "estas " + allImages.length + " imagens/páginas" : "esta imagem"} de livro didático e gere questões de prova baseadas no conteúdo de todas elas. IMPORTANTE: Reproduza fielmente TODOS os elementos visuais encontrados — fórmulas matemáticas (usando LaTeX), tabelas, gráficos (descreva-os detalhadamente ou recrie em HTML), imagens e qualquer formatação visual. As questões devem conter os mesmos elementos gráficos do material original.`,
      });
    } else if (textContent) {
      userContent.push({ type: "text", text: `Gere questões de prova baseadas no seguinte conteúdo. Reproduza fielmente todas as fórmulas (em LaTeX), tabelas e elementos visuais presentes:\n\n${textContent}` });
    } else {
      throw new Error("Envie imagens ou texto para gerar questões.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
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
    const raw = data.choices?.[0]?.message?.content || "[]";

    let questions;
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      questions = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", raw);
      questions = [];
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
