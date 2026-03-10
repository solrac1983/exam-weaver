// Simple in-memory store for exam content (shared across pages)
import { supabase } from "@/integrations/supabase/client";

const examContents: Record<string, string> = {};
const examTitles: Record<string, string> = {};

export interface StandaloneExam {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

// In-memory cache + DB persistence
const standaloneExams: Record<string, StandaloneExam> = {};
let standaloneListeners: (() => void)[] = [];
let cachedStandaloneList: StandaloneExam[] = [];
let dbLoaded = false;

function rebuildCache() {
  cachedStandaloneList = Object.values(standaloneExams).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function notifyStandaloneListeners() {
  rebuildCache();
  standaloneListeners.forEach((fn) => fn());
}

export function subscribeStandaloneExams(listener: () => void) {
  standaloneListeners.push(listener);
  return () => {
    standaloneListeners = standaloneListeners.filter((l) => l !== listener);
  };
}

export function getStandaloneExams(): StandaloneExam[] {
  return cachedStandaloneList;
}

export async function loadStandaloneExamsFromDB(): Promise<StandaloneExam[]> {
  if (dbLoaded) return cachedStandaloneList;
  try {
    const { data, error } = await supabase
      .from("standalone_exams" as any)
      .select("id, title, content, status, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (!error && data) {
      (data as any[]).forEach((row) => {
        const exam: StandaloneExam = {
          id: row.id,
          title: row.title,
          content: row.content,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          status: row.status,
        };
        standaloneExams[exam.id] = exam;
        examContents[exam.id] = exam.content;
        examTitles[exam.id] = exam.title;
      });
      dbLoaded = true;
      notifyStandaloneListeners();
    }
  } catch (err) {
    console.error("Error loading standalone exams:", err);
  }
  return cachedStandaloneList;
}

export async function saveStandaloneExamToDB(exam: StandaloneExam, userId: string, companyId: string): Promise<string | null> {
  // Update in-memory
  standaloneExams[exam.id] = exam;
  examContents[exam.id] = exam.content;
  examTitles[exam.id] = exam.title;
  notifyStandaloneListeners();

  try {
    const { error } = await supabase
      .from("standalone_exams" as any)
      .upsert({
        id: exam.id,
        user_id: userId,
        company_id: companyId,
        title: exam.title,
        content: exam.content,
        status: exam.status,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "id" });

    if (error) {
      console.error("Error saving standalone exam:", error);
      return null;
    }

    return exam.id;
  } catch (err) {
    console.error("Error saving standalone exam:", err);
    return null;
  }
}

// Keep old function for backward compat (also saves to memory)
export function saveStandaloneExam(exam: StandaloneExam) {
  standaloneExams[exam.id] = exam;
  examContents[exam.id] = exam.content;
  examTitles[exam.id] = exam.title;
  notifyStandaloneListeners();
}

export function getStandaloneExam(id: string): StandaloneExam | undefined {
  return standaloneExams[id];
}

export function deleteStandaloneExamFromCache(id: string) {
  delete standaloneExams[id];
  delete examContents[id];
  delete examTitles[id];
  notifyStandaloneListeners();
}

export const defaultExamContent = `
<h1 style="text-align: center">AVALIAÇÃO BIMESTRAL</h1>
<p style="text-align: center"><strong>Disciplina:</strong> _________________ &nbsp;&nbsp; <strong>Professor(a):</strong> _________________</p>
<p style="text-align: center"><strong>Aluno(a):</strong> _________________________________ &nbsp;&nbsp; <strong>Turma:</strong> _______ &nbsp;&nbsp; <strong>Data:</strong> ___/___/______</p>
<hr>
<h2>Instruções</h2>
<ul>
<li>Leia atentamente cada questão antes de responder.</li>
<li>Utilize caneta azul ou preta para as respostas.</li>
<li>Não é permitido o uso de corretivo.</li>
</ul>
<hr>
<h2>Questões Objetivas</h2>
<p><strong>1)</strong> Escreva aqui o enunciado da primeira questão...</p>
<p>a) Alternativa A</p>
<p>b) Alternativa B</p>
<p>c) Alternativa C</p>
<p>d) Alternativa D</p>
<p></p>
<h2>Questões Discursivas</h2>
<p><strong>2)</strong> Escreva aqui o enunciado da questão discursiva...</p>
<p></p>
`;

export function saveExamContent(demandId: string, html: string) {
  examContents[demandId] = html;
  // Also update standalone exam content if it exists
  if (standaloneExams[demandId]) {
    standaloneExams[demandId].content = html;
    standaloneExams[demandId].updatedAt = new Date().toISOString();
    notifyStandaloneListeners();
  }
}

export function getExamContent(demandId: string): string {
  return examContents[demandId] ?? "";
}

export function saveExamTitle(demandId: string, title: string) {
  examTitles[demandId] = title;
}

export function getExamTitle(demandId: string): string | undefined {
  return examTitles[demandId];
}
