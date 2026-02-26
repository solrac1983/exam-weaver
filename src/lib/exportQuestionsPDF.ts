import { renderMathInHTML, renderMathInText } from "./renderMath";
import type { GeneratedQuestion } from "@/pages/AIQuestionGeneratorPage";

const typeLabels: Record<string, string> = {
  objetiva: "Múltipla Escolha",
  dissertativa: "Dissertativa",
  verdadeiro_falso: "V ou F",
};

const difficultyLabels: Record<string, string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
};

export function exportQuestionsToPDF(questions: GeneratedQuestion[], title?: string) {
  const questionsHTML = questions
    .map((q, i) => {
      const content = renderMathInHTML(q.content);
      const optionsHTML =
        q.type === "objetiva" && q.options?.length
          ? `<div class="options">${q.options
              .map(
                (opt, j) =>
                  `<div class="option">${String.fromCharCode(65 + j)}) ${renderMathInText(opt)}</div>`
              )
              .join("")}</div>`
          : "";

      return `
        <div class="question">
          <div class="question-header">
            <span class="question-number">Questão ${i + 1}</span>
            <span class="badge type">${typeLabels[q.type] || q.type}</span>
            <span class="badge difficulty ${q.difficulty}">${difficultyLabels[q.difficulty] || q.difficulty}</span>
            ${q.topic ? `<span class="topic">${q.topic}</span>` : ""}
          </div>
          <div class="question-content">${content}</div>
          ${optionsHTML}
        </div>
      `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title || "Questões Geradas por IA"}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.33/dist/katex.min.css">
  <style>
    @media print {
      body { margin: 0; }
      .question { break-inside: avoid; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm 20mm;
    }
    h1 {
      font-size: 16pt;
      text-align: center;
      margin-bottom: 6mm;
      color: #2c3e50;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 4mm;
    }
    .meta {
      text-align: center;
      font-size: 9pt;
      color: #666;
      margin-bottom: 8mm;
    }
    .question {
      margin-bottom: 6mm;
      padding: 4mm;
      border: 1px solid #e5e7eb;
      border-radius: 3mm;
      background: #fafbfc;
    }
    .question-header {
      display: flex;
      align-items: center;
      gap: 2mm;
      margin-bottom: 2mm;
      flex-wrap: wrap;
    }
    .question-number {
      font-weight: 700;
      font-size: 11pt;
      color: #2c3e50;
    }
    .badge {
      font-size: 8pt;
      padding: 0.5mm 2.5mm;
      border-radius: 2mm;
      font-weight: 600;
    }
    .badge.type {
      background: #dbeafe;
      color: #1d4ed8;
    }
    .badge.difficulty.facil { background: #d1fae5; color: #065f46; }
    .badge.difficulty.media { background: #fef3c7; color: #92400e; }
    .badge.difficulty.dificil { background: #fee2e2; color: #991b1b; }
    .topic {
      font-size: 8pt;
      color: #6b7280;
      font-style: italic;
    }
    .question-content {
      font-size: 11pt;
      line-height: 1.7;
    }
    .question-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 3mm 0;
    }
    .question-content table th,
    .question-content table td {
      border: 1px solid #d1d5db;
      padding: 2mm 3mm;
      text-align: left;
      font-size: 10pt;
    }
    .question-content table th {
      background: #f3f4f6;
      font-weight: 600;
    }
    .options {
      margin-top: 3mm;
      padding-left: 4mm;
    }
    .option {
      font-size: 10.5pt;
      line-height: 1.8;
      color: #374151;
    }
    .katex { font-size: 1em !important; }
  </style>
</head>
<body>
  <h1>${title || "Questões Geradas por IA"}</h1>
  <div class="meta">${questions.length} questão(ões) • Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
  ${questionsHTML}
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Permita pop-ups para exportar o PDF.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  // Wait for KaTeX CSS to load before printing
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 500);
  };
}
