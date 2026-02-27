import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { image_base64, total_questions, alternatives_count } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const altLetters = Array.from({ length: alternatives_count || 5 }, (_, i) =>
      String.fromCharCode(65 + i)
    ).join(", ");

    const systemPrompt = `You are an expert OCR system specialized in reading filled-in bubble answer sheets (cartões de resposta / folhas de gabarito).

The answer sheet has this structure:
- Alignment markers (black squares) in the four corners for orientation.
- A grid with questions numbered 01, 02, 03... in the leftmost column.
- Each question row has ${alternatives_count || 5} bubbles labeled ${altLetters}.
- Questions may be grouped by subject with dark header rows.
- The bubbles are SVG circles. A FILLED (darkened/shaded) bubble = student's answer. An EMPTY bubble = not selected.

Your task:
1. Identify the orientation using the corner alignment markers.
2. For each question number (01 to ${total_questions || "the last visible"}), determine which single bubble is filled.
3. Return ONLY a valid JSON object.

Rules:
- Question keys are string numbers: "1", "2", "3", etc.
- Values are single uppercase letters: ${altLetters}.
- If NO bubble is filled or it's ambiguous/unclear, use "X".
- If MULTIPLE bubbles are filled for the same question, use "X".
- Ignore section headers (dark background rows with subject names).
- Return ONLY the JSON, no markdown, no explanation. Format: {"1":"A","2":"B","3":"C",...}
- Be extremely precise. Double-check each row.`;

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
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${image_base64}` },
              },
              {
                type: "text",
                text: `Read all ${total_questions || ""} answers from this answer sheet. Return only JSON.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    // Extract JSON from the response (may be wrapped in markdown code blocks)
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    
    // Try to find a JSON object in the string
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!objMatch) {
      return new Response(
        JSON.stringify({ error: "Could not parse AI response", raw: rawContent }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const answers = JSON.parse(objMatch[0]);

    return new Response(JSON.stringify({ answers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("read-answer-sheet error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
