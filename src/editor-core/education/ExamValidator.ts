/**
 * ExamValidator — produces a list of issues for the current document.
 *
 * Independent of any UI; the panel renders the result. Walks the ProseMirror
 * doc once and inspects each `questionBlock`.
 */
import type { Editor } from "@tiptap/react";

export type IssueSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: IssueSeverity;
  questionNumber?: number;
  message: string;
}

export function validateExam(editor: Editor): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!editor) return issues;

  let questionCount = 0;
  let correctCount = 0;

  editor.state.doc.descendants((node) => {
    if (node.type.name !== "questionBlock") return;
    questionCount++;
    const attrs = node.attrs as { number?: number };
    const num = attrs.number ?? questionCount;

    let hasStem = false;
    let alts = 0;
    let correct = 0;
    let emptyAlt = false;

    node.descendants((child) => {
      if (child.type.name === "questionStem") {
        if (child.textContent.trim().length >= 3) hasStem = true;
      }
      if (child.type.name === "alternativeItem") {
        alts++;
        const a = child.attrs as { isCorrect?: boolean };
        if (a.isCorrect) correct++;
        if (child.textContent.trim().length === 0) emptyAlt = true;
      }
    });

    if (!hasStem) {
      issues.push({ severity: "error", questionNumber: num, message: "Questão sem enunciado." });
    }
    if (alts === 0) {
      issues.push({ severity: "warning", questionNumber: num, message: "Questão sem alternativas." });
    } else {
      if (correct === 0) {
        issues.push({ severity: "error", questionNumber: num, message: "Nenhuma alternativa marcada como correta." });
        correctCount += 0;
      } else if (correct > 1) {
        issues.push({ severity: "warning", questionNumber: num, message: `${correct} alternativas marcadas como corretas.` });
        correctCount += 1;
      } else {
        correctCount += 1;
      }
      if (emptyAlt) {
        issues.push({ severity: "warning", questionNumber: num, message: "Há alternativa(s) em branco." });
      }
    }
    return false;
  });

  if (questionCount === 0) {
    issues.push({ severity: "info", message: "Nenhuma questão estruturada encontrada. Use o botão Inserir Questão na aba Provas." });
  } else if (correctCount < questionCount) {
    issues.push({
      severity: "warning",
      message: `Gabarito incompleto: ${correctCount} de ${questionCount} questões com resposta.`,
    });
  }

  return issues;
}
