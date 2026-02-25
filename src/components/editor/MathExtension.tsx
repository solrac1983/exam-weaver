import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useEffect, useRef, useState, useCallback } from "react";

function KatexRender({ formula, display = false, style }: { formula: string; display?: boolean; style?: React.CSSProperties }) {
  const ref = useCallback((el: HTMLSpanElement | null) => {
    if (el) {
      try {
        katex.render(formula || "\\text{?}", el, { throwOnError: false, displayMode: display });
      } catch {
        el.textContent = formula;
      }
    }
  }, [formula, display]);
  return <span ref={ref} style={{ color: "hsl(var(--foreground))", ...style }} />;
}

function KatexNodeView({ node, updateAttributes, selected }: any) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [formula, setFormula] = useState(node.attrs.formula || "");
  const [displayMode, setDisplayMode] = useState(node.attrs.display || false);

  useEffect(() => {
    if (containerRef.current && !editing) {
      try {
        katex.render(node.attrs.formula || "\\text{fórmula}", containerRef.current, {
          throwOnError: false,
          displayMode: node.attrs.display,
        });
      } catch {
        if (containerRef.current) containerRef.current.textContent = node.attrs.formula || "fórmula";
      }
    }
  }, [node.attrs.formula, node.attrs.display, editing]);

  useEffect(() => {
    if (!editing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as HTMLElement)) {
        handleSave();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editing, formula, displayMode]);

  const handleSave = () => {
    updateAttributes({ formula, display: displayMode });
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setFormula(node.attrs.formula); setDisplayMode(node.attrs.display); setEditing(false); }
  };

  const openEdit = () => {
    setFormula(node.attrs.formula || "");
    setDisplayMode(node.attrs.display || false);
    setEditing(true);
  };

  return (
    <NodeViewWrapper as="span" className="inline relative">
      <span
        ref={containerRef}
        onDoubleClick={openEdit}
        className={`cursor-pointer rounded px-1 py-0.5 transition-all hover:bg-primary/10 hover:ring-1 hover:ring-primary/20 ${
          selected ? "ring-2 ring-primary/30 bg-primary/5" : ""
        } ${editing ? "ring-2 ring-primary bg-primary/5" : ""}`}
        title="Duplo clique para editar"
        style={{ color: "hsl(var(--foreground))" }}
      />

      {editing && (
        <div
          ref={popoverRef}
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[200] w-[420px] bg-popover border border-border rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 p-0"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {/* Live Preview */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 rounded-t-xl flex items-center justify-center min-h-[60px] overflow-auto">
            <KatexRender formula={formula || "\\text{digite a fórmula}"} display={displayMode} />
          </div>

          {/* LaTeX Input */}
          <div className="px-4 py-3 space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">LaTeX</label>
            <textarea
              autoFocus
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="w-full bg-background text-sm font-mono text-foreground outline-none border border-input rounded-md px-3 py-2 focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              placeholder="Ex: \frac{a}{b} ou x^2 + y^2 = z^2"
            />

            {/* Options */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={displayMode}
                  onChange={(e) => setDisplayMode(e.target.checked)}
                  className="rounded border-input"
                />
                Modo destaque (bloco)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setFormula(node.attrs.formula); setDisplayMode(node.attrs.display); setEditing(false); }}
                  className="px-2.5 py-1 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
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
