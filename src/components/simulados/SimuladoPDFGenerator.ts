import { Simulado, SimuladoSubject, DocumentFormat } from "@/hooks/useSimulados";
import { buildRanges, totalQuestions } from "./SimuladoConstants";
import { saveExamContent, saveExamTitle } from "@/data/examContentStore";

export function generateEditableFile(sim: Simulado, navigate: (path: string) => void) {
  const ranged = buildRanges(sim.subjects);
  const fmt = sim.format;
  let html = "";
  if (fmt.headerEnabled) {
    html += `<h1 style="text-align: center">${sim.title}</h1>`;
    html += `<p style="text-align: center"><strong>Turma(s):</strong> ${sim.class_groups.join(", ")} &nbsp;&nbsp; <strong>Data:</strong> ${sim.application_date || "___/___/______"}</p>`;
    html += `<p style="text-align: center"><strong>Aluno(a):</strong> _________________________________ &nbsp;&nbsp; <strong>Nº:</strong> _______</p>`;
    html += `<hr>`;
  }
  html += `<h2>Instruções</h2><ul><li>Leia atentamente cada questão antes de responder.</li><li>Utilize caneta azul ou preta para as respostas.</li></ul><hr>`;
  for (const s of ranged) {
    html += `<h2>${s.subject_name}</h2>`;
    if (s.content) {
      html += s.content;
    } else if (s.type === "discursiva") {
      html += `<p><strong>Questão Discursiva</strong></p><p><em>[Aguardando envio do professor]</em></p>`;
    } else {
      const start = parseInt(s.rangeLabel?.split(" a ")[0] || "1");
      for (let q = 0; q < s.question_count; q++) {
        html += `<p><strong>${start + q})</strong> [Aguardando envio]</p><p>a) ___</p><p>b) ___</p><p>c) ___</p><p>d) ___</p><p></p>`;
      }
    }
  }
  if (fmt.footerEnabled) html += `<hr><p style="text-align: center"><em>Boa prova!</em></p>`;
  const editorId = `simulado-${sim.id}`;
  saveExamContent(editorId, html);
  saveExamTitle(editorId, sim.title);
  navigate(`/provas/editor/${editorId}`);
}

function buildPDFStyles(fmt: DocumentFormat) {
  const marginMap = { narrow: "10mm 15mm", normal: "15mm 25mm", wide: "20mm 30mm" };
  const spacingMap = { compact: "1mm", normal: "3mm", wide: "6mm" };
  return `
    @page { size: A4; margin: ${marginMap[fmt.margins] || marginMap.normal}; }
    @media print { body { margin: 0; padding: 0; } .subject-section { break-inside: avoid; page-break-inside: avoid; } .answer-key-section { break-before: page; page-break-before: always; } }
    * { box-sizing: border-box; }
    body { font-family: '${fmt.fontFamily}', serif; font-size: ${fmt.fontSize}pt; line-height: 1.6; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 10mm 0; ${fmt.columns === "2" ? "column-count: 2; column-gap: 8mm;" : ""} }
    .doc-header { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 4mm; margin-bottom: 5mm; ${fmt.columns === "2" ? "column-span: all;" : ""} }
    .doc-header h1 { font-size: ${parseInt(fmt.fontSize) + 4}pt; font-weight: 700; color: #2c3e50; margin: 0 0 2mm 0; }
    .doc-header p { font-size: ${parseInt(fmt.fontSize) - 1}pt; color: #374151; margin: 1mm 0; }
    .student-line { display: flex; justify-content: space-between; font-size: ${parseInt(fmt.fontSize) - 1}pt; color: #374151; padding: 2mm 0; margin-bottom: 4mm; border-bottom: 1px solid #e5e7eb; ${fmt.columns === "2" ? "column-span: all;" : ""} }
    .instructions { margin-bottom: 4mm; padding: 2mm 4mm; border: 1px solid #d1d5db; border-radius: 1.5mm; background: #f9fafb; font-size: ${parseInt(fmt.fontSize) - 1}pt; ${fmt.columns === "2" ? "column-span: all;" : ""} }
    .instructions h2 { font-size: ${parseInt(fmt.fontSize) + 1}pt; margin: 0 0 1mm 0; color: #2c3e50; }
    .instructions ul { margin: 1mm 0; padding-left: 6mm; }
    .instructions li { margin: 0.5mm 0; }
    .subject-section { margin-bottom: ${spacingMap[fmt.questionSpacing] || spacingMap.normal}; }
    .subject-title { font-size: ${parseInt(fmt.fontSize) + 2}pt; font-weight: 700; color: #2c3e50; border-bottom: 1.5px solid #2c3e50; padding-bottom: 1.5mm; margin: 4mm 0 3mm 0; }
    .subject-content { font-size: ${fmt.fontSize}pt; line-height: 1.7; }
    .subject-content p { margin: 1mm 0; }
    .subject-content table { width: 100%; border-collapse: collapse; margin: 2mm 0; }
    .subject-content table th, .subject-content table td { border: 1px solid #d1d5db; padding: 1.5mm 3mm; text-align: left; }
    .subject-content table th { background: #f3f4f6; font-weight: 600; }
    .pending-note { padding: 2mm 4mm; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 1.5mm; font-size: ${parseInt(fmt.fontSize) - 2}pt; color: #92400e; margin-top: 4mm; ${fmt.columns === "2" ? "column-span: all;" : ""} }
    .answer-key-section { padding-top: 5mm; ${fmt.columns === "2" ? "column-span: all;" : ""} }
    .ak-title { font-size: ${parseInt(fmt.fontSize) + 2}pt; font-weight: 700; color: #2c3e50; text-align: center; margin-bottom: 4mm; border-bottom: 2px solid #2c3e50; padding-bottom: 2mm; }
    .ak-subject { font-size: ${parseInt(fmt.fontSize) - 1}pt; padding: 1.5mm 0; border-bottom: 1px solid #e5e7eb; }
    .doc-footer { text-align: center; font-size: ${parseInt(fmt.fontSize) - 3}pt; color: #9ca3af; margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #e5e7eb; ${fmt.columns === "2" ? "column-span: all;" : ""} }
  `;
}

export function generateConsolidatedPDF(sim: Simulado): boolean {
  const approvedSubjects = sim.subjects.filter((s) => s.status === "approved");
  if (approvedSubjects.length === 0) return false;

  const fmt = sim.format;
  const ranged = buildRanges(sim.subjects);
  const approvedRanged = ranged.filter((s) => s.status === "approved");

  let questionsHTML = "";
  for (const s of approvedRanged) {
    questionsHTML += `<div class="subject-section"><h2 class="subject-title">${s.subject_name}</h2>`;
    if (s.content) questionsHTML += `<div class="subject-content">${s.content}</div>`;
    questionsHTML += `</div>`;
  }

  let answerKeyHTML = "";
  const hasAnswerKeys = approvedRanged.some((s) => s.answer_key?.trim());
  if (hasAnswerKeys) {
    answerKeyHTML = `<div class="answer-key-section"><h2 class="ak-title">Gabarito</h2>`;
    for (const s of approvedRanged) {
      if (s.answer_key?.trim()) answerKeyHTML += `<div class="ak-subject"><strong>${s.subject_name}:</strong> ${s.answer_key}</div>`;
    }
    answerKeyHTML += `</div>`;
  }

  const pendingCount = sim.subjects.filter((s) => s.status !== "approved").length;
  const pendingNote = pendingCount > 0
    ? `<div class="pending-note">⚠ ${pendingCount} disciplina(s) ainda não aprovada(s) — não incluída(s) neste documento.</div>`
    : "";

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${sim.title}</title><style>${buildPDFStyles(fmt)}</style></head><body>
    ${fmt.headerEnabled ? `<div class="doc-header"><h1>${sim.title}</h1><p><strong>Turma(s):</strong> ${sim.class_groups.join(", ")} &nbsp;&nbsp; <strong>Data:</strong> ${sim.application_date || "___/___/______"}</p></div><div class="student-line"><span>Aluno(a): _________________________________________</span><span>Nº: _______</span></div>` : ""}
    <div class="instructions"><h2>Instruções</h2><ul><li>Leia atentamente cada questão antes de responder.</li><li>Utilize caneta azul ou preta para as respostas.</li><li>Total de ${approvedSubjects.length} disciplina(s) com ${totalQuestions(approvedSubjects.filter(s => s.type !== "discursiva"))} questões objetivas.</li></ul></div>
    ${questionsHTML}${pendingNote}${answerKeyHTML}
    ${fmt.footerEnabled ? `<div class="doc-footer">SmartTest — Documento gerado em ${new Date().toLocaleDateString("pt-BR")}</div>` : ""}
  </body></html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
  return true;
}

export function generateAnswerKeyPDF(sim: Simulado): boolean {
  const approved = sim.subjects.filter((s) => s.status === "approved");
  if (approved.length === 0) return false;

  const fmt = sim.format;
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Gabarito — ${sim.title}</title><style>
    @page { size: A4; margin: 15mm 25mm 20mm 25mm; }
    @media print { body { margin: 0; padding: 0; } }
    * { box-sizing: border-box; }
    body { font-family: '${fmt.fontFamily}', serif; font-size: ${fmt.fontSize}pt; line-height: 1.6; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 10mm 0; }
    .header { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 4mm; margin-bottom: 6mm; }
    .header h1 { font-size: ${parseInt(fmt.fontSize) + 4}pt; font-weight: 700; color: #2c3e50; margin: 0 0 1mm 0; }
    .header p { font-size: ${parseInt(fmt.fontSize) - 1}pt; color: #6b7280; margin: 0; }
    .subject-block { margin-bottom: 5mm; }
    .subject-name { font-size: ${parseInt(fmt.fontSize) + 1}pt; font-weight: 700; color: #2c3e50; border-bottom: 1.5px solid #d1d5db; padding-bottom: 1.5mm; margin: 3mm 0 2mm 0; }
    .answer-table { width: 100%; border-collapse: collapse; font-size: ${fmt.fontSize}pt; }
    .answer-table th { background: #2c3e50; color: #fff; padding: 2mm 3mm; text-align: left; font-size: ${parseInt(fmt.fontSize) - 1}pt; font-weight: 600; }
    .answer-table td { border-bottom: 1px solid #e5e7eb; padding: 1.5mm 3mm; }
    .answer-table tr:nth-child(even) td { background: #f9fafb; }
    .footer { text-align: center; font-size: ${parseInt(fmt.fontSize) - 3}pt; color: #9ca3af; margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #e5e7eb; }
  </style></head><body>
    <div class="header"><h1>Gabarito</h1><p>${sim.title} — Turma(s): ${sim.class_groups.join(", ")}</p></div>
    ${approved.map((s) => `<div class="subject-block"><div class="subject-name">${s.subject_name}</div><table class="answer-table"><thead><tr><th style="width:60%">Respostas</th></tr></thead><tbody><tr><td>${s.answer_key?.trim() ? s.answer_key : '<em style="color:#9ca3af">Sem gabarito informado para esta disciplina.</em>'}</td></tr></tbody></table></div>`).join("")}
    <div class="footer">SmartTest — Gabarito gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
  </body></html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
  return true;
}
