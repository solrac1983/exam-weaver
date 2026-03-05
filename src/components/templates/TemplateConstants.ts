export const segmentOptions = ["Educação Infantil", "Anos Iniciais", "Anos Finais", "Ensino Médio", "Integral"];
export const gradeOptions = ["1º ano", "2º ano", "3º ano"];
export const categoryOptions = ["Geral", "Mensal", "Bimestral", "Simulado", "Recuperação"];

export interface TemplateHeader {
  id: string;
  name: string;
  segment: string | null;
  grade: string | null;
  file_path: string;
  file_url: string;
  created_at: string;
}

export interface TemplateDocument {
  id: string;
  name: string;
  description: string | null;
  segment: string | null;
  grade: string | null;
  category: string | null;
  file_path: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

export function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
