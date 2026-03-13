import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  Divide, Radical, Grid2X2, Superscript, Subscript, Sigma,
  Pi, Infinity, ArrowRight, Delete, CornerDownLeft, Type,
} from "lucide-react";

interface VisualEquationBuilderProps {
  onInsert: (formula: string, display?: boolean) => void;
}

// Cursor placeholder
const CURSOR = "\\boxed{\\phantom{x}}";

function KatexPreview({ formula, display = false, className }: { formula: string; display?: boolean; className?: string }) {
  const refCb = useCallback((el: HTMLSpanElement | null) => {
    if (el) {
      try { katex.render(formula || "\\text{?}", el, { throwOnError: false, displayMode: display }); }
      catch { el.textContent = formula; }
    }
  }, [formula, display]);
  return <span ref={refCb} className={cn("pointer-events-none", className)} style={{ color: "hsl(var(--foreground))" }} />;
}

// Button categories for the visual builder
const quickButtons = [
  {
    label: "Frações e Raízes",
    icon: Divide,
    items: [
      { label: "Fração", insert: "\\frac{▢}{▢}", preview: "\\frac{a}{b}" },
      { label: "Raiz quadrada", insert: "\\sqrt{▢}", preview: "\\sqrt{x}" },
      { label: "Raiz n-ésima", insert: "\\sqrt[▢]{▢}", preview: "\\sqrt[n]{x}" },
      { label: "Sobre", insert: "\\frac{▢}{▢}", preview: "\\frac{a}{b}" },
    ],
  },
  {
    label: "Expoentes e Índices",
    icon: Superscript,
    items: [
      { label: "Expoente", insert: "{▢}^{▢}", preview: "x^{n}" },
      { label: "Índice", insert: "{▢}_{▢}", preview: "x_{n}" },
      { label: "Expoente + Índice", insert: "{▢}_{▢}^{▢}", preview: "x_{n}^{m}" },
    ],
  },
  {
    label: "Somatórios e Integrais",
    icon: Sigma,
    items: [
      { label: "Somatório", insert: "\\sum_{▢}^{▢} ▢", preview: "\\sum_{i=1}^{n}" },
      { label: "Produtório", insert: "\\prod_{▢}^{▢} ▢", preview: "\\prod_{i=1}^{n}" },
      { label: "Integral", insert: "\\int_{▢}^{▢} ▢ \\, d▢", preview: "\\int_{a}^{b} f(x)\\,dx" },
      { label: "Limite", insert: "\\lim_{▢ \\to ▢} ▢", preview: "\\lim_{x \\to \\infty}" },
    ],
  },
  {
    label: "Matrizes",
    icon: Grid2X2,
    items: [
      { label: "Matriz 2×2", insert: "\\begin{pmatrix} ▢ & ▢ \\\\ ▢ & ▢ \\end{pmatrix}", preview: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
      { label: "Matriz 3×3", insert: "\\begin{pmatrix} ▢ & ▢ & ▢ \\\\ ▢ & ▢ & ▢ \\\\ ▢ & ▢ & ▢ \\end{pmatrix}", preview: "\\begin{pmatrix} \\cdot & \\cdot & \\cdot \\\\ \\cdot & \\cdot & \\cdot \\\\ \\cdot & \\cdot & \\cdot \\end{pmatrix}" },
      { label: "Determinante 2×2", insert: "\\begin{vmatrix} ▢ & ▢ \\\\ ▢ & ▢ \\end{vmatrix}", preview: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}" },
      { label: "Sistema", insert: "\\begin{cases} ▢ \\\\ ▢ \\end{cases}", preview: "\\begin{cases} x+y=1 \\\\ x-y=0 \\end{cases}" },
    ],
  },
  {
    label: "Delimitadores",
    icon: Type,
    items: [
      { label: "Parênteses", insert: "\\left( ▢ \\right)", preview: "\\left( x \\right)" },
      { label: "Colchetes", insert: "\\left[ ▢ \\right]", preview: "\\left[ x \\right]" },
      { label: "Chaves", insert: "\\left\\{ ▢ \\right\\}", preview: "\\left\\{ x \\right\\}" },
      { label: "Valor absoluto", insert: "\\left| ▢ \\right|", preview: "\\left| x \\right|" },
      { label: "Binomial", insert: "\\binom{▢}{▢}", preview: "\\binom{n}{k}" },
    ],
  },
];

const symbolPalette = [
  { label: "+", insert: " + " },
  { label: "−", insert: " - " },
  { label: "×", insert: " \\times " },
  { label: "÷", insert: " \\div " },
  { label: "=", insert: " = " },
  { label: "≠", insert: " \\neq " },
  { label: "≤", insert: " \\leq " },
  { label: "≥", insert: " \\geq " },
  { label: "±", insert: " \\pm " },
  { label: "·", insert: " \\cdot " },
  { label: "∞", insert: "\\infty" },
  { label: "π", insert: "\\pi" },
  { label: "α", insert: "\\alpha" },
  { label: "β", insert: "\\beta" },
  { label: "θ", insert: "\\theta" },
  { label: "λ", insert: "\\lambda" },
  { label: "σ", insert: "\\sigma" },
  { label: "Δ", insert: "\\Delta" },
  { label: "→", insert: " \\rightarrow " },
  { label: "⇒", insert: " \\Rightarrow " },
  { label: "∈", insert: " \\in " },
  { label: "⊂", insert: " \\subset " },
  { label: "∪", insert: " \\cup " },
  { label: "∩", insert: " \\cap " },
  { label: "∅", insert: "\\emptyset" },
  { label: "∀", insert: "\\forall" },
  { label: "∃", insert: "\\exists" },
  { label: "∂", insert: "\\partial" },
  { label: "ℝ", insert: "\\mathbb{R}" },
  { label: "ℕ", insert: "\\mathbb{N}" },
];

const trigFunctions = [
  { label: "sen", insert: "\\sin" },
  { label: "cos", insert: "\\cos" },
  { label: "tan", insert: "\\tan" },
  { label: "log", insert: "\\log" },
  { label: "ln", insert: "\\ln" },
];

export function VisualEquationBuilder({ onInsert }: VisualEquationBuilderProps) {
  const [formula, setFormula] = useState("");
  const [displayMode, setDisplayMode] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Insert text at cursor position in the textarea
  const insertAtCursor = useCallback((text: string) => {
    const el = inputRef.current;
    if (!el) {
      setFormula(prev => prev + text);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = formula.slice(0, start);
    const after = formula.slice(end);
    const newFormula = before + text + after;
    setFormula(newFormula);

    // Position cursor at first ▢ or end of inserted text
    const placeholderIdx = text.indexOf("▢");
    requestAnimationFrame(() => {
      el.focus();
      if (placeholderIdx >= 0) {
        const pos = start + placeholderIdx;
        el.setSelectionRange(pos, pos + 1); // Select the ▢
      } else {
        const pos = start + text.length;
        el.setSelectionRange(pos, pos);
      }
    });
  }, [formula]);

  const handleInsert = () => {
    const clean = formula.replace(/▢/g, " ").trim();
    if (clean) onInsert(clean, displayMode);
  };

  const handleClear = () => {
    setFormula("");
    inputRef.current?.focus();
  };

  // Get preview formula (replace ▢ with placeholders)
  const previewFormula = formula.replace(/▢/g, "\\square") || "\\text{monte sua equação}";

  return (
    <div className="flex flex-col h-full">
      {/* Live preview */}
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-center min-h-[56px] overflow-auto">
        <KatexPreview formula={previewFormula} display={displayMode} className="text-lg" />
      </div>

      {/* Structure buttons */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Quick structure categories */}
          {quickButtons.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.label}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {cat.items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => insertAtCursor(item.insert)}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 p-2 transition-all min-h-[48px] group"
                      title={item.label}
                    >
                      <KatexPreview formula={item.preview} display={false} className="text-xs group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] text-muted-foreground leading-none text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Trig/log functions */}
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Funções</span>
            <div className="flex flex-wrap gap-1">
              {trigFunctions.map((fn) => (
                <button
                  key={fn.label}
                  onClick={() => insertAtCursor(fn.insert + "(▢)")}
                  className="px-2.5 py-1.5 text-xs rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-all font-mono"
                >
                  {fn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol palette */}
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Símbolos</span>
            <div className="grid grid-cols-10 gap-1">
              {symbolPalette.map((sym) => (
                <button
                  key={sym.label}
                  onClick={() => insertAtCursor(sym.insert)}
                  className="flex items-center justify-center h-7 w-full rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-foreground hover:scale-110"
                  title={sym.insert}
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Formula editor & controls */}
      <div className="px-4 py-2.5 border-t border-border bg-card/50 space-y-2">
        <div className="flex items-center gap-1.5">
          <textarea
            ref={inputRef}
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleInsert(); } }}
            rows={2}
            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground font-mono outline-none focus:ring-1 focus:ring-primary resize-none"
            placeholder="A fórmula aparece aqui conforme você clica nos botões..."
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={displayMode} onChange={e => setDisplayMode(e.target.checked)} className="rounded border-input h-3 w-3" />
              Modo bloco
            </label>
            <button onClick={handleClear} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
              <Delete className="h-3 w-3" /> Limpar
            </button>
          </div>
          <button
            onClick={handleInsert}
            disabled={!formula.replace(/▢/g, "").trim()}
            className="px-4 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-40 flex items-center gap-1.5"
          >
            <CornerDownLeft className="h-3 w-3" />
            Inserir no documento
          </button>
        </div>
      </div>
    </div>
  );
}
