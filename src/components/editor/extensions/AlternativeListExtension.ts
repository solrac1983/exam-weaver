/**
 * AlternativeList & AlternativeItem — multiple-choice options inside a
 * questionBlock. Each item carries `letter` (A-E) and `isCorrect` flag,
 * which is what the AnswerKey/Validator services read.
 */
import { Node, mergeAttributes } from "@tiptap/core";

const LETTERS = ["A", "B", "C", "D", "E"];

export const AlternativeList = Node.create({
  name: "alternativeList",
  group: "block",
  content: "alternativeItem+",
  parseHTML() {
    return [{ tag: "div[data-alternative-list]" }];
  },
  renderHTML() {
    return ["div", { "data-alternative-list": "", class: "exam-alternative-list" }, 0];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    alternativeItem: {
      toggleAlternativeCorrect: () => ReturnType;
      addAlternativeAfter: () => ReturnType;
    };
  }
}

export const AlternativeItem = Node.create({
  name: "alternativeItem",
  content: "inline*",
  defining: true,
  addAttributes() {
    return {
      letter: {
        default: "A",
        parseHTML: (e) => e.getAttribute("data-letter") || "A",
        renderHTML: (a) => ({ "data-letter": a.letter }),
      },
      isCorrect: {
        default: false,
        parseHTML: (e) => e.getAttribute("data-correct") === "true",
        renderHTML: (a) => ({ "data-correct": a.isCorrect ? "true" : "false" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-alternative-item]" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-alternative-item": "",
        class: `exam-alternative-item${node.attrs.isCorrect ? " is-correct" : ""}`,
        "data-prefix": `${node.attrs.letter})`,
      }),
      0,
    ];
  },
  addCommands() {
    return {
      toggleAlternativeCorrect:
        () =>
        ({ state, dispatch }) => {
          const { selection, tr } = state;
          const { $from } = selection;
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "alternativeItem") {
              const pos = $from.before(d);
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, isCorrect: !node.attrs.isCorrect });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
      addAlternativeAfter:
        () =>
        ({ state, dispatch, view }) => {
          const { selection } = state;
          const { $from } = selection;
          for (let d = $from.depth; d > 0; d--) {
            const parent = $from.node(d);
            if (parent.type.name === "alternativeList") {
              const used = new Set<string>();
              parent.forEach((c) => used.add(c.attrs.letter));
              const nextLetter = LETTERS.find((l) => !used.has(l)) || `${LETTERS.length + 1}`;
              const itemType = state.schema.nodes.alternativeItem;
              const newNode = itemType.create({ letter: nextLetter, isCorrect: false });
              const insertPos = $from.after(d) - 1;
              if (dispatch) {
                const tr = state.tr.insert(insertPos, newNode);
                dispatch(tr);
                view?.focus();
              }
              return true;
            }
          }
          return false;
        },
    };
  },
});
