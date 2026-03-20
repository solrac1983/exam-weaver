import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const autoNumberingKey = new PluginKey("autoNumbering");

interface QuestionMatch {
  textFrom: number;
  textTo: number;
  currentNum: number;
}

/**
 * TipTap extension that automatically renumbers questions (e.g. 1), 2), 3)...)
 * whenever the document changes. Detects bold-numbered paragraphs and fixes
 * the sequence on insert, delete, or move.
 */
export const AutoNumbering = Extension.create({
  name: "autoNumbering",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: autoNumberingKey,
        appendTransaction(transactions, _oldState, newState) {
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          const questions: QuestionMatch[] = [];

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== "paragraph") return;
            if (node.childCount === 0) return;

            const firstChild = node.firstChild;
            if (!firstChild || !firstChild.isText || !firstChild.text) return;

            const hasBold = firstChild.marks.some(
              (m) => m.type.name === "bold"
            );
            if (!hasBold) return;

            // Match "Questão N)" or "N)" patterns
            const match = firstChild.text.match(/^(?:Questão\s+)?(\d+)\)/);
            if (!match) return;

            questions.push({
              textFrom: pos + 1,
              textTo: pos + 1 + match[0].length,
              currentNum: parseInt(match[1], 10),
            });
          });

          if (questions.length === 0) return null;

          // Check if any number is out of sequence
          let needsUpdate = false;
          for (let i = 0; i < questions.length; i++) {
            if (questions[i].currentNum !== i + 1) {
              needsUpdate = true;
              break;
            }
          }

          if (!needsUpdate) return null;

          // Build fix transaction — process in reverse to avoid position shifts
          const tr = newState.tr;

          for (let i = questions.length - 1; i >= 0; i--) {
            const q = questions[i];
            const expectedNum = i + 1;
            if (q.currentNum === expectedNum) continue;

            const textNode = newState.doc.nodeAt(q.textFrom);
            const marks = textNode?.marks || [];
            const newText = `Questão ${expectedNum})`;

            tr.replaceWith(
              q.textFrom,
              q.textTo,
              newState.schema.text(newText, marks)
            );
          }

          // Prevent this transaction from being recorded as a separate undo step
          tr.setMeta("addToHistory", false);

          return tr;
        },
      }),
    ];
  },
});
