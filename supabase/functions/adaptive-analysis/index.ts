import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companyId, classGroup, subjectId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch grades for the class/subject
    let query = supabase
      .from("grades")
      .select("score, max_score, bimester, grade_type, subject_id, subjects(name)")
      .eq("company_id", companyId);

    if (classGroup) query = query.eq("class_group", classGroup);
    if (subjectId) query = query.eq("subject_id", subjectId);

    const { data: grades, error } = await query.limit(1000);
    if (error) throw error;

    if (!grades || grades.length === 0) {
      return new Response(JSON.stringify({
        hasData: false,
        message: "Sem dados de notas para esta turma/disciplina.",
        recommendation: { facil: 30, media: 40, dificil: 30 },
        classAverage: 0,
        totalStudents: 0,
        subjectAnalysis: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Calculate class performance metrics
    const percentages = grades.map((g: any) => (g.score / g.max_score) * 100);
    const classAverage = percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length;

    // Count unique students (approximate from grade entries)
    const studentIds = new Set(grades.map((g: any) => g.subject_id)); // rough count
    
    // Analyze by subject
    const subjectMap: Record<string, { name: string; scores: number[] }> = {};
    for (const g of grades as any[]) {
      const subName = g.subjects?.name || "Geral";
      const subId = g.subject_id || "geral";
      if (!subjectMap[subId]) subjectMap[subId] = { name: subName, scores: [] };
      subjectMap[subId].scores.push((g.score / g.max_score) * 100);
    }

    const subjectAnalysis = Object.entries(subjectMap).map(([id, data]) => {
      const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      const below60 = data.scores.filter(s => s < 60).length;
      const above80 = data.scores.filter(s => s > 80).length;
      return {
        subjectId: id,
        subjectName: data.name,
        average: Math.round(avg * 10) / 10,
        totalGrades: data.scores.length,
        below60Pct: Math.round((below60 / data.scores.length) * 100),
        above80Pct: Math.round((above80 / data.scores.length) * 100),
        weakArea: avg < 60,
        strongArea: avg > 80,
      };
    }).sort((a, b) => a.average - b.average);

    // Adaptive difficulty recommendation based on class average
    let recommendation: { facil: number; media: number; dificil: number };
    let strategy: string;

    if (classAverage < 45) {
      // Very weak class: more easy questions to build confidence
      recommendation = { facil: 50, media: 35, dificil: 15 };
      strategy = "Turma com desempenho abaixo do esperado. Priorizando questões mais acessíveis para reforçar conceitos fundamentais e construir confiança, com desafios pontuais para estimular progresso.";
    } else if (classAverage < 60) {
      // Below average: balanced with slight easy bias
      recommendation = { facil: 40, media: 40, dificil: 20 };
      strategy = "Turma em desenvolvimento. Distribuição equilibrada com ênfase em consolidação de conteúdos básicos e médios, introduzindo gradualmente desafios maiores.";
    } else if (classAverage < 75) {
      // Average: standard distribution
      recommendation = { facil: 25, media: 45, dificil: 30 };
      strategy = "Turma com bom desempenho. Foco em questões de nível médio e difícil para aprofundamento, mantendo base acessível para consolidação.";
    } else if (classAverage < 85) {
      // Good: more challenging
      recommendation = { facil: 15, media: 40, dificil: 45 };
      strategy = "Turma avançada. Priorizando questões desafiadoras para estimular pensamento crítico e análise, com suporte em questões médias.";
    } else {
      // Excellent: highly challenging
      recommendation = { facil: 10, media: 30, dificil: 60 };
      strategy = "Turma de alto desempenho. Foco em questões de alta complexidade, análise e síntese, para manter o engajamento e aprofundar competências.";
    }

    // Identify weak topics for focused questions
    const weakSubjects = subjectAnalysis.filter(s => s.weakArea).map(s => s.subjectName);
    const strongSubjects = subjectAnalysis.filter(s => s.strongArea).map(s => s.subjectName);

    return new Response(JSON.stringify({
      hasData: true,
      classAverage: Math.round(classAverage * 10) / 10,
      totalGrades: grades.length,
      recommendation,
      strategy,
      subjectAnalysis,
      weakSubjects,
      strongSubjects,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("adaptive-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
