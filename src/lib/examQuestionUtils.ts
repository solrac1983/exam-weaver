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
      let qHtml = `<p><strong>Questão ${num})</strong> ${q.content.replace(/^\s*<p>/, "<p>")}</p>`;
      // Remove any existing numbering from the content
      qHtml = qHtml.replace(/<p><strong>(?:Questão\s+)?\d+\)<\/strong>\s*<p>/, "<p><strong>Questão " + num + ")</strong> ");
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

/**
 * Extracts answer keys from editor HTML content.
 * Detects patterns like:
 *   - "Letra C. Pág 89" / "Letra A. Pág 87 e 88"
 *   - "Gabarito: A" / "Gabarito: 1-A, 2-B"
 *   - "Resposta: C"
 *   - Inline gabarito sections
 * Returns array of { questionNum, answer } sorted by questionNum.
 */
export function extractAnswersFromContent(html: string): AnswerKeyEntry[] {
  if (!html) return [];
  const answers = new Map<number, string>();

  // Strip HTML tags for text analysis
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');

  let nextSequentialQuestion = 1;
  const setNextSequentialAnswer = (answer: string) => {
    while (answers.has(nextSequentialQuestion)) nextSequentialQuestion++;
    answers.set(nextSequentialQuestion, answer.toUpperCase());
    nextSequentialQuestion++;
  };

  // Pattern 1: "Letra X. Pág NN" or "Letra X" — appears in gabarito sections
  // These are sequential within a gabarito block
  const letraRegex = /Letra\s+([A-Ea-e])\.?\s*(?:P[áa]g\.?\s*[\d\s,ea]+)?/gi;
  let letraMatch: RegExpExecArray | null;
  while ((letraMatch = letraRegex.exec(text)) !== null) {
    setNextSequentialAnswer(letraMatch[1]);
  }

  // Pattern 2: Numbered gabarito "1-A, 2-B" or "1) A" or "1: A"
  if (answers.size === 0) {
    const numberedRegex = /(?:^|\s)(\d+)\s*[-):.\s]+\s*(?:Letra\s+)?([A-Ea-e])(?:\s|[,;.\n]|$)/gm;
    let numMatch: RegExpExecArray | null;
    while ((numMatch = numberedRegex.exec(text)) !== null) {
      const qNum = parseInt(numMatch[1]);
      if (qNum > 0 && qNum <= 200) {
        answers.set(qNum, numMatch[2].toUpperCase());
      }
    }
  }

  // Pattern 3a: grouped sequential keys like "Gabarito: A, B, C"
  const groupedGabRegex = /(?:Gabarito|Resposta|Alternativa\s+correta)\s*:\s*((?:[A-Ea-e][\s,;\/\-]*){2,})/gi;
  let groupedGabMatch: RegExpExecArray | null;
  while ((groupedGabMatch = groupedGabRegex.exec(text)) !== null) {
    const letters = groupedGabMatch[1].match(/[A-Ea-e]/g) || [];
    letters.forEach((letter) => setNextSequentialAnswer(letter));
  }

  // Pattern 3b: "Gabarito:" or "Resposta:" followed by a single letter
  const gabRegex = /(?:Gabarito|Resposta|Alternativa\s+correta)\s*:\s*([A-Ea-e])(?![\s,;\/\-]*[A-Ea-e])/gi;
  let gabMatch: RegExpExecArray | null;
  while ((gabMatch = gabRegex.exec(text)) !== null) {
    setNextSequentialAnswer(gabMatch[1]);
  }

  return Array.from(answers.entries())
    .sort(([a], [b]) => a - b)
    .map(([questionNum, answer]) => ({ questionNum, answer }));
}
