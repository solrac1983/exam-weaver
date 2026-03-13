import { useState, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, Clock, Star, ChevronDown } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { VisualEquationBuilder } from "./VisualEquationBuilder";

interface EquationPanelProps {
  onInsert: (formula: string, display?: boolean) => void;
  onClose: () => void;
}

// ─── Equation Templates by Category ───
const templateCategories = [
  {
    label: "Álgebra",
    templates: [
      { label: "Fórmula Quadrática", formula: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
      { label: "Equação da Reta", formula: "y = mx + b" },
      { label: "Binômio de Newton", formula: "(x + a)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^k a^{n-k}" },
      { label: "Logaritmo (produto)", formula: "\\log_b(xy) = \\log_b x + \\log_b y" },
      { label: "Logaritmo (potência)", formula: "\\log_b(x^n) = n \\cdot \\log_b x" },
      { label: "Mudança de base", formula: "\\log_b a = \\frac{\\log_c a}{\\log_c b}" },
      { label: "PA (termo geral)", formula: "a_n = a_1 + (n-1) \\cdot r" },
      { label: "PG (termo geral)", formula: "a_n = a_1 \\cdot q^{n-1}" },
      { label: "PA (soma)", formula: "S_n = \\frac{(a_1 + a_n) \\cdot n}{2}" },
      { label: "PG (soma finita)", formula: "S_n = \\frac{a_1(q^n - 1)}{q - 1}" },
      { label: "Série Geométrica", formula: "\\sum_{n=0}^{\\infty} ar^n = \\frac{a}{1-r}, \\; |r| < 1" },
      { label: "Fatorial", formula: "n! = n \\cdot (n-1) \\cdot (n-2) \\cdots 1" },
      { label: "Combinação", formula: "\\binom{n}{k} = \\frac{n!}{k!(n-k)!}" },
      { label: "Arranjo", formula: "A_{n,k} = \\frac{n!}{(n-k)!}" },
    ],
  },
  {
    label: "Geometria",
    templates: [
      { label: "Teorema de Pitágoras", formula: "a^2 + b^2 = c^2" },
      { label: "Área do Círculo", formula: "A = \\pi r^2" },
      { label: "Circunferência", formula: "C = 2\\pi r" },
      { label: "Equação do Círculo", formula: "(x - h)^2 + (y - k)^2 = r^2" },
      { label: "Lei dos Cossenos", formula: "c^2 = a^2 + b^2 - 2ab\\cos C" },
      { label: "Lei dos Senos", formula: "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}" },
      { label: "Área do Triângulo", formula: "A = \\frac{b \\cdot h}{2}" },
      { label: "Área (Heron)", formula: "A = \\sqrt{s(s-a)(s-b)(s-c)}" },
      { label: "Volume da Esfera", formula: "V = \\frac{4}{3}\\pi r^3" },
      { label: "Volume do Cilindro", formula: "V = \\pi r^2 h" },
      { label: "Volume do Cone", formula: "V = \\frac{1}{3}\\pi r^2 h" },
      { label: "Distância entre pontos", formula: "d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}" },
    ],
  },
  {
    label: "Trigonometria",
    templates: [
      { label: "Identidade fundamental", formula: "\\sin^2\\theta + \\cos^2\\theta = 1" },
      { label: "Soma de ângulos (sen)", formula: "\\sin(\\alpha + \\beta) = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta" },
      { label: "Soma de ângulos (cos)", formula: "\\cos(\\alpha + \\beta) = \\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta" },
      { label: "Arco duplo (sen)", formula: "\\sin(2\\theta) = 2\\sin\\theta\\cos\\theta" },
      { label: "Arco duplo (cos)", formula: "\\cos(2\\theta) = \\cos^2\\theta - \\sin^2\\theta" },
      { label: "Tangente", formula: "\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}" },
      { label: "Secante", formula: "\\sec\\theta = \\frac{1}{\\cos\\theta}" },
      { label: "Cossecante", formula: "\\csc\\theta = \\frac{1}{\\sin\\theta}" },
    ],
  },
  {
    label: "Cálculo",
    templates: [
      { label: "Derivada (definição)", formula: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}" },
      { label: "Integral definida", formula: "\\int_a^b f(x)\\,dx = F(b) - F(a)" },
      { label: "Integral indefinida", formula: "\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C" },
      { label: "Regra da cadeia", formula: "\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)" },
      { label: "Regra do produto", formula: "(fg)' = f'g + fg'" },
      { label: "Regra do quociente", formula: "\\left(\\frac{f}{g}\\right)' = \\frac{f'g - fg'}{g^2}" },
      { label: "Série de Taylor", formula: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n" },
      { label: "Limite notável", formula: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1" },
      { label: "Euler (exponencial)", formula: "e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}" },
    ],
  },
  {
    label: "Física",
    templates: [
      { label: "2ª Lei de Newton", formula: "\\vec{F} = m \\cdot \\vec{a}" },
      { label: "Energia cinética", formula: "E_c = \\frac{1}{2}mv^2" },
      { label: "Energia potencial grav.", formula: "E_p = mgh" },
      { label: "Equação de Torricelli", formula: "v^2 = v_0^2 + 2a\\Delta s" },
      { label: "MRU", formula: "s = s_0 + vt" },
      { label: "MRUV", formula: "s = s_0 + v_0 t + \\frac{1}{2}at^2" },
      { label: "Lei da gravitação", formula: "F = G\\frac{m_1 m_2}{r^2}" },
      { label: "Trabalho", formula: "W = F \\cdot d \\cdot \\cos\\theta" },
      { label: "Potência", formula: "P = \\frac{W}{\\Delta t}" },
      { label: "Lei de Ohm", formula: "V = R \\cdot I" },
      { label: "Potência elétrica", formula: "P = V \\cdot I" },
      { label: "Leis de Kepler (3ª)", formula: "\\frac{T^2}{a^3} = k" },
      { label: "Pressão", formula: "p = \\frac{F}{A}" },
      { label: "Empuxo", formula: "E = \\rho_{\\text{fluido}} \\cdot V_{\\text{imerso}} \\cdot g" },
    ],
  },
  {
    label: "Química",
    templates: [
      { label: "Mol", formula: "n = \\frac{m}{M}" },
      { label: "Concentração molar", formula: "C = \\frac{n}{V}" },
      { label: "Equação de Clapeyron", formula: "PV = nRT" },
      { label: "pH", formula: "\\text{pH} = -\\log[H^+]" },
      { label: "pOH", formula: "\\text{pOH} = -\\log[OH^-]" },
      { label: "Relação pH e pOH", formula: "\\text{pH} + \\text{pOH} = 14" },
      { label: "Diluição", formula: "C_1 V_1 = C_2 V_2" },
      { label: "Lei de Hess", formula: "\\Delta H_{\\text{reação}} = \\sum \\Delta H_{\\text{formação (prod)}} - \\sum \\Delta H_{\\text{formação (reag)}}" },
      { label: "Velocidade média", formula: "v_m = \\frac{\\Delta[\\text{produto}]}{\\Delta t}" },
    ],
  },
  {
    label: "Estatística",
    templates: [
      { label: "Média aritmética", formula: "\\bar{x} = \\frac{\\sum_{i=1}^{n} x_i}{n}" },
      { label: "Desvio padrão", formula: "\\sigma = \\sqrt{\\frac{\\sum_{i=1}^{n}(x_i - \\bar{x})^2}{n}}" },
      { label: "Variância", formula: "\\sigma^2 = \\frac{\\sum_{i=1}^{n}(x_i - \\bar{x})^2}{n}" },
      { label: "Mediana (posição)", formula: "Md = \\frac{n+1}{2}" },
      { label: "Probabilidade", formula: "P(A) = \\frac{n(A)}{n(S)}" },
      { label: "Prob. condicional", formula: "P(A|B) = \\frac{P(A \\cap B)}{P(B)}" },
      { label: "Euler (identidade)", formula: "e^{i\\pi} + 1 = 0" },
    ],
  },
];

const allTemplates = templateCategories.flatMap(c => c.templates.map(t => ({ ...t, category: c.label })));

// ─── Structures ───
const structures = [
  { label: "Fração", formula: "\\frac{a}{b}" },
  { label: "Sobrescrito", formula: "x^{n}" },
  { label: "Subscrito", formula: "x_{n}" },
  { label: "Radical", formula: "\\sqrt{x}" },
  { label: "Radical n-ésimo", formula: "\\sqrt[n]{x}" },
  { label: "Integral", formula: "\\int_{a}^{b}" },
  { label: "Integral dupla", formula: "\\iint" },
  { label: "Integral tripla", formula: "\\iiint" },
  { label: "Somatório", formula: "\\sum_{i=1}^{n}" },
  { label: "Produtório", formula: "\\prod_{i=1}^{n}" },
  { label: "Limite", formula: "\\lim_{x \\to \\infty}" },
  { label: "União", formula: "\\bigcup_{i=1}^{n}" },
  { label: "Interseção", formula: "\\bigcap_{i=1}^{n}" },
  { label: "Chaves", formula: "\\left\\{ x \\right\\}" },
  { label: "Parênteses", formula: "\\left( x \\right)" },
  { label: "Colchetes", formula: "\\left[ x \\right]" },
  { label: "Valor absoluto", formula: "\\left| x \\right|" },
  { label: "Função", formula: "f(x) = " },
  { label: "Chapéu", formula: "\\hat{a}" },
  { label: "Vetor", formula: "\\vec{v}" },
  { label: "Barra", formula: "\\bar{x}" },
  { label: "Ponto", formula: "\\dot{x}" },
  { label: "Dois pontos", formula: "\\ddot{x}" },
  { label: "Til", formula: "\\tilde{x}" },
  { label: "Matriz 2×2", formula: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
  { label: "Matriz 3×3", formula: "\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}" },
  { label: "Determinante 2×2", formula: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}" },
  { label: "Sistema", formula: "\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}" },
  { label: "Binomial", formula: "\\binom{n}{k}" },
  { label: "sen θ", formula: "\\sin\\theta" },
  { label: "cos θ", formula: "\\cos\\theta" },
  { label: "tan θ", formula: "\\tan\\theta" },
  { label: "log", formula: "\\log_{b} x" },
  { label: "ln", formula: "\\ln x" },
  { label: "Triângulo", formula: "\\triangle ABC" },
  { label: "Ângulo", formula: "\\angle ABC" },
];

// ─── Symbols ───
const symbolGroups = [
  {
    label: "Operadores",
    symbols: [
      { display: "±", formula: "\\pm" }, { display: "∓", formula: "\\mp" },
      { display: "×", formula: "\\times" }, { display: "÷", formula: "\\div" },
      { display: "·", formula: "\\cdot" }, { display: "∘", formula: "\\circ" },
      { display: "⊕", formula: "\\oplus" }, { display: "⊗", formula: "\\otimes" },
    ],
  },
  {
    label: "Relações",
    symbols: [
      { display: "=", formula: "=" }, { display: "≠", formula: "\\neq" },
      { display: "≈", formula: "\\approx" }, { display: "≡", formula: "\\equiv" },
      { display: "<", formula: "<" }, { display: ">", formula: ">" },
      { display: "≤", formula: "\\leq" }, { display: "≥", formula: "\\geq" },
      { display: "≪", formula: "\\ll" }, { display: "≫", formula: "\\gg" },
      { display: "∝", formula: "\\propto" }, { display: "∼", formula: "\\sim" },
    ],
  },
  {
    label: "Setas",
    symbols: [
      { display: "→", formula: "\\rightarrow" }, { display: "←", formula: "\\leftarrow" },
      { display: "↔", formula: "\\leftrightarrow" }, { display: "⇒", formula: "\\Rightarrow" },
      { display: "⇐", formula: "\\Leftarrow" }, { display: "⇔", formula: "\\Leftrightarrow" },
      { display: "↑", formula: "\\uparrow" }, { display: "↓", formula: "\\downarrow" },
      { display: "↦", formula: "\\mapsto" }, { display: "⟶", formula: "\\longrightarrow" },
    ],
  },
  {
    label: "Gregos",
    symbols: [
      { display: "α", formula: "\\alpha" }, { display: "β", formula: "\\beta" },
      { display: "γ", formula: "\\gamma" }, { display: "δ", formula: "\\delta" },
      { display: "ε", formula: "\\epsilon" }, { display: "ζ", formula: "\\zeta" },
      { display: "η", formula: "\\eta" }, { display: "θ", formula: "\\theta" },
      { display: "λ", formula: "\\lambda" }, { display: "μ", formula: "\\mu" },
      { display: "ν", formula: "\\nu" }, { display: "π", formula: "\\pi" },
      { display: "ρ", formula: "\\rho" }, { display: "σ", formula: "\\sigma" },
      { display: "τ", formula: "\\tau" }, { display: "φ", formula: "\\varphi" },
      { display: "χ", formula: "\\chi" }, { display: "ψ", formula: "\\psi" },
      { display: "ω", formula: "\\omega" },
      { display: "Γ", formula: "\\Gamma" }, { display: "Δ", formula: "\\Delta" },
      { display: "Θ", formula: "\\Theta" }, { display: "Λ", formula: "\\Lambda" },
      { display: "Σ", formula: "\\Sigma" }, { display: "Φ", formula: "\\Phi" },
      { display: "Ψ", formula: "\\Psi" }, { display: "Ω", formula: "\\Omega" },
    ],
  },
  {
    label: "Conjuntos",
    symbols: [
      { display: "∈", formula: "\\in" }, { display: "∉", formula: "\\notin" },
      { display: "⊂", formula: "\\subset" }, { display: "⊃", formula: "\\supset" },
      { display: "⊆", formula: "\\subseteq" }, { display: "⊇", formula: "\\supseteq" },
      { display: "∪", formula: "\\cup" }, { display: "∩", formula: "\\cap" },
      { display: "∅", formula: "\\emptyset" }, { display: "∀", formula: "\\forall" },
      { display: "∃", formula: "\\exists" }, { display: "∄", formula: "\\nexists" },
    ],
  },
  {
    label: "Diversos",
    symbols: [
      { display: "∞", formula: "\\infty" }, { display: "∂", formula: "\\partial" },
      { display: "∇", formula: "\\nabla" }, { display: "ℕ", formula: "\\mathbb{N}" },
      { display: "ℤ", formula: "\\mathbb{Z}" }, { display: "ℚ", formula: "\\mathbb{Q}" },
      { display: "ℝ", formula: "\\mathbb{R}" }, { display: "ℂ", formula: "\\mathbb{C}" },
      { display: "°", formula: "^\\circ" }, { display: "‰", formula: "\\permil" },
      { display: "…", formula: "\\ldots" }, { display: "⋯", formula: "\\cdots" },
      { display: "⋮", formula: "\\vdots" }, { display: "⋱", formula: "\\ddots" },
      { display: "ℓ", formula: "\\ell" }, { display: "ℏ", formula: "\\hbar" },
    ],
  },
];

const RECENT_KEY = "equation-panel-recent";
const MAX_RECENT = 8;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function addRecent(formula: string) {
  const recent = getRecent().filter(f => f !== formula);
  recent.unshift(formula);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function KatexPreview({ formula, display = false, className }: { formula: string; display?: boolean; className?: string }) {
  const refCallback = useCallback((el: HTMLSpanElement | null) => {
    if (el) {
      try { katex.render(formula, el, { throwOnError: false, displayMode: display }); }
      catch { el.textContent = formula; }
    }
  }, [formula, display]);
  return <span ref={refCallback} className={cn("pointer-events-none", className)} style={{ color: "hsl(var(--foreground))" }} />;
}

export function EquationPanel({ onInsert, onClose }: EquationPanelProps) {
  const [customFormula, setCustomFormula] = useState("");
  const [activeTab, setActiveTab] = useState("visual");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(templateCategories[0].label);
  const [recentFormulas, setRecentFormulas] = useState<string[]>(getRecent());
  const [displayMode, setDisplayMode] = useState(true);

  const handleInsert = useCallback((formula: string, display?: boolean) => {
    addRecent(formula);
    setRecentFormulas(getRecent());
    onInsert(formula, display);
  }, [onInsert]);

  const handleCustomInsert = () => {
    if (customFormula.trim()) {
      handleInsert(customFormula, displayMode);
      setCustomFormula("");
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allTemplates.filter(t => t.label.toLowerCase().includes(q) || t.formula.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }, [searchQuery]);

  const filteredStructures = useMemo(() => {
    if (!searchQuery.trim()) return structures;
    const q = searchQuery.toLowerCase();
    return structures.filter(s => s.label.toLowerCase().includes(q) || s.formula.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div className="absolute left-0 top-full mt-1 z-[100] w-[640px] bg-popover border border-border rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95" style={{ color: "hsl(var(--foreground))" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="text-lg font-serif italic text-primary">π</span>
          <span className="text-sm font-semibold text-foreground">Inserir Equação</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar fórmula..."
              className="pl-7 pr-2 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-primary w-[180px]"
            />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm px-2 py-0.5 rounded-md hover:bg-muted transition-colors">✕</button>
        </div>
      </div>

      {/* Custom input */}
      <div className="px-4 py-2.5 border-b border-border bg-card/50 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-semibold whitespace-nowrap uppercase tracking-wider">LaTeX:</span>
        <input
          value={customFormula}
          onChange={(e) => setCustomFormula(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCustomInsert(); }}
          placeholder="Ex: \frac{a}{b} ou x^2 + y^2"
          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground font-mono outline-none focus:ring-1 focus:ring-primary"
        />
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={displayMode} onChange={e => setDisplayMode(e.target.checked)} className="rounded border-input h-3 w-3" />
          Bloco
        </label>
        <button onClick={handleCustomInsert} disabled={!customFormula.trim()} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-40">
          Inserir
        </button>
        {customFormula && (
          <div className="px-3 py-1 rounded-lg bg-muted/60 border border-border/50 min-w-[80px] flex items-center justify-center">
            <KatexPreview formula={customFormula} display={false} />
          </div>
        )}
      </div>

      {/* Recent */}
      {recentFormulas.length > 0 && !searchQuery && (
        <div className="px-4 py-2 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recentes</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {recentFormulas.map((f, i) => (
              <button
                key={i}
                onClick={() => handleInsert(f, true)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
                title={f}
              >
                <KatexPreview formula={f} display={false} className="text-xs" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
          <TabsTrigger value="visual" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 py-2 font-medium">
            🖱️ Visual
          </TabsTrigger>
          <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 py-2 font-medium">
            📐 Equações
          </TabsTrigger>
          <TabsTrigger value="structures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 py-2 font-medium">
            🧱 Estruturas
          </TabsTrigger>
          <TabsTrigger value="symbols" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-4 py-2 font-medium">
            αβ Símbolos
          </TabsTrigger>
        </TabsList>

        {/* Visual Builder */}
        <TabsContent value="visual" className="mt-0 h-[380px] flex flex-col">
          <VisualEquationBuilder onInsert={handleInsert} />
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-0">
          <ScrollArea className="h-[380px]">
            {filteredTemplates ? (
              <div className="p-3 space-y-1.5">
                {filteredTemplates.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhuma equação encontrada para "{searchQuery}"</p>
                )}
                {filteredTemplates.map((eq, i) => (
                  <TemplateItem key={i} label={eq.label} formula={eq.formula} category={eq.category} onInsert={() => handleInsert(eq.formula, true)} />
                ))}
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {templateCategories.map(cat => (
                  <div key={cat.label}>
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === cat.label ? null : cat.label)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-semibold text-foreground">{cat.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{cat.templates.length}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expandedCategory === cat.label && "rotate-180")} />
                      </div>
                    </button>
                    {expandedCategory === cat.label && (
                      <div className="pl-2 pr-1 pb-2 space-y-1">
                        {cat.templates.map((eq, i) => (
                          <TemplateItem key={i} label={eq.label} formula={eq.formula} onInsert={() => handleInsert(eq.formula, true)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Structures */}
        <TabsContent value="structures" className="mt-0">
          <ScrollArea className="h-[380px]">
            <div className="p-3 grid grid-cols-5 gap-1.5">
              {filteredStructures.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleInsert(s.formula)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 p-2.5 transition-all min-h-[60px] group"
                  title={s.label}
                >
                  <KatexPreview formula={s.formula} display={false} className="text-sm group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] text-muted-foreground leading-none text-center">{s.label}</span>
                </button>
              ))}
              {filteredStructures.length === 0 && (
                <p className="col-span-5 text-xs text-muted-foreground text-center py-8">Nenhuma estrutura encontrada</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Symbols */}
        <TabsContent value="symbols" className="mt-0">
          <ScrollArea className="h-[380px]">
            <div className="p-3 space-y-3">
              {symbolGroups.map((group) => (
                <div key={group.label}>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">{group.label}</span>
                  <div className="grid grid-cols-10 gap-1">
                    {group.symbols.map((sym, i) => (
                      <button
                        key={i}
                        onClick={() => handleInsert(sym.formula)}
                        className="flex items-center justify-center h-8 w-full rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-base text-foreground hover:scale-110"
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

      {/* Footer hint */}
      <div className="px-4 py-1.5 border-t border-border/50 bg-muted/10 rounded-b-xl">
        <span className="text-[10px] text-muted-foreground">Duplo clique em uma fórmula inserida para editá-la · Arraste para reposicionar</span>
      </div>
    </div>
  );
}

function TemplateItem({ label, formula, category, onInsert }: { label: string; formula: string; category?: string; onInsert: () => void }) {
  return (
    <button
      onClick={onInsert}
      className="w-full text-left rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 p-3 transition-all group"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        {category && <span className="text-[9px] text-primary/60 bg-primary/8 px-1.5 py-0.5 rounded-full font-medium">{category}</span>}
      </div>
      <div className="flex items-center justify-center py-1 overflow-x-auto">
        <KatexPreview formula={formula} />
      </div>
    </button>
  );
}
