/**
 * QuestionStem — paragraph-like block holding the question wording.
 * Lives only inside `questionBlock` so the editor can style it with a
 * left gutter showing the question number.
 */
import { Node } from "@tiptap/core";

export const QuestionStem = Node.create({
  name: "questionStem",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-question-stem]" }];
  },
  renderHTML() {
    return ["div", { "data-question-stem": "", class: "exam-question-stem" }, 0];
  },
});
