/**
 * QuestionBlockExtension — structured exam question node.
 *
 * Schema:
 *   questionBlock {
 *     questionStem    // 1 paragraph-like block containing the wording
 *     alternativeList? // optional list of alternativeItem
 *   }
 *
 * The block carries metadata in `attrs` (id, subject, difficulty, points,
 * tags, answer, versionGroup). The visual number is recomputed reactively
 * via an `appendTransaction` plugin so insertion/removal/reorder always
 * leaves a contiguous 1..N sequence.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { newQuestionId, type QuestionAttrs } from "@/editor-core/education/QuestionModel";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    questionBlock: {
      insertQuestionBlock: (attrs?: Partial<QuestionAttrs>) => ReturnType;
    };
  }
}

const renumberKey = new PluginKey("questionBlockRenumber");

export const QuestionBlock = Node.create({
  name: "questionBlock",
  group: "block",
  content: "questionStem alternativeList?",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      id: { default: "", parseHTML: (e) => e.getAttribute("data-q-id") || "", renderHTML: (a) => ({ "data-q-id": a.id }) },
      number: { default: 1, parseHTML: (e) => Number(e.getAttribute("data-q-number")) || 1, renderHTML: (a) => ({ "data-q-number": a.number }) },
      subject: { default: "", parseHTML: (e) => e.getAttribute("data-q-subject") || "", renderHTML: (a) => ({ "data-q-subject": a.subject }) },
      topic: { default: "", parseHTML: (e) => e.getAttribute("data-q-topic") || "", renderHTML: (a) => ({ "data-q-topic": a.topic }) },
      difficulty: { default: "media", parseHTML: (e) => e.getAttribute("data-q-difficulty") || "media", renderHTML: (a) => ({ "data-q-difficulty": a.difficulty }) },
      points: { default: 1, parseHTML: (e) => Number(e.getAttribute("data-q-points")) || 1, renderHTML: (a) => ({ "data-q-points": a.points }) },
      answer: { default: "", parseHTML: (e) => e.getAttribute("data-q-answer") || "", renderHTML: (a) => ({ "data-q-answer": a.answer }) },
      tags: {
        default: [] as string[],
        parseHTML: (e) => {
          const raw = e.getAttribute("data-q-tags");
          return raw ? raw.split("|").filter(Boolean) : [];
        },
        renderHTML: (a) => ({ "data-q-tags": (a.tags || []).join("|") }),
      },
      versionGroup: { default: "", parseHTML: (e) => e.getAttribute("data-q-vg") || "", renderHTML: (a) => ({ "data-q-vg": a.versionGroup }) },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-question-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-question-block": "", class: "exam-question-block" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertQuestionBlock:
        (attrs = {}) =>
        ({ chain, state }) => {
          // Find the next available number
          let highest = 0;
          state.doc.descendants((n) => {
            if (n.type.name === "questionBlock") {
              highest = Math.max(highest, Number(n.attrs.number) || 0);
            }
          });
          const id = attrs.id || newQuestionId();
          return chain()
            .focus()
            .insertContent({
              type: "questionBlock",
              attrs: {
                id,
                number: attrs.number ?? highest + 1,
                subject: attrs.subject ?? "",
                topic: attrs.topic ?? "",
                difficulty: attrs.difficulty ?? "media",
                points: attrs.points ?? 1,
                answer: attrs.answer ?? "",
                tags: attrs.tags ?? [],
                versionGroup: attrs.versionGroup ?? "",
              },
              content: [
                { type: "questionStem", content: [{ type: "text", text: "Enunciado da questão…" }] },
                {
                  type: "alternativeList",
                  content: ["A", "B", "C", "D"].map((letter, i) => ({
                    type: "alternativeItem",
                    attrs: { letter, isCorrect: i === 0 },
                    content: [{ type: "text", text: `Alternativa ${letter}` }],
                  })),
                },
              ],
            })
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: renumberKey,
        appendTransaction: (transactions, _old, newState) => {
          if (!transactions.some((t) => t.docChanged)) return null;
          const updates: { pos: number; number: number; id: string }[] = [];
          let n = 0;
          newState.doc.descendants((node, pos) => {
            if (node.type.name !== "questionBlock") return;
            n += 1;
            const id = node.attrs.id || newQuestionId();
            if (node.attrs.number !== n || !node.attrs.id) {
              updates.push({ pos, number: n, id });
            }
            return false;
          });
          if (updates.length === 0) return null;
          const tr = newState.tr;
          for (const u of updates) {
            const node = tr.doc.nodeAt(u.pos);
            if (!node) continue;
            tr.setNodeMarkup(u.pos, undefined, { ...node.attrs, number: u.number, id: u.id });
          }
          tr.setMeta("addToHistory", false);
          return tr;
        },
      }),
    ];
  },
});
