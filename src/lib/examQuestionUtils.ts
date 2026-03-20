/**
 * Utilities for sequential question numbering and answer key generation in the exam editor.
 */

/**
 * Counts the highest question number present in the HTML content.
 * Looks for patterns like "1)", "2)", "01)", etc. in bold tags or at line start.
 */
export function getLastQuestionNumber(html: string): number {
  if (!html) return 0;
  // Match patterns: <strong>Questão N)</strong>, <strong>N)</strong>, <b>N)</b>, or standalone N) at paragraph start
  const regex = /(?:<(?:strong|b)>)\s*(?:Questão\s+)?(\d+)\s*\)(?:<\/(?:strong|b)>)|^\s*(?:Questão\s+)?(\d+)\s*\)/gm;
  let max = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const num = parseInt(match[1] || match[2]);
    if (num > max) max = num;
  }
  // Also check plain text patterns inside <p> tags
  const pRegex = /<p[^>]*>\s*(?:<[^>]+>\s*)*(?:Questão\s+)?(\d+)\s*\)/g;
  while ((match = pRegex.exec(html)) !== null) {
    const num = parseInt(match[1]);
    if (num > max) max = num;
  }
  return max;
}

/**
 * Formats question HTML with sequential numbering starting from `startNum`.
 * Used when inserting questions from the bank.
 */
export function numberBankQuestions(
  questions: { subjectName: string; content: string }[],
  startNum: number
): string {
  return questions
    .map((q, i) => {
      const num = startNum + i;
      return `<p><strong>Questão ${num})</strong> ${q.content}</p>`;
    })
    .join("<hr/>");
}

/**
 * Formats AI-generated questions with sequential numbering.
 */
export function numberAIQuestions(
  questions: { content: string; options?: string[] }[],
  startNum: number
): string {
  return questions
    .map((q, i) => {
      const num = startNum + i;
      let qHtml = `<p><strong>${num})</strong> ${q.content.replace(/^\s*<p>/, "<p>")}</p>`;
      // Remove any existing numbering from the content
      qHtml = qHtml.replace(/<p><strong>\d+\)<\/strong>\s*<p>/, "<p><strong>" + num + ")</strong> ");
      if (q.options && q.options.length > 0) {
        qHtml += q.options
          .map((o, idx) => `<p>${String.fromCharCode(97 + idx)}) ${o}</p>`)
          .join("");
      }
      return qHtml;
    })
    .join("<hr/>");
}

export interface AnswerKeyEntry {
  questionNum: number;
  answer: string;
}

/**
 * Generates an HTML page with the answer key table.
 */
export function generateAnswerKeyHTML(
  entries: AnswerKeyEntry[],
  title: string
): string {
  if (entries.length === 0) return "";

  const rows = entries
    .map(
      (e) =>
        `<tr><td style="text-align:center;padding:6px 16px;border:1px solid #ccc;font-weight:bold;">Questão ${e.questionNum}</td><td style="text-align:center;padding:6px 16px;border:1px solid #ccc;font-weight:bold;text-transform:uppercase;">${e.answer}</td></tr>`
    )
    .join("");

  return `
<div style="break-before:page;page-break-before:always;"></div>
<h2 style="text-align:center;margin-top:40px;">GABARITO</h2>
<p style="text-align:center;font-size:14px;color:#666;">${title}</p>
<table style="margin:20px auto;border-collapse:collapse;min-width:200px;">
<thead><tr><th style="text-align:center;padding:8px 16px;border:1px solid #ccc;background:#f5f5f5;">Questão</th><th style="text-align:center;padding:8px 16px;border:1px solid #ccc;background:#f5f5f5;">Resposta</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}
