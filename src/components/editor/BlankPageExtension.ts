import { Node, mergeAttributes } from "@tiptap/react";

/**
 * BlankPage node — renders as a non-editable div with exact A4 page height.
 * Used to insert a blank page in the editor that matches 297mm - top padding.
 */
export const BlankPage = Node.create({
  name: "blankPage",
  group: "block",
  atom: true, // non-editable, treated as a single unit

  parseHTML() {
    return [{ tag: 'div[data-blank-page]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-blank-page": "true",
        class: "blank-page-spacer",
      }),
    ];
  },
});
