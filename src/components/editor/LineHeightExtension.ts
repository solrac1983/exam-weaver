import { Extension } from "@tiptap/react";

/**
 * TipTap extension for paragraph line-height.
 */
export const LineHeight = Extension.create({
  name: "lineHeight",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (height: string) =>
        ({ commands }: any) => {
          return (
            commands.updateAttributes("paragraph", { lineHeight: height }) &&
            commands.updateAttributes("heading", { lineHeight: height })
          );
        },
      unsetLineHeight:
        () =>
        ({ commands }: any) => {
          return (
            commands.resetAttributes("paragraph", "lineHeight") &&
            commands.resetAttributes("heading", "lineHeight")
          );
        },
    } as any;
  },
});
