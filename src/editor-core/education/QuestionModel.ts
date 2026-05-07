/**
 * QuestionModel — pure data shape for a question block.
 *
 * The Tiptap node `questionBlock` (see QuestionBlockExtension) stores these
 * fields as `attrs`. This module is independent so importers, exporters and
 * the AnswerKey/Validator services can manipulate questions without touching
 * the editor instance.
 */

export type QuestionDifficulty = "facil" | "media" | "dificil";

export interface QuestionAttrs {
  /** Stable id, generated on insert. */
  id: string;
  /** 1-based number; recomputed reactively by the extension. */
  number: number;
  subject?: string;
  topic?: string;
  difficulty?: QuestionDifficulty;
  points?: number;
  /** Letter (A-E) of the correct alternative — duplicated from AlternativeItem
   *  for fast lookup by exporters/answer key. */
  answer?: string;
  tags?: string[];
  source?: string;
  versionGroup?: string;
}

export interface AlternativeAttrs {
  /** Letter A-E (uppercase). */
  letter: string;
  isCorrect: boolean;
  explanation?: string;
}

export function newQuestionId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

export const ALTERNATIVE_LETTERS = ["A", "B", "C", "D", "E"] as const;
