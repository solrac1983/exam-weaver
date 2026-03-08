import { Node, mergeAttributes } from "@tiptap/react";

/**
 * BlankPage node – renders a non-editable spacer that is exactly one A4 page tall.
 * Height is enforced purely via CSS (.blank-page-spacer in index.css).
 */
export const BlankPage = Node.create({
  name: "blankPage",
  group: "block",
  atom: true, // non-editable, treated as a single unit
  draggable: false,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-blank-page]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-blank-page": "",
        class: "blank-page-spacer",
        contenteditable: "false",
      }),
    ];
  },
});
