/**
 * AnswerKeyModel — derives a structured answer key from the editor document.
 *
 * Walks the ProseMirror document looking for `questionBlock` nodes and the
 * `alternativeItem` nodes inside them. Returns one AnswerKeyEntry per
 * question, with the correct letter when present.
 */
import type { Editor } from "@tiptap/react";

export interface AnswerKeyEntry {
  number: number;
  questionId: string;
  subject?: string;
  /** Letter (A-E) or null when no alternative is marked correct. */
  letter: string | null;
  /** Has at least one alternative? Used by validator. */
  hasAlternatives: boolean;
}

export function buildAnswerKey(editor: Editor): AnswerKeyEntry[] {
  const entries: AnswerKeyEntry[] = [];
  if (!editor) return entries;

  editor.state.doc.descendants((node) => {
    if (node.type.name !== "questionBlock") return;
    const attrs = node.attrs as { id?: string; number?: number; subject?: string };
    let letter: string | null = null;
    let hasAlternatives = false;

    node.descendants((child) => {
      if (child.type.name !== "alternativeItem") return;
      hasAlternatives = true;
      const a = child.attrs as { letter?: string; isCorrect?: boolean };
      if (a.isCorrect && !letter && a.letter) letter = a.letter;
    });

    entries.push({
      number: attrs.number ?? entries.length + 1,
      questionId: attrs.id ?? `q_${entries.length + 1}`,
      subject: attrs.subject,
      letter,
      hasAlternatives,
    });
    return false; // don't descend; already walked alternatives manually
  });

  return entries;
}

/** Group answer key entries by subject (for multidisciplinary exams). */
export function groupBySubject(
  entries: AnswerKeyEntry[],
): Record<string, AnswerKeyEntry[]> {
  const out: Record<string, AnswerKeyEntry[]> = {};
  for (const e of entries) {
    const key = e.subject?.trim() || "Geral";
    (out[key] ??= []).push(e);
  }
  return out;
}

/** Pretty serialisation: `1-A, 2-C, 3-E…` */
export function serializeAnswerKey(entries: AnswerKeyEntry[]): string {
  return entries
    .filter((e) => e.letter)
    .map((e) => `${e.number}-${e.letter}`)
    .join(", ");
}
