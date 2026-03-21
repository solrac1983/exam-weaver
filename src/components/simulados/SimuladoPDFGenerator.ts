import { Simulado, SimuladoSubject, DocumentFormat } from "@/hooks/useSimulados";
import { buildRanges, totalQuestions } from "./SimuladoConstants";
import { saveExamContent, saveExamTitle } from "@/data/examContentStore";

interface SubjectRange {
  order: number;
  name: string;
  start: number;
  end: number;
  isDiscursiva?: boolean;
}

function getSubjectRanges(subjects: SimuladoSubject[]): SubjectRange[] {
  const ranged = buildRanges(subjects);
  let order = 0;
  return ranged.map((s) => {
    order++;
    if (s.type === "discursiva") {
      return { order, name: s.subject_name, start: 0, end: 0, isDiscursiva: true };
    }
    const parts = s.rangeLabel?.split(" a ") || ["1", "1"];
    return { order, name: s.subject_name, start: parseInt(parts[0]), end: parseInt(parts[1] || parts[0]) };
  });
}

/**
 * Renumber questions within a subject's content HTML to use global sequential numbering.
 * Detects patterns like: <strong>1)</strong>, <strong>Questão 1)</strong>, <strong>Questão 1</strong>,
 * <b>1)</b>, numbered paragraphs, etc.
 * Also removes inline answer keys (Gabarito: X) from the content.
 */
function renumberContentQuestions(contentHtml: string, globalStart: number, questionCount: number): { html: string; extractedAnswers: Map<number, string> } {
  const extractedAnswers = new Map<number, string>();
  let html = contentHtml;

  // Extract answer keys from content before renumbering
  // Pattern 1: Block-level gabarito sections "Gabarito: ..." or "Resposta: ..."
  const gabaritoPatterns = [
    /<p[^>]*>\s*(?:<[^>]*>)*\s*(?:Gabarito|GABARITO|Resposta|RESPOSTA)\s*:\s*([\s\S]*?)(?:<\/p>)/gi,
    /<p[^>]*>\s*<(?:strong|b)>\s*(?:Gabarito|GABARITO)\s*(?:<\/(?:strong|b)>)\s*:\s*([\s\S]*?)(?:<\/p>)/gi,
  ];

  for (const pattern of gabaritoPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const answerText = match[1].replace(/<[^>]+>/g, '').trim();
      const numberedRegex = /(\d+)\s*[-:)]\s*([A-Ea-e])/g;
      let numMatch: RegExpExecArray | null;
      let hasNumbered = false;
      while ((numMatch = numberedRegex.exec(answerText)) !== null) {
        hasNumbered = true;
        const localNum = parseInt(numMatch[1]);
        extractedAnswers.set(globalStart + localNum - 1, numMatch[2].toUpperCase());
      }
      if (!hasNumbered) {
        const letters = answerText.match(/[A-Ea-e]/g);
        if (letters) {
          letters.forEach((letter, idx) => {
            extractedAnswers.set(globalStart + idx, letter.toUpperCase());
          });
        }
      }
    }
  }

  // Pattern 2: "Letra X" patterns (common in Brazilian exams) — sequential
  if (extractedAnswers.size === 0) {
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
    const letraRegex = /Letra\s+([A-Ea-e])\.?\s*(?:P[áa]g\.?\s*[\d\s,ea]+)?/gi;
    let letraMatch: RegExpExecArray | null;
    let letraIdx = 0;
    while ((letraMatch = letraRegex.exec(plainText)) !== null) {
      extractedAnswers.set(globalStart + letraIdx, letraMatch[1].toUpperCase());
      letraIdx++;
    }
  }

  // Pattern 3: "Resposta correta: X" or "Alternativa correta: X" inline patterns
  if (extractedAnswers.size === 0) {
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
    const inlineRegex = /(?:Resposta|Alternativa)\s+(?:correta|certa)\s*:\s*([A-Ea-e])/gi;
    let inlineMatch: RegExpExecArray | null;
    let inlineIdx = 0;
    while ((inlineMatch = inlineRegex.exec(plainText)) !== null) {
      extractedAnswers.set(globalStart + inlineIdx, inlineMatch[1].toUpperCase());
      inlineIdx++;
    }
  }

  // Remove gabarito sections from content
  html = html.replace(/<p[^>]*>\s*(?:<[^>]*>)*\s*(?:Gabarito|GABARITO|Resposta correta|RESPOSTA)\s*:[\s\S]*?<\/p>/gi, '');
  // Remove "Letra X" answer lines
  html = html.replace(/<p[^>]*>\s*(?:<[^>]*>)*\s*Letra\s+[A-Ea-e]\.?\s*(?:P[áa]g\.?\s*[\d\s,ea]+)?\s*(?:<[^>]*>)*\s*<\/p>/gi, '');

  // Renumber questions: replace local numbers with global "Questão N"
  let localQ = 0;

  // Pattern 1: <strong>N)</strong> or <b>N)</b>
  html = html.replace(/(<(?:strong|b)>)\s*(?:Questão\s+)?(\d+)\s*\)\s*(<\/(?:strong|b)>)/gi, (_match, openTag, _num, closeTag) => {
    localQ++;
    const globalNum = globalStart + localQ - 1;
    return `${openTag}Questão ${globalNum})${closeTag}`;
  });

  // If no replacements were made with pattern 1, try pattern 2: standalone numbered paragraphs
  if (localQ === 0) {
    html = html.replace(/<p([^>]*)>\s*(?:<(?:strong|b)>)?\s*(?:Questão\s+)?(\d+)\s*[).\-]\s*(?:<\/(?:strong|b)>)?/gi, (_match, attrs, _num) => {
      localQ++;
      const globalNum = globalStart + localQ - 1;
      return `<p${attrs}><strong>Questão ${globalNum})</strong>`;
    });
  }

  return { html, extractedAnswers };
}

/**
 * Extract answer keys from subject content and from the answer field stored by AI.
 * Returns a map of globalQuestionNumber -> answerLetter.
 */
export function extractAnswerKeysFromContent(subjects: SimuladoSubject[]): Map<number, string> {
  const allAnswers = new Map<number, string>();
  const ranged = buildRanges(subjects);

  for (const s of ranged) {
    if (s.type === "discursiva") continue;
    const rangeStr = s.rangeLabel?.split(" a ");
    const start = parseInt(rangeStr?.[0] || "1");

    // First, try from the answer_key field (already stored)
    if (s.answer_key?.trim()) {
      const ak = s.answer_key.trim();
      // Try numbered format: "1-A, 2-B, 3-C"
      const numberedRegex = /(\d+)\s*[-:]\s*([A-Ea-e])/g;
      let match: RegExpExecArray | null;
      let hasNumbered = false;
      while ((match = numberedRegex.exec(ak)) !== null) {
        hasNumbered = true;
        const localNum = parseInt(match[1]);
        allAnswers.set(start + localNum - 1, match[2].toUpperCase());
      }
      // Try sequential letters: "A, B, C, D, E" or "A B C D E"
      if (!hasNumbered) {
        const letterMatches = ak.match(/\b([A-Ea-e])\b/g);
        if (letterMatches) {
          letterMatches.forEach((letter, idx) => {
            allAnswers.set(start + idx, letter.toUpperCase());
          });
        }
      }
    }

    // Then, try extracting from content HTML (handles Gabarito:, Letra X, Resposta correta:, etc.)
    if (s.content) {
      const { extractedAnswers } = renumberContentQuestions(s.content, start, s.question_count);
      for (const [qNum, ans] of extractedAnswers) {
        if (!allAnswers.has(qNum)) {
          allAnswers.set(qNum, ans);
        }
      }
    }

    // Also try "Letra X" pattern directly from content even if renumber didn't catch it
    if (s.content && allAnswers.size < start + s.question_count - 1) {
      const plainText = s.content.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
      
      // Pattern: "Gabarito: A" or "Resposta: B" (single letter per question, sequential)
      const singleGabRegex = /(?:Gabarito|Resposta)\s*:\s*([A-Ea-e])/gi;
      let gabMatch: RegExpExecArray | null;
      let gabIdx = 0;
      while ((gabMatch = singleGabRegex.exec(plainText)) !== null) {
        const qNum = start + gabIdx;
        if (!allAnswers.has(qNum)) {
          allAnswers.set(qNum, gabMatch[1].toUpperCase());
        }
        gabIdx++;
      }
    }
  }

  return allAnswers;
}

/**
 * Parse answer keys from all subjects into a map of questionNumber -> answer letter.
 * Supports formats: "1-A, 2-B, 3-C" or "1-A 2-B 3-C" or "A, B, C" (positional within subject range)
 */
function parseAnswerKeys(subjects: SimuladoSubject[]): Map<number, string> {
  // Use the enhanced extraction that also checks content
  return extractAnswerKeysFromContent(subjects);
}

function buildAnswerKeyGridHTML(ranges: SubjectRange[], title: string, answerMap?: Map<number, string>): string {
  const objectiveRanges = ranges.filter((r) => !r.isDiscursiva);
  const totalQ = objectiveRanges.length > 0 ? objectiveRanges[objectiveRanges.length - 1].end : 0;
  if (totalQ === 0) return "";

  let html = `<div style="break-before:page;page-break-before:always;"></div>`;
  html += `<h2 style="text-align:center;margin:8px 0 4px 0;font-size:14pt;font-weight:700;">GABARITO</h2>`;
  html += `<p style="text-align:center;font-size:9pt;color:#555;margin:0 0 8px 0;">${title}</p>`;

  // Subject legend
  html += `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:8pt;">`;
  html += `<tbody>`;
  for (const r of ranges) {
    html += `<tr>`;
    html += `<td style="padding:1px 6px;border:1px solid #ccc;font-weight:600;width:30px;text-align:center;">${r.order}</td>`;
    html += `<td style="padding:1px 6px;border:1px solid #ccc;">${r.name}</td>`;
    html += `<td style="padding:1px 6px;border:1px solid #ccc;width:120px;text-align:center;">${r.isDiscursiva ? "Redação" : `Questão ${r.start} a ${r.end}`}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table>`;

  // Answer grid - 10 columns (5 pairs of Questão/Resp.)
  const perCol = Math.ceil(totalQ / 5);
  html += `<table style="width:100%;border-collapse:collapse;font-size:9pt;">`;
  html += `<thead><tr>`;
  for (let c = 0; c < 5; c++) {
    html += `<th style="border:1px solid #999;background:#e5e5e5;padding:3px 4px;text-align:center;font-weight:700;">Questão</th>`;
    html += `<th style="border:1px solid #999;background:#e5e5e5;padding:3px 4px;text-align:center;font-weight:700;">Resp.</th>`;
  }
  html += `</tr></thead><tbody>`;

  // Build rows: questions go down then across (column-major)
  for (let row = 0; row < perCol; row++) {
    html += `<tr>`;
    for (let col = 0; col < 5; col++) {
      const qNum = col * perCol + row + 1;
      if (qNum <= totalQ) {
        const subj = objectiveRanges.find((r) => qNum >= r.start && qNum <= r.end);
        const isFirstOfSubject = subj && qNum === subj.start;
        const bgColor = isFirstOfSubject ? "#f0f0f0" : "transparent";
        const answer = answerMap?.get(qNum) || "";
        html += `<td style="border:1px solid #bbb;padding:2px 6px;text-align:center;font-weight:600;background:${bgColor};">Questão ${qNum}</td>`;
        html += `<td style="border:1px solid #bbb;padding:2px 6px;text-align:center;min-width:30px;font-weight:${answer ? '700' : '400'};color:${answer ? '#1a1a1a' : 'transparent'};">${answer || "&nbsp;"}</td>`;
      } else {
        html += `<td style="border:1px solid #ddd;padding:2px 6px;"></td>`;
        html += `<td style="border:1px solid #ddd;padding:2px 6px;"></td>`;
      }
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;

  return html;
}

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
      const start = parseInt(s.rangeLabel?.split(" a ")[0] || "1");
      const { html: renumbered } = renumberContentQuestions(s.content, start, s.question_count);
      html += renumbered;
    } else if (s.type === "discursiva") {
      html += `<p><strong>Questão Discursiva</strong></p><p><em>[Aguardando envio do professor]</em></p>`;
    } else {
      const start = parseInt(s.rangeLabel?.split(" a ")[0] || "1");
      for (let q = 0; q < s.question_count; q++) {
        html += `<p style="text-align:justify;"><strong>Questão ${start + q})</strong> [Aguardando envio]</p><p>a) ___</p><p>b) ___</p><p>c) ___</p><p>d) ___</p><p></p>`;
      }
    }
  }

  // Append answer key grid page with auto-filled answers
  const subjectRanges = getSubjectRanges(sim.subjects);
  const answerMap = parseAnswerKeys(sim.subjects);
  html += buildAnswerKeyGridHTML(subjectRanges, sim.title, answerMap);

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
    .subject-content { font-size: ${fmt.fontSize}pt; line-height: 1.7; text-align: justify; }
    .subject-content p { margin: 1mm 0; text-align: justify; }
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
    if (s.content) {
      const start = parseInt(s.rangeLabel?.split(" a ")[0] || "1");
      const { html: renumbered } = renumberContentQuestions(s.content, start, s.question_count);
      questionsHTML += `<div class="subject-content">${renumbered}</div>`;
    }
    questionsHTML += `</div>`;
  }

  // Build answer key grid with auto-filled answers
  const subjectRanges = getSubjectRanges(sim.subjects);
  const answerMap = parseAnswerKeys(sim.subjects);
  const answerKeyGridHTML = buildAnswerKeyGridHTML(subjectRanges, sim.title, answerMap);

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
    ${questionsHTML}${pendingNote}${answerKeyGridHTML}${answerKeyHTML}
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
  const subjectRanges = getSubjectRanges(sim.subjects);
  const answerMap = parseAnswerKeys(sim.subjects);
  const objectiveRanges = subjectRanges.filter((r) => !r.isDiscursiva);
  const totalQ = objectiveRanges.length > 0 ? objectiveRanges[objectiveRanges.length - 1].end : 0;
  const perCol = Math.ceil(totalQ / 5);

  let gridRows = "";
  for (let row = 0; row < perCol; row++) {
    gridRows += `<tr>`;
    for (let col = 0; col < 5; col++) {
      const qNum = col * perCol + row + 1;
      if (qNum <= totalQ) {
        const subj = objectiveRanges.find((r) => qNum >= r.start && qNum <= r.end);
        const isFirst = subj && qNum === subj.start;
        const answer = answerMap.get(qNum) || "";
        gridRows += `<td style="border:1px solid #bbb;padding:1.5mm 3mm;text-align:center;font-weight:600;font-size:8pt;${isFirst ? "background:#f0f0f0;" : ""}">Questão ${qNum}</td>`;
        gridRows += `<td style="border:1px solid #bbb;padding:1.5mm 3mm;text-align:center;min-width:12mm;font-weight:${answer ? '700' : '400'};">${answer || "&nbsp;"}</td>`;
      } else {
        gridRows += `<td style="border:1px solid #ddd;padding:1.5mm 3mm;"></td><td style="border:1px solid #ddd;padding:1.5mm 3mm;"></td>`;
      }
    }
    gridRows += `</tr>`;
  }

  let legendRows = "";
  for (const r of subjectRanges) {
    legendRows += `<tr><td style="padding:1mm 3mm;border:1px solid #ccc;text-align:center;font-weight:600;">${r.order}</td><td style="padding:1mm 3mm;border:1px solid #ccc;">${r.name}</td><td style="padding:1mm 3mm;border:1px solid #ccc;text-align:center;">${r.isDiscursiva ? "Redação" : `${r.start} a ${r.end}`}</td></tr>`;
  }

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Gabarito — ${sim.title}</title><style>
    @page { size: A4; margin: 15mm 25mm 20mm 25mm; }
    @media print { body { margin: 0; padding: 0; } }
    * { box-sizing: border-box; }
    body { font-family: '${fmt.fontFamily}', serif; font-size: ${fmt.fontSize}pt; line-height: 1.5; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 10mm 0; }
  </style></head><body>
    <h1 style="text-align:center;font-size:${parseInt(fmt.fontSize) + 4}pt;margin:0 0 2mm 0;color:#2c3e50;">GABARITO</h1>
    <p style="text-align:center;font-size:${parseInt(fmt.fontSize) - 1}pt;color:#6b7280;margin:0 0 5mm 0;">${sim.title} — Turma(s): ${sim.class_groups.join(", ")}</p>
    <table style="width:100%;border-collapse:collapse;font-size:${parseInt(fmt.fontSize) - 2}pt;margin-bottom:5mm;">${legendRows}</table>
    <table style="width:100%;border-collapse:collapse;font-size:${fmt.fontSize}pt;">
      <thead><tr>${Array(5).fill(`<th style="border:1px solid #999;background:#e5e5e5;padding:2mm 3mm;text-align:center;font-weight:700;">Questão</th><th style="border:1px solid #999;background:#e5e5e5;padding:2mm 3mm;text-align:center;font-weight:700;">Resp.</th>`).join("")}</tr></thead>
      <tbody>${gridRows}</tbody>
    </table>
    <p style="text-align:center;font-size:${parseInt(fmt.fontSize) - 3}pt;color:#9ca3af;margin-top:8mm;padding-top:3mm;border-top:1px solid #e5e7eb;">SmartTest — Gabarito gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
  </body></html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
  return true;
}
