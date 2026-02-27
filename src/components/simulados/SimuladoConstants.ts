import { SimuladoSubject } from "@/hooks/useSimulados";

export const availableSubjects = [
  "Inglês", "Gramática", "Interpretação Textual", "Literatura", "Arte",
  "Educação Física", "Redação", "Geografia", "História", "Filosofia",
  "Sociologia", "Matemática", "Física", "Química", "Biologia", "Português",
];

export const fontFamilies = [
  "Times New Roman", "Arial", "Calibri", "Courier New", "Georgia",
  "Verdana", "Tahoma", "Garamond",
];

export const fontSizes = ["10", "11", "12", "13", "14", "16", "18"];

export const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  complete: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export const statusLabels: Record<string, string> = {
  draft: "Rascunho", sent: "Enviado", in_progress: "Em andamento", complete: "Completo",
};

export const subjectStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  submitted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  revision_requested: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export const subjectStatusLabels: Record<string, string> = {
  pending: "Pendente", in_progress: "Em andamento", submitted: "Enviada",
  approved: "Aprovada", revision_requested: "Revisão solicitada",
};

export function buildRanges(subjects: SimuladoSubject[]) {
  let current = 1;
  return subjects.map((s) => {
    if (s.type === "discursiva") return { ...s, rangeLabel: "Discursiva" };
    const start = current;
    const end = current + s.question_count - 1;
    current = end + 1;
    return { ...s, rangeLabel: `${start} a ${end}` };
  });
}

export function totalQuestions(subjects: SimuladoSubject[]) {
  return subjects.reduce((sum, s) => sum + (s.type === "discursiva" ? 0 : s.question_count), 0);
}
