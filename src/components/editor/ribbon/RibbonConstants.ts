import type { Editor } from "@tiptap/react";
// Side-effect import: registers `setHardPageBreak` command type via module augmentation.
import "@/components/editor/HardPageBreakExtension";

export const fontFamilies = [
  { label: "Padrão", value: "Inter" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

export const textColors = [
  { label: "Padrão", value: "" }, { label: "Preto", value: "#000000" },
  { label: "Vermelho", value: "#dc2626" }, { label: "Azul", value: "#2563eb" },
  { label: "Verde", value: "#16a34a" }, { label: "Laranja", value: "#ea580c" },
  { label: "Roxo", value: "#9333ea" }, { label: "Cinza", value: "#6b7280" },
];

export const highlightColors = [
  { label: "Amarelo", value: "#fef08a" }, { label: "Verde", value: "#bbf7d0" },
  { label: "Azul", value: "#bfdbfe" }, { label: "Rosa", value: "#fbcfe8" },
  { label: "Laranja", value: "#fed7aa" },
];

export const borderStyles = [
  { label: "Nenhuma", value: "none" },
  { label: "Fina", value: "1px solid hsl(var(--border))" },
  { label: "Média", value: "2px solid hsl(var(--border))" },
  { label: "Grossa", value: "3px solid hsl(var(--foreground))" },
  { label: "Pontilhada", value: "2px dashed hsl(var(--muted-foreground))" },
];

export const shadowEffects = [
  { label: "Nenhuma", value: "none" },
  { label: "Suave", value: "0 2px 8px rgba(0,0,0,0.12)" },
  { label: "Média", value: "0 4px 16px rgba(0,0,0,0.18)" },
  { label: "Forte", value: "0 8px 30px rgba(0,0,0,0.25)" },
];

export const borderRadiusOptions = [
  { label: "Sem arredondar", value: "0" }, { label: "Pequeno", value: "4px" },
  { label: "Médio", value: "8px" }, { label: "Grande", value: "16px" },
  { label: "Circular", value: "50%" },
];

export const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];

export const moreFonts = [
  { label: "Padrão", value: "Inter" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Palatino", value: "'Palatino Linotype', serif" },
  { label: "Garamond", value: "Garamond, serif" },
  { label: "Comic Sans", value: "'Comic Sans MS', cursive" },
  { label: "Impact", value: "Impact, sans-serif" },
  { label: "Lucida Console", value: "'Lucida Console', monospace" },
];

// ─── Page break helpers ───
export function insertPageBreakAtEnd(editor: Editor) {
  editor.commands.setHardPageBreak();
}
