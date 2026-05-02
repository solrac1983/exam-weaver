import { Editor } from "@tiptap/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Ruler, LayoutTemplate, Columns3, IndentIncrease, IndentDecrease,
  ArrowUpDown, Pilcrow, WrapText, SeparatorHorizontal, Grid3X3, Settings2, Gauge,
  Check,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { RibbonStackedBtn, RibbonGroup, RibbonDivider } from "./RibbonShared";
import { insertPageBreakAtEnd } from "./RibbonConstants";
import { WatermarkDropdown, PageColorDropdown, PageBorderDropdown } from "./PageBackgroundDropdowns";

const TEMPLATE_LABELS: Record<string, string> = {
  "": "Padrão",
  "personalizado": "Personalizado",
  "enem": "ENEM",
  "concurso": "Concurso",
  "vestibular": "Vestibular",
};

const PAPER_SIZES = {
  a4: { label: "A4", w: "210mm", h: "297mm", dims: "210 × 297 mm" },
  letter: { label: "Carta", w: "216mm", h: "279mm", dims: "216 × 279 mm" },
  legal: { label: "Ofício", w: "216mm", h: "356mm", dims: "216 × 356 mm" },
} as const;
type PaperKey = keyof typeof PAPER_SIZES;

// Cached element getters (re-query each call but centralized)
const getExamPage = () => document.querySelector('.exam-page') as HTMLElement | null;
const getExamWrapper = () => document.querySelector('.exam-wrapper') as HTMLElement | null;
const getTiptap = () => document.querySelector('.tiptap') as HTMLElement | null;

export function LayoutTab({ editor }: { editor: Editor }) {
  const [marginTopMm, setMarginTopMm] = useState(25);
  const [marginBottomMm, setMarginBottomMm] = useState(25);
  const [marginLeftMm, setMarginLeftMm] = useState(30);
  const [marginRightMm, setMarginRightMm] = useState(30);

  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [paperSize, setPaperSize] = useState<PaperKey>("a4");
  const [activeColumns, setActiveColumns] = useState<number>(1);
  const [activeTemplate, setActiveTemplate] = useState<string>("");
  const [showGuides, setShowGuides] = useState(false);
  const [wordBreak, setWordBreak] = useState(false);
  const [paragraphSpacing, setParagraphSpacing] = useState<string>("0.3rem");
  const [paginationLevel, setPaginationLevel] = useState<string>("balanced");

  // Debounce timer for margin number-input edits
  const marginDebounceRef = useRef<number | null>(null);

  // Sync from DOM once on mount
  useEffect(() => {
    const w = getExamWrapper();
    if (w) {
      setActiveColumns(Number(w.getAttribute('data-columns') || '1'));
      setActiveTemplate(w.getAttribute('data-template') || '');
    }
    const t = getTiptap();
    if (t?.classList.contains('show-margin-guides')) setShowGuides(true);
  }, []);

  useEffect(() => {
    const onCol = (e: Event) => setActiveColumns((e as CustomEvent).detail?.columns ?? 1);
    const onTpl = (e: Event) => setActiveTemplate((e as CustomEvent).detail?.template ?? '');
    window.addEventListener('editor-columns-change', onCol);
    window.addEventListener('editor-template-change', onTpl);
    return () => {
      window.removeEventListener('editor-columns-change', onCol);
      window.removeEventListener('editor-template-change', onTpl);
    };
  }, []);

  const mmToPx = useCallback((mm: number) => Math.round(mm * 3.7795), []);

  const dispatchMargins = useCallback((t: number, b: number, l: number, r: number) => {
    window.dispatchEvent(new CustomEvent('editor-margins-change', {
      detail: { top: mmToPx(t), bottom: mmToPx(b), left: mmToPx(l), right: mmToPx(r) }
    }));
  }, [mmToPx]);

  const applyMargins = useCallback((topMm: number, bottomMm: number, leftMm: number, rightMm: number, immediate = true) => {
    // Clamp values
    const clamp = (v: number) => Math.max(0, Math.min(60, isNaN(v) ? 0 : v));
    const t = clamp(topMm), b = clamp(bottomMm), l = clamp(leftMm), r = clamp(rightMm);
    setMarginTopMm(t); setMarginBottomMm(b); setMarginLeftMm(l); setMarginRightMm(r);

    if (immediate) {
      dispatchMargins(t, b, l, r);
    } else {
      if (marginDebounceRef.current) window.clearTimeout(marginDebounceRef.current);
      marginDebounceRef.current = window.setTimeout(() => dispatchMargins(t, b, l, r), 250);
    }
  }, [dispatchMargins]);

  const applyMarginPreset = useCallback((t: number, b: number, l: number, r: number, label: string) => {
    applyMargins(t, b, l, r, true);
    toast.success(`Margens: ${label}`);
  }, [applyMargins]);

  const applyIndent = useCallback((increase: boolean) => {
    const newLeft = increase ? Math.min(60, marginLeftMm + 5) : Math.max(0, marginLeftMm - 5);
    if (newLeft === marginLeftMm) {
      toast.info(increase ? "Recuo máximo atingido" : "Recuo mínimo atingido");
      return;
    }
    applyMargins(marginTopMm, marginBottomMm, newLeft, marginRightMm);
  }, [marginTopMm, marginBottomMm, marginLeftMm, marginRightMm, applyMargins]);

  const applyLineSpacing = useCallback((value: string) => {
    try {
      (editor.commands as any).setLineHeight(value);
      toast.success(`Espaçamento: ${value}`);
    } catch {
      toast.error("Não foi possível aplicar o espaçamento");
    }
  }, [editor]);

  const applyParagraphSpacing = useCallback((value: string, label: string) => {
    let style = document.querySelector('#editor-paragraph-spacing') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'editor-paragraph-spacing';
      document.head.appendChild(style);
    }
    style.textContent = `.tiptap p { margin-bottom: ${value} !important; } .tiptap h1, .tiptap h2, .tiptap h3 { margin-bottom: ${value} !important; }`;
    setParagraphSpacing(value);
    toast.success(`Parágrafos: ${label}`);
  }, []);

  // Cleanup paragraph-spacing style on unmount
  useEffect(() => {
    return () => {
      if (marginDebounceRef.current) window.clearTimeout(marginDebounceRef.current);
    };
  }, []);

  const applyPaperAndOrientation = useCallback((size: PaperKey, orient: "portrait" | "landscape") => {
    const el = getExamPage();
    if (!el) {
      toast.error("Página não encontrada");
      return;
    }
    const { w, h, label } = PAPER_SIZES[size];
    if (orient === "portrait") {
      el.style.width = w; el.style.minHeight = h;
    } else {
      el.style.width = h; el.style.minHeight = w;
    }
    setOrientation(orient);
    setPaperSize(size);
    toast.success(`${label} • ${orient === "portrait" ? "Retrato" : "Paisagem"}`);
  }, []);

  const applyColumns = useCallback((n: string, gap: string) => {
    const el = getTiptap();
    if (!el) return;
    el.style.columnCount = n;
    el.style.columnGap = gap;
    if (n === '1') el.style.columnRule = 'none';
    const wrapper = getExamWrapper();
    if (wrapper) wrapper.setAttribute('data-columns', n);
    setActiveColumns(Number(n));
    window.dispatchEvent(new CustomEvent('editor-columns-change', { detail: { columns: Number(n) } }));
    toast.success(`${n} coluna${n !== '1' ? 's' : ''}`);
  }, []);

  const applyColumnRule = useCallback((rule: string, label: string) => {
    const el = getTiptap();
    if (!el) return;
    if (activeColumns < 2) {
      toast.warning("Configure 2+ colunas primeiro");
      return;
    }
    el.style.columnRule = rule;
    toast.success(`Linha: ${label}`);
  }, [activeColumns]);

  const toggleGuides = useCallback(() => {
    const el = getTiptap();
    if (!el) return;
    const next = !el.classList.contains('show-margin-guides');
    el.classList.toggle('show-margin-guides', next);
    setShowGuides(next);
  }, []);

  const toggleWordBreak = useCallback(() => {
    const el = getTiptap();
    if (!el) return;
    const next = el.style.wordBreak !== 'break-all';
    el.style.wordBreak = next ? 'break-all' : 'normal';
    setWordBreak(next);
    toast.success(next ? "Quebra agressiva ativada" : "Quebra normal");
  }, []);

  const applyTemplate = useCallback((id: string, label: string) => {
    const wrapper = getExamWrapper();
    const tpl = id === 'padrao' ? '' : id;
    if (wrapper) wrapper.setAttribute('data-template', tpl);
    setActiveTemplate(tpl);
    window.dispatchEvent(new CustomEvent('editor-template-change', { detail: { template: tpl } }));
    toast.success(`Modelo: ${label}`);
  }, []);

  const applyPagination = useCallback((value: string, label: string) => {
    setPaginationLevel(value);
    window.dispatchEvent(new CustomEvent('editor-pagination-rigidity', { detail: { level: value } }));
    toast.success(`Paginação: ${label}`);
  }, []);

  /* Shared dropdown trigger style for stacked look */
  const stackedTrigger = "flex flex-col items-center justify-center gap-[3px] rounded-md px-2 py-1.5 min-w-[44px] text-white/75 hover:text-white hover:bg-white/[0.12] transition-all duration-100 group/stk";
  const stackedIcon = "h-[18px] w-[18px] transition-transform duration-100 group-hover/stk:scale-110";
  const stackedLabel = "text-[9px] font-medium leading-none whitespace-nowrap tracking-wide select-none";
  const activeBadge = "ml-0.5 px-1 rounded-full bg-white/25 text-[8px] font-bold";

  return (
    <>
      <RibbonGroup label="MARGENS">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={stackedTrigger} title="Configurar margens da página">
              <Ruler className={stackedIcon} />
              <span className={stackedLabel}>Margens</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuLabel className="text-xs">Predefinições</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => applyMarginPreset(25, 25, 30, 30, "Normal")}>Normal (2,5 cm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMarginPreset(12.7, 12.7, 12.7, 12.7, "Estreita")}>Estreita (1,27 cm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMarginPreset(25.4, 25.4, 31.8, 31.8, "Larga")}>Larga (3,18 cm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMarginPreset(25, 25, 19, 19, "Moderada")}>Moderada</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMarginPreset(20, 20, 20, 20, "Mínima")}>Mínima (2 cm)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Personalizar (mm)</DropdownMenuLabel>
            <div className="px-2 py-1.5 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
              {[
                { label: "Superior", value: marginTopMm, setter: (v: number) => applyMargins(v, marginBottomMm, marginLeftMm, marginRightMm, false) },
                { label: "Inferior", value: marginBottomMm, setter: (v: number) => applyMargins(marginTopMm, v, marginLeftMm, marginRightMm, false) },
                { label: "Esquerda", value: marginLeftMm, setter: (v: number) => applyMargins(marginTopMm, marginBottomMm, v, marginRightMm, false) },
                { label: "Direita", value: marginRightMm, setter: (v: number) => applyMargins(marginTopMm, marginBottomMm, marginLeftMm, v, false) },
              ].map(({ label, value, setter }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-muted-foreground">{label} (mm)</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setter(Number(e.target.value))}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-full px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground"
                    min={0} max={60} step={1}
                  />
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <RibbonStackedBtn
          onClick={toggleGuides}
          icon={Grid3X3}
          label={showGuides ? "Ocultar" : "Guias"}
          description="Exibir ou ocultar guias visuais de margem no documento"
          isActive={showGuides}
        />
      </RibbonGroup>
      <RibbonDivider />

      <RibbonGroup label="ORIENTAÇÃO">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={stackedTrigger} title="Orientação da página">
              <LayoutTemplate className={stackedIcon} />
              <span className={stackedLabel}>
                Orientação
                <span className={activeBadge}>{orientation === "portrait" ? "P" : "L"}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => applyPaperAndOrientation(paperSize, "portrait")}>
              {orientation === "portrait" && <Check className="h-3 w-3 mr-1" />}
              📄 Retrato
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyPaperAndOrientation(paperSize, "landscape")}>
              {orientation === "landscape" && <Check className="h-3 w-3 mr-1" />}
              📄 Paisagem
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={stackedTrigger} title="Tamanho do papel">
              <Settings2 className={stackedIcon} />
              <span className={stackedLabel}>
                Papel
                <span className={activeBadge}>{PAPER_SIZES[paperSize].label}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">Tamanho do papel</DropdownMenuLabel>
            {(Object.entries(PAPER_SIZES) as [PaperKey, typeof PAPER_SIZES[PaperKey]][]).map(([key, info]) => (
              <DropdownMenuItem key={key} onClick={() => applyPaperAndOrientation(key, orientation)}>
                {paperSize === key && <Check className="h-3 w-3 mr-1" />}
                {info.label} ({info.dims})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      <RibbonGroup label="COLUNAS">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={stackedTrigger} title="Layout em colunas">
              <Columns3 className={stackedIcon} />
              <span className={stackedLabel}>
                Colunas
                {activeColumns > 1 && <span className={activeBadge}>{activeColumns}</span>}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs">Número de colunas</DropdownMenuLabel>
            {[
              { n: '1', gap: '0' },
              { n: '2', gap: '24px' },
              { n: '3', gap: '20px' },
            ].map(({ n, gap }) => (
              <DropdownMenuItem key={n} onClick={() => applyColumns(n, gap)}>
                {String(activeColumns) === n && <Check className="h-3 w-3 mr-1" />}
                {n} Coluna{n !== '1' ? 's' : ''}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Linha entre colunas</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => applyColumnRule('1px solid hsl(0 0% 75%)', 'fina')}>Linha fina</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyColumnRule('2px solid hsl(0 0% 60%)', 'média')}>Linha média</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyColumnRule('1px dashed hsl(0 0% 70%)', 'tracejada')}>Linha tracejada</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyColumnRule('none', 'sem linha')}>Sem linha</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      <RibbonGroup label="RECUO">
        <RibbonStackedBtn onClick={() => applyIndent(true)} icon={IndentIncrease} label="Mais" shortcut="Tab" description="Aumentar o recuo da margem esquerda em 5mm" />
        <RibbonStackedBtn onClick={() => applyIndent(false)} icon={IndentDecrease} label="Menos" shortcut="Shift+Tab" description="Diminuir o recuo da margem esquerda em 5mm" />
      </RibbonGroup>
      <RibbonDivider />

      <RibbonGroup label="ESPAÇAMENTO">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={stackedTrigger} title="Espaçamento entre linhas">
              <ArrowUpDown className={stackedIcon} />
              <span className={stackedLabel}>Linhas</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">Espaçamento entre linhas</DropdownMenuLabel>
            {['1', '1.15', '1.5', '1.7', '2', '2.5', '3'].map(v => (
              <DropdownMenuItem key={v} onClick={() => applyLineSpacing(v)}>
                {v === '1' ? 'Simples (1.0)' : v === '2' ? 'Duplo (2.0)' : v === '3' ? 'Triplo (3.0)' : v}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={stackedTrigger} title="Espaçamento entre parágrafos">
              <Pilcrow className={stackedIcon} />
              <span className={stackedLabel}>Parágrafos</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs">Espaço entre parágrafos</DropdownMenuLabel>
            {[
              { label: "Nenhum", value: "0" },
              { label: "Pequeno (Padrão)", value: "0.3rem" },
              { label: "Médio", value: "0.6rem" },
              { label: "Grande", value: "1rem" },
              { label: "Extra grande", value: "1.5rem" },
            ].map(({ label, value }) => (
              <DropdownMenuItem key={value} onClick={() => applyParagraphSpacing(value, label)}>
                {paragraphSpacing === value && <Check className="h-3 w-3 mr-1" />}
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      <RibbonGroup label="QUEBRAS">
        <RibbonStackedBtn
          onClick={toggleWordBreak}
          icon={WrapText}
          label="Texto"
          description="Alternar quebra agressiva de palavras longas"
          isActive={wordBreak}
        />
        <RibbonStackedBtn
          onClick={() => insertPageBreakAtEnd(editor)}
          icon={SeparatorHorizontal}
          label="Página"
          shortcut="Ctrl+Enter"
          description="Inserir uma quebra de página no final do documento"
        />
      </RibbonGroup>
      <RibbonDivider />

      <RibbonGroup label="PAGINAÇÃO">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={stackedTrigger} title="Rigidez da paginação">
              <Gauge className={stackedIcon} />
              <span className={stackedLabel}>Rigidez</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuLabel className="text-xs">Nível de rigidez da paginação</DropdownMenuLabel>
            {[
              { label: "🟢 Suave", value: "soft", desc: "Texto flui livremente, menos quebras" },
              { label: "🟡 Balanceado", value: "balanced", desc: "Equilíbrio entre fluxo e quebras" },
              { label: "🔴 Rigoroso", value: "strict", desc: "Mais quebras, evita cortes ao máximo" },
            ].map(({ label, value, desc }) => (
              <DropdownMenuItem key={value} onClick={() => applyPagination(value, label)}>
                <div className="flex flex-col">
                  <span className="text-xs font-medium flex items-center gap-1">
                    {paginationLevel === value && <Check className="h-3 w-3" />}
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{desc}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      <RibbonGroup label="PLANO DE FUNDO">
        <WatermarkDropdown editor={editor} />
        <PageColorDropdown editor={editor} />
        <PageBorderDropdown editor={editor} />
      </RibbonGroup>

      <RibbonGroup label="MODELO">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={stackedTrigger} title="Modelo de formatação">
              <LayoutTemplate className={stackedIcon} />
              <span className={stackedLabel}>
                Modelo
                {activeTemplate && <span className={activeBadge}>{TEMPLATE_LABELS[activeTemplate] || activeTemplate}</span>}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[240px]">
            <DropdownMenuLabel className="text-xs">Modelo de Formatação</DropdownMenuLabel>
            {[
              { id: "padrao", label: "Padrão", desc: "Layout simples, sem estilos especiais" },
              { id: "personalizado", label: "Personalizado", desc: "Arial 10pt, 2 colunas, títulos com fundo cinza" },
              { id: "enem", label: "Estilo ENEM", desc: "Times New Roman 10pt, 2 colunas" },
              { id: "concurso", label: "Estilo Concurso", desc: "Arial 10pt, 2 colunas compacto" },
              { id: "vestibular", label: "Estilo Vestibular", desc: "Georgia 11pt, 1 coluna" },
            ].map(({ id, label, desc }) => {
              const isActive = (id === 'padrao' && !activeTemplate) || activeTemplate === id;
              return (
                <DropdownMenuItem key={id} onClick={() => applyTemplate(id, label)}>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium flex items-center gap-1">
                      {isActive && <Check className="h-3 w-3" />}
                      {label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{desc}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
    </>
  );
}
