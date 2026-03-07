import { toast } from "sonner";
import { renderMathInHTML, renderMathInText } from "./renderMath";
import type { GeneratedQuestion } from "@/pages/AIQuestionGeneratorPage";
import type { PDFHeaderConfig } from "@/components/ai/PDFExportDialog";

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

function buildHeaderHTML(config: PDFHeaderConfig): string {
  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const logoHTML = config.logoBase64
    ? `<img src="${config.logoBase64}" class="header-logo" alt="Logo" />`
    : "";

  const infoLines: string[] = [];
  if (config.institution) infoLines.push(`<span class="header-institution">${config.institution}</span>`);
  if (config.title) infoLines.push(`<span class="header-title">${config.title}</span>`);

  const metaParts: string[] = [];
  if (config.subject) metaParts.push(`<strong>Disciplina:</strong> ${config.subject}`);
  if (config.grade) metaParts.push(`<strong>Série/Turma:</strong> ${config.grade}`);
  if (config.author) metaParts.push(`<strong>Professor(a):</strong> ${config.author}`);
  metaParts.push(`<strong>Data:</strong> ${date}`);

  return `
    <table class="doc-header">
      <tr>
        ${logoHTML ? `<td class="header-logo-cell">${logoHTML}</td>` : ""}
        <td class="header-info-cell">
          ${infoLines.join("<br/>")}
        </td>
        <td class="header-date-cell">${date}</td>
      </tr>
    </table>
    <div class="header-meta">${metaParts.join(" &nbsp;|&nbsp; ")}</div>
    <div class="student-line">
      <span>Nome: ________________________________________</span>
      <span>Nº: ______</span>
    </div>
  `;
}

function buildAnswerKeyHTML(questions: GeneratedQuestion[]): string {
  const rows = questions.map((q, i) => {
    let answer = "";
    if (q.type === "objetiva" && q.options?.length) {
      // Find the correct option letter
      const idx = q.options.findIndex(opt => opt.trim() === q.answer.trim());
      if (idx >= 0) {
        answer = String.fromCharCode(65 + idx);
      } else {
        // Try matching by letter prefix (e.g., "A", "B")
        const match = q.answer.match(/^([A-E])/i);
        answer = match ? match[1].toUpperCase() : q.answer;
      }
    } else if (q.type === "verdadeiro_falso") {
      answer = q.answer;
    } else {
      answer = q.answer.length > 120 ? q.answer.substring(0, 120) + "…" : q.answer;
    }
    return `<tr><td class="ak-num">${i + 1}</td><td class="ak-type">${typeLabels[q.type] || q.type}</td><td class="ak-answer">${renderMathInText(answer)}</td></tr>`;
  }).join("");

  return `
    <div class="answer-key">
      <h2 class="ak-title">Gabarito</h2>
      <table class="ak-table">
        <thead><tr><th>Nº</th><th>Tipo</th><th>Resposta</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export function exportQuestionsToPDF(questions: GeneratedQuestion[], config?: PDFHeaderConfig) {
  const title = config?.title || "Questões Geradas por IA";

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

      const pbClass = config?.pageBreakPerQuestion && i > 0 ? " page-break" : "";
      return `
        <div class="question${pbClass}">
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

  const headerHTML = config ? buildHeaderHTML(config) : `<h1 class="simple-title">${title}</h1>`;

  // Build answer key (gabarito) section
  const showAnswerKey = config?.includeAnswerKey !== false;
  const answerKeyHTML = showAnswerKey ? buildAnswerKeyHTML(questions) : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.33/dist/katex.min.css">
  <style>
    @page {
      size: A4;
      margin: 15mm 25mm 20mm 25mm;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .question { break-inside: avoid; page-break-inside: avoid; }
      .question.page-break { break-before: page; page-break-before: always; }
      .page-header { position: running(pageHeader); }
      .page-footer { position: running(pageFooter); }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm 0;
    }

    /* ===== Document Header ===== */
    .doc-header {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #2c3e50;
      margin-bottom: 3mm;
    }
    .doc-header td {
      padding: 3mm 4mm;
      vertical-align: middle;
    }
    .header-logo-cell {
      width: 18mm;
      border-right: 1px solid #d1d5db;
      text-align: center;
    }
    .header-logo {
      max-height: 16mm;
      max-width: 16mm;
      object-fit: contain;
    }
    .header-info-cell {
      text-align: center;
    }
    .header-institution {
      font-size: 13pt;
      font-weight: 700;
      color: #1e3a5f;
      display: block;
      letter-spacing: 0.3px;
    }
    .header-title {
      font-size: 11pt;
      font-weight: 600;
      color: #374151;
      display: block;
      margin-top: 1mm;
    }
    .header-date-cell {
      width: 28mm;
      text-align: right;
      font-size: 8pt;
      color: #6b7280;
      border-left: 1px solid #d1d5db;
    }
    .header-meta {
      font-size: 8.5pt;
      color: #4b5563;
      padding: 2mm 1mm;
      border-bottom: 1.5px solid #2c3e50;
      margin-bottom: 3mm;
    }
    .student-line {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      color: #374151;
      padding: 2mm 0;
      margin-bottom: 5mm;
      border-bottom: 1px solid #e5e7eb;
    }

    /* ===== Simple title (no config) ===== */
    .simple-title {
      font-size: 16pt;
      text-align: center;
      margin-bottom: 2mm;
      color: #2c3e50;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 3mm;
    }
    .meta-line {
      text-align: center;
      font-size: 9pt;
      color: #666;
      margin-bottom: 6mm;
    }

    /* ===== Questions ===== */
    .question {
      margin-bottom: 1.5mm;
      padding: 2.5mm 4mm;
      border: 1px solid #e5e7eb;
      border-radius: 1.5mm;
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
      font-size: 10.5pt;
      color: #2c3e50;
    }
    .badge {
      font-size: 7.5pt;
      padding: 0.5mm 2mm;
      border-radius: 1.5mm;
      font-weight: 600;
    }
    .badge.type { background: #dbeafe; color: #1d4ed8; }
    .badge.difficulty.facil { background: #d1fae5; color: #065f46; }
    .badge.difficulty.media { background: #fef3c7; color: #92400e; }
    .badge.difficulty.dificil { background: #fee2e2; color: #991b1b; }
    .topic { font-size: 7.5pt; color: #6b7280; font-style: italic; }
    .question-content {
      font-size: 10.5pt;
      line-height: 1.7;
    }
    .question-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 2mm 0;
    }
    .question-content table th,
    .question-content table td {
      border: 1px solid #d1d5db;
      padding: 1.5mm 3mm;
      text-align: left;
      font-size: 9.5pt;
    }
    .question-content table th {
      background: #f3f4f6;
      font-weight: 600;
    }
    .options {
      margin-top: 2mm;
      padding-left: 4mm;
    }
    .option {
      font-size: 10pt;
      line-height: 1.8;
      color: #374151;
    }
    .katex { font-size: 1em !important; }

    /* ===== Answer Key ===== */
    .answer-key {
      break-before: page;
      page-break-before: always;
      padding-top: 5mm;
    }
    .ak-title {
      font-size: 14pt;
      font-weight: 700;
      color: #2c3e50;
      text-align: center;
      margin-bottom: 4mm;
      border-bottom: 2px solid #2c3e50;
      padding-bottom: 2mm;
    }
    .ak-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    .ak-table th {
      background: #2c3e50;
      color: #fff;
      padding: 2mm 3mm;
      text-align: left;
      font-size: 9pt;
      font-weight: 600;
    }
    .ak-table td {
      border-bottom: 1px solid #e5e7eb;
      padding: 1.5mm 3mm;
      vertical-align: top;
    }
    .ak-table tr:nth-child(even) td { background: #f9fafb; }
    .ak-num { width: 8mm; text-align: center; font-weight: 700; color: #2c3e50; }
    .ak-type { width: 25mm; font-size: 8.5pt; color: #6b7280; }
    .ak-answer { color: #1a1a1a; }

    /* ===== Footer ===== */
    .doc-footer {
      text-align: center;
      font-size: 7.5pt;
      color: #9ca3af;
      margin-top: 8mm;
      padding-top: 3mm;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  ${headerHTML}
  ${!config ? `<div class="meta-line">${questions.length} questão(ões) • Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>` : ""}
  ${questionsHTML}
  ${answerKeyHTML}
  <div class="doc-footer">
    ${config?.institution ? config.institution + " — " : ""}Documento gerado por SmartTest • ${new Date().toLocaleDateString("pt-BR")}
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Permita pop-ups para exportar o PDF.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 500);
  };
}
