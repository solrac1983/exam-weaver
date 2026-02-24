import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import katex from "katex";

interface EquationPanelProps {
  onInsert: (formula: string, display?: boolean) => void;
  onClose: () => void;
}

// ─── Equation Templates ───
const equationTemplates = [
  { label: "Área de Círculo", formula: "A = \\pi r^2" },
  { label: "Binômio de Newton", formula: "(x + a)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^k a^{n-k}" },
  { label: "Expansão de Taylor", formula: "e^x = 1 + \\frac{x}{1!} + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots" },
  { label: "Expansão de uma Soma", formula: "(1 + x)^n = 1 + \\frac{nx}{1!} + \\frac{n(n-1)x^2}{2!} + \\cdots" },
  { label: "Fórmula Quadrática", formula: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
  { label: "Identidade Trigonométrica", formula: "\\sin\\alpha \\pm \\sin\\beta = 2\\sin\\frac{1}{2}(\\alpha \\pm \\beta)\\cos\\frac{1}{2}(\\alpha \\mp \\beta)" },
  { label: "Teorema de Pitágoras", formula: "a^2 + b^2 = c^2" },
  { label: "Integral Definida", formula: "\\int_a^b f(x)\\,dx = F(b) - F(a)" },
  { label: "Derivada", formula: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}" },
  { label: "Série Geométrica", formula: "\\sum_{n=0}^{\\infty} ar^n = \\frac{a}{1-r}, \\quad |r| < 1" },
  { label: "Logaritmo", formula: "\\log_b(xy) = \\log_b x + \\log_b y" },
  { label: "Euler", formula: "e^{i\\pi} + 1 = 0" },
  { label: "Lei dos Cossenos", formula: "c^2 = a^2 + b^2 - 2ab\\cos C" },
  { label: "Equação da Reta", formula: "y = mx + b" },
  { label: "Equação do Círculo", formula: "(x - h)^2 + (y - k)^2 = r^2" },
];

// ─── Structures ───
const structures = [
  { label: "Fração", formula: "\\frac{a}{b}", icon: "x/y" },
  { label: "Sobrescrito", formula: "x^{n}", icon: "xⁿ" },
  { label: "Subscrito", formula: "x_{n}", icon: "xₙ" },
  { label: "Radical", formula: "\\sqrt{x}", icon: "√x" },
  { label: "Radical n-ésimo", formula: "\\sqrt[n]{x}", icon: "ⁿ√x" },
  { label: "Integral", formula: "\\int_{a}^{b}", icon: "∫" },
  { label: "Integral Dupla", formula: "\\iint", icon: "∬" },
  { label: "Somatório", formula: "\\sum_{i=1}^{n}", icon: "Σ" },
  { label: "Produtório", formula: "\\prod_{i=1}^{n}", icon: "∏" },
  { label: "Limite", formula: "\\lim_{x \\to \\infty}", icon: "lim" },
  { label: "Operador Grande", formula: "\\bigcup_{i=1}^{n}", icon: "⋃" },
  { label: "Chaves", formula: "\\left\\{ x \\right\\}", icon: "{ }" },
  { label: "Parênteses", formula: "\\left( x \\right)", icon: "( )" },
  { label: "Colchetes", formula: "\\left[ x \\right]", icon: "[ ]" },
  { label: "Função", formula: "f(x) = ", icon: "f(x)" },
  { label: "Ênfase", formula: "\\hat{a}", icon: "â" },
  { label: "Vetor", formula: "\\vec{v}", icon: "v⃗" },
  { label: "Barra", formula: "\\bar{x}", icon: "x̄" },
  { label: "Matriz 2×2", formula: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", icon: "[ ]" },
  { label: "Matriz 3×3", formula: "\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}", icon: "▦" },
  { label: "Sistema", formula: "\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}", icon: "{" },
  { label: "sen θ", formula: "\\sin\\theta", icon: "sinθ" },
  { label: "cos θ", formula: "\\cos\\theta", icon: "cosθ" },
  { label: "log", formula: "\\log_{b} x", icon: "logₓ" },
  { label: "Triângulo", formula: "\\triangle ABC", icon: "△" },
];

// ─── Symbols ───
const symbolGroups = [
  {
    label: "Operadores",
    symbols: [
      { display: "±", formula: "\\pm" },
      { display: "∓", formula: "\\mp" },
      { display: "×", formula: "\\times" },
      { display: "÷", formula: "\\div" },
      { display: "·", formula: "\\cdot" },
      { display: "∘", formula: "\\circ" },
      { display: "⊕", formula: "\\oplus" },
      { display: "⊗", formula: "\\otimes" },
    ],
  },
  {
    label: "Relações",
    symbols: [
      { display: "=", formula: "=" },
      { display: "≠", formula: "\\neq" },
      { display: "≈", formula: "\\approx" },
      { display: "≡", formula: "\\equiv" },
      { display: "<", formula: "<" },
      { display: ">", formula: ">" },
      { display: "≤", formula: "\\leq" },
      { display: "≥", formula: "\\geq" },
      { display: "≪", formula: "\\ll" },
      { display: "≫", formula: "\\gg" },
      { display: "∝", formula: "\\propto" },
      { display: "∼", formula: "\\sim" },
    ],
  },
  {
    label: "Setas",
    symbols: [
      { display: "→", formula: "\\rightarrow" },
      { display: "←", formula: "\\leftarrow" },
      { display: "↔", formula: "\\leftrightarrow" },
      { display: "⇒", formula: "\\Rightarrow" },
      { display: "⇐", formula: "\\Leftarrow" },
      { display: "⇔", formula: "\\Leftrightarrow" },
      { display: "↑", formula: "\\uparrow" },
      { display: "↓", formula: "\\downarrow" },
    ],
  },
  {
    label: "Gregos",
    symbols: [
      { display: "α", formula: "\\alpha" },
      { display: "β", formula: "\\beta" },
      { display: "γ", formula: "\\gamma" },
      { display: "δ", formula: "\\delta" },
      { display: "ε", formula: "\\epsilon" },
      { display: "θ", formula: "\\theta" },
      { display: "λ", formula: "\\lambda" },
      { display: "μ", formula: "\\mu" },
      { display: "π", formula: "\\pi" },
      { display: "σ", formula: "\\sigma" },
      { display: "φ", formula: "\\varphi" },
      { display: "ω", formula: "\\omega" },
      { display: "Γ", formula: "\\Gamma" },
      { display: "Δ", formula: "\\Delta" },
      { display: "Σ", formula: "\\Sigma" },
      { display: "Ω", formula: "\\Omega" },
    ],
  },
  {
    label: "Conjuntos",
    symbols: [
      { display: "∈", formula: "\\in" },
      { display: "∉", formula: "\\notin" },
      { display: "⊂", formula: "\\subset" },
      { display: "⊃", formula: "\\supset" },
      { display: "⊆", formula: "\\subseteq" },
      { display: "⊇", formula: "\\supseteq" },
      { display: "∪", formula: "\\cup" },
      { display: "∩", formula: "\\cap" },
      { display: "∅", formula: "\\emptyset" },
      { display: "∀", formula: "\\forall" },
      { display: "∃", formula: "\\exists" },
      { display: "∄", formula: "\\nexists" },
    ],
  },
  {
    label: "Diversos",
    symbols: [
      { display: "∞", formula: "\\infty" },
      { display: "∂", formula: "\\partial" },
      { display: "∇", formula: "\\nabla" },
      { display: "ℕ", formula: "\\mathbb{N}" },
      { display: "ℤ", formula: "\\mathbb{Z}" },
      { display: "ℝ", formula: "\\mathbb{R}" },
      { display: "ℂ", formula: "\\mathbb{C}" },
      { display: "°", formula: "^\\circ" },
      { display: "%", formula: "\\%" },
      { display: "‰", formula: "\\permil" },
      { display: "†", formula: "\\dagger" },
      { display: "…", formula: "\\ldots" },
    ],
  },
];

function KatexPreview({ formula, display = true }: { formula: string; display?: boolean }) {
  const ref = useState<HTMLSpanElement | null>(null);

  return (
    <span
      ref={(el) => {
        if (el) {
          try {
            katex.render(formula, el, { throwOnError: false, displayMode: display });
          } catch {
            el.textContent = formula;
          }
        }
      }}
      className="pointer-events-none"
    />
  );
}

export function EquationPanel({ onInsert, onClose }: EquationPanelProps) {
  const [customFormula, setCustomFormula] = useState("");
  const [activeTab, setActiveTab] = useState("templates");

  const handleCustomInsert = () => {
    if (customFormula.trim()) {
      onInsert(customFormula, true);
      setCustomFormula("");
    }
  };

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-[600px] bg-popover border border-border rounded-lg shadow-xl animate-in fade-in-0 zoom-in-95">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg font-serif italic text-foreground">π</span>
          <span className="text-sm font-semibold text-foreground">Equações</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm px-2 py-0.5 rounded hover:bg-muted transition-colors">✕</button>
      </div>

      {/* Custom input */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">LaTeX:</span>
        <input
          value={customFormula}
          onChange={(e) => setCustomFormula(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCustomInsert(); }}
          placeholder="Ex: \frac{a}{b} ou x^2 + y^2"
          className="flex-1 px-2 py-1 text-xs rounded border border-input bg-background text-foreground font-mono outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleCustomInsert}
          className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Inserir
        </button>
        {customFormula && (
          <div className="px-2 py-1 rounded bg-muted min-w-[80px] flex items-center justify-center">
            <KatexPreview formula={customFormula} display={false} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
          <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 py-2">
            Equações Prontas
          </TabsTrigger>
          <TabsTrigger value="structures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 py-2">
            Estruturas
          </TabsTrigger>
          <TabsTrigger value="symbols" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 py-2">
            Símbolos
          </TabsTrigger>
        </TabsList>

        {/* Templates */}
        <TabsContent value="templates" className="mt-0">
          <ScrollArea className="h-[350px]">
            <div className="p-3 space-y-2">
              {equationTemplates.map((eq, i) => (
                <button
                  key={i}
                  onClick={() => onInsert(eq.formula, true)}
                  className="w-full text-left rounded-md border border-border hover:border-primary/40 hover:bg-muted/50 p-3 transition-all group"
                >
                  <span className="text-[11px] text-muted-foreground font-medium block mb-1.5">{eq.label}</span>
                  <div className="flex items-center justify-center py-1 overflow-x-auto">
                    <KatexPreview formula={eq.formula} />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Structures */}
        <TabsContent value="structures" className="mt-0">
          <ScrollArea className="h-[350px]">
            <div className="p-3 grid grid-cols-5 gap-1.5">
              {structures.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onInsert(s.formula)}
                  className="flex flex-col items-center justify-center gap-1 rounded-md border border-border hover:border-primary/40 hover:bg-muted/50 p-2 transition-all min-h-[56px]"
                  title={s.label}
                >
                  <span className="text-base font-serif text-foreground">{s.icon}</span>
                  <span className="text-[9px] text-muted-foreground leading-none text-center">{s.label}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Symbols */}
        <TabsContent value="symbols" className="mt-0">
          <ScrollArea className="h-[350px]">
            <div className="p-3 space-y-3">
              {symbolGroups.map((group) => (
                <div key={group.label}>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">{group.label}</span>
                  <div className="grid grid-cols-8 gap-1">
                    {group.symbols.map((sym, i) => (
                      <button
                        key={i}
                        onClick={() => onInsert(sym.formula)}
                        className="flex items-center justify-center h-8 w-full rounded border border-border hover:border-primary/40 hover:bg-muted/50 transition-all text-base text-foreground"
                        title={sym.formula}
                      >
                        {sym.display}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
