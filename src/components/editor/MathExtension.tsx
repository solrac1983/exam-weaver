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
        <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-primary/40 bg-primary/5 px-3 py-1.5 shadow-sm">
          <span className="text-xs text-primary font-semibold">f(x)</span>
          <input
            autoFocus
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="bg-transparent text-sm font-mono text-foreground outline-none min-w-[180px] border-b border-primary/20 focus:border-primary pb-0.5"
            placeholder="x^2 + y^2 = z^2"
          />
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Enter ✓</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Esc ✗</span>
        </span>
      ) : (
        <span
          ref={containerRef}
          onDoubleClick={() => setEditing(true)}
          className={`cursor-pointer rounded px-1 py-0.5 transition-all hover:bg-primary/10 hover:ring-1 hover:ring-primary/20 ${
            selected ? "ring-2 ring-primary/30 bg-primary/5" : ""
          }`}
          title="Duplo clique para editar fórmula"
          style={{ color: "hsl(var(--foreground))" }}
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
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "math" })];
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
