// Simple in-memory store for exam content (shared across pages)
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

const standaloneExams: Record<string, StandaloneExam> = {};
let standaloneListeners: (() => void)[] = [];
let cachedStandaloneList: StandaloneExam[] = [];

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

export function saveStandaloneExam(exam: StandaloneExam) {
  standaloneExams[exam.id] = exam;
  examContents[exam.id] = exam.content;
  examTitles[exam.id] = exam.title;
  notifyStandaloneListeners();
}

export function getStandaloneExam(id: string): StandaloneExam | undefined {
  return standaloneExams[id];
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
<p><strong>1)</strong> Escreva aqui o enunciado da questão discursiva...</p>
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
