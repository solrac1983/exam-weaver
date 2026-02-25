import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useEffect, useRef, useState } from "react";

// KaTeX Node View Component
function KatexNodeView({ node, updateAttributes, selected }: any) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [editing, setEditing] = useState(false);
  const [formula, setFormula] = useState(node.attrs.formula || "");

  useEffect(() => {
    if (containerRef.current && !editing) {
      try {
        katex.render(node.attrs.formula || "\\text{fórmula}", containerRef.current, {
          throwOnError: false,
          displayMode: node.attrs.display,
        });
      } catch {
        if (containerRef.current) {
          containerRef.current.textContent = node.attrs.formula || "fórmula";
        }
      }
    }
  }, [node.attrs.formula, node.attrs.display, editing]);

  const handleSave = () => {
    updateAttributes({ formula });
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setFormula(node.attrs.formula);
      setEditing(false);
    }
  };

  return (
    <NodeViewWrapper as="span" className="inline">
      {editing ? (
        <span className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/5 px-2 py-0.5">
          <input
            autoFocus
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="bg-transparent text-sm font-mono text-foreground outline-none min-w-[120px]"
            placeholder="x^2 + y^2 = z^2"
          />
          <span className="text-[10px] text-muted-foreground">Enter ✓</span>
        </span>
      ) : (
        <span
          ref={containerRef}
          onClick={() => setEditing(true)}
          className={`cursor-pointer rounded px-0.5 transition-colors hover:bg-primary/10 ${
            selected ? "ring-2 ring-primary/30 bg-primary/5" : ""
          }`}
          title="Clique para editar fórmula"
        />
      )}
    </NodeViewWrapper>
  );
}

// TipTap Extension
export const Mathematics = Node.create({
  name: "mathematics",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      formula: { default: "" },
      display: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "math" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(KatexNodeView);
  },

  addCommands() {
    return {
      insertFormula:
        (attrs: { formula?: string; display?: boolean } = {}) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { formula: attrs.formula || "", display: attrs.display || false },
          });
        },
    } as any;
  },
});
