import { Editor } from "@tiptap/react";
import { ChartEditorTab, isChartImage, parseChartData, serializeChartData, chartDataToImageSrc, getDefaultChartData, type ChartData } from "./ChartEditorTab";
import { cn } from "@/lib/utils";
import mammoth from "mammoth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Heading1, Heading2,
  Heading3, Undo, Redo, Quote, Superscript, Subscript, Highlighter,
  Palette, Type, Image, ImagePlus, Link as LinkIcon, Table, Minus, FunctionSquare,
  Columns3, RowsIcon, Trash2, Save, FilePlus, FolderOpen, FileDown,
  BarChart3, MessageSquareText, SeparatorHorizontal, Ruler, LayoutTemplate,
  Printer, ZoomIn, ZoomOut, Grid3X3, Eye, Maximize2, Minimize2, Square,
  Frame, CircleDot, Layers, SunMedium, RotateCw, FlipHorizontal,
  FlipVertical, Crop, Settings2, Contrast, ImageIcon, IndentIncrease,
  IndentDecrease, WrapText, RotateCcw, FileText, MoveVertical,
  ArrowUpDown, Pilcrow, Shapes, PieChart, Smile, FileUp, PanelTop,
  PanelBottom, TextCursorInput, Sparkles, Sigma, Hash, Search,
  Replace, MousePointer2, ArrowDownAZ, ArrowUpAZ, ALargeSmall,
  SpellCheck, CheckCircle2, Paintbrush, Eraser, CaseSensitive,
  Scissors, ListChecks, BarChart2, AlertCircle, GaugeCircle,
  MoreHorizontal, Minus as MinusIcon, PenLine,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { EquationPanel } from "./EquationPanel";
import { WordArtDialog } from "./WordArtDialog";

// ─── Shared Button ───
function RibbonBtn({
  onClick, active, disabled, icon: Icon, label, shortcut, className, size = "sm",
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  icon: React.ElementType; label: string; shortcut?: string; className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button" onClick={onClick} disabled={disabled}
          className={cn(
            "rounded-lg transition-all duration-150 relative group/btn",
            size === "lg" ? "p-2.5" : "p-[7px]",
            active
              ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1.5px_hsl(var(--primary)/0.25)]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60 hover:shadow-sm",
            disabled && "opacity-30 cursor-not-allowed pointer-events-none", className,
          )}
        >
          <Icon className={cn(
            "transition-transform duration-150",
            size === "lg" ? "h-5 w-5" : "h-[15px] w-[15px]",
            !disabled && !active && "group-hover/btn:scale-110"
          )} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
        <span>{label}</span>
        {shortcut && <kbd className="ml-1.5 text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded font-mono">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

function RibbonGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5", className)}>
      <div className="flex items-center gap-[3px] px-1 py-0.5">{children}</div>
      <span className="text-[9px] text-muted-foreground/60 font-semibold leading-none whitespace-nowrap uppercase tracking-wider">{label}</span>
    </div>
  );
}

function RibbonDivider() {
  return <Separator orientation="vertical" className="h-12 mx-1" />;
}

// ─── Data ───
const fontFamilies = [
  { label: "Padrão", value: "Inter" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];
const textColors = [
  { label: "Padrão", value: "" }, { label: "Preto", value: "#000000" },
  { label: "Vermelho", value: "#dc2626" }, { label: "Azul", value: "#2563eb" },
  { label: "Verde", value: "#16a34a" }, { label: "Laranja", value: "#ea580c" },
  { label: "Roxo", value: "#9333ea" }, { label: "Cinza", value: "#6b7280" },
];
const highlightColors = [
  { label: "Amarelo", value: "#fef08a" }, { label: "Verde", value: "#bbf7d0" },
  { label: "Azul", value: "#bfdbfe" }, { label: "Rosa", value: "#fbcfe8" },
  { label: "Laranja", value: "#fed7aa" },
];
const borderStyles = [
  { label: "Nenhuma", value: "none" },
  { label: "Fina", value: "1px solid hsl(var(--border))" },
  { label: "Média", value: "2px solid hsl(var(--border))" },
  { label: "Grossa", value: "3px solid hsl(var(--foreground))" },
  { label: "Pontilhada", value: "2px dashed hsl(var(--muted-foreground))" },
];
const shadowEffects = [
  { label: "Nenhuma", value: "none" },
  { label: "Suave", value: "0 2px 8px rgba(0,0,0,0.12)" },
  { label: "Média", value: "0 4px 16px rgba(0,0,0,0.18)" },
  { label: "Forte", value: "0 8px 30px rgba(0,0,0,0.25)" },
];
const borderRadiusOptions = [
  { label: "Sem arredondar", value: "0" }, { label: "Pequeno", value: "4px" },
  { label: "Médio", value: "8px" }, { label: "Grande", value: "16px" },
  { label: "Circular", value: "50%" },
];

type TabId = "home" | "insert" | "layout" | "view" | "image" | "chart";

const tabs: { id: TabId; label: string; icon: React.ElementType; contextual?: boolean }[] = [
  { id: "home", label: "Página Inicial", icon: Type },
  { id: "insert", label: "Inserir", icon: ImagePlus },
  { id: "layout", label: "Layout", icon: LayoutTemplate },
  { id: "view", label: "Exibição", icon: Eye },
  { id: "image", label: "Formato de Imagem", icon: ImageIcon, contextual: true },
  { id: "chart", label: "Editar Gráficos", icon: BarChart3, contextual: true },
];

interface EditorRibbonProps {
  editor: Editor;
  zoom: number;
  onZoomChange: (z: number) => void;
  showDataPanel?: boolean;
  onToggleDataPanel?: () => void;
  onChartDataChange?: (data: ChartData | null) => void;
  onChartUpdate?: (data: ChartData) => void;
  showComments?: boolean;
  onToggleComments?: () => void;
}

export function EditorRibbon({ editor, zoom, onZoomChange, showDataPanel, onToggleDataPanel, onChartDataChange, onChartUpdate, showComments, onToggleComments }: EditorRibbonProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasImageSelected, setHasImageSelected] = useState(false);
  const [hasChartSelected, setHasChartSelected] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [imageAttrs, setImageAttrs] = useState<any>(null);
  const [widthInput, setWidthInput] = useState("");
  const [heightInput, setHeightInput] = useState("");

  // Image selection detection
  const getSelectedImageNode = useCallback(() => {
    const { selection } = editor.state;
    if (selection && (selection as any).node?.type?.name === "image") return (selection as any).node;
    return null;
  }, [editor]);

  const updateImageAttr = useCallback((attrs: Record<string, any>) => {
    const { state } = editor;
    const { selection } = state;
    if (selection && (selection as any).node?.type?.name === "image") {
      const pos = (selection as any).from;
      const tr = state.tr.setNodeMarkup(pos, undefined, { ...(selection as any).node.attrs, ...attrs });
      editor.view.dispatch(tr);
    }
  }, [editor]);

  useEffect(() => {
    const handler = () => {
      const node = getSelectedImageNode();
      if (node) {
        setHasImageSelected(true);
        setImageAttrs(node.attrs);
        setWidthInput(String(node.attrs.customWidth || ""));
        setHeightInput(String(node.attrs.customHeight || ""));
        const cd = isChartImage(node.attrs.alt) ? parseChartData(node.attrs.alt) : null;
        if (cd) {
          setHasChartSelected(true);
          setChartData(cd);
          onChartDataChange?.(cd);
          setActiveTab("chart");
        } else {
          setHasChartSelected(false);
          setChartData(null);
          onChartDataChange?.(null);
          setActiveTab("image");
        }
      } else {
        setHasImageSelected(false);
        setHasChartSelected(false);
        setChartData(null);
        onChartDataChange?.(null);
        setImageAttrs(null);
        if (activeTab === "image" || activeTab === "chart") setActiveTab("home");
      }
    };
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    handler();
    return () => { editor.off("selectionUpdate", handler); editor.off("transaction", handler); };
  }, [editor, getSelectedImageNode, activeTab]);

  // ─── Actions ───
  const addImage = () => fileInputRef.current?.click();
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (reader.result) (editor.commands as any).setImage({ src: reader.result as string }); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const addImageFromUrl = () => {
    const url = prompt("Cole a URL da imagem:");
    if (url) (editor.commands as any).setImage({ src: url });
  };
  const insertFormula = () => { (editor.commands as any).insertFormula({ formula: "x^2 + y^2 = z^2" }); };
  const addTable = () => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); };

  // Image helpers
  const applyPreset = (w: number) => {
    const imgEl = document.querySelector(`.ProseMirror img[src="${imageAttrs?.src}"]`) as HTMLImageElement;
    const ratio = imgEl ? imgEl.naturalWidth / imgEl.naturalHeight : 1;
    const h = Math.round(w / ratio);
    setWidthInput(String(w)); setHeightInput(String(h));
    updateImageAttr({ customWidth: w, customHeight: h });
  };
  const handleWidthChange = (val: string) => {
    setWidthInput(val);
    const w = parseInt(val);
    if (w > 0) {
      const imgEl = document.querySelector(`.ProseMirror img[src="${imageAttrs?.src}"]`) as HTMLImageElement;
      const ratio = imgEl ? imgEl.naturalWidth / imgEl.naturalHeight : 1;
      const h = Math.round(w / ratio);
      setHeightInput(String(h));
      updateImageAttr({ customWidth: w, customHeight: h });
    }
  };
  const handleHeightChange = (val: string) => {
    setHeightInput(val);
    const h = parseInt(val);
    if (h > 0) {
      const imgEl = document.querySelector(`.ProseMirror img[src="${imageAttrs?.src}"]`) as HTMLImageElement;
      const ratio = imgEl ? imgEl.naturalWidth / imgEl.naturalHeight : 1;
      const w = Math.round(h * ratio);
      setWidthInput(String(w));
      updateImageAttr({ customWidth: w, customHeight: h });
    }
  };

  const handleChartUpdate = useCallback((newData: ChartData) => {
    setChartData(newData);
    onChartDataChange?.(newData);
    onChartUpdate?.(newData);
    const src = chartDataToImageSrc(newData, imageAttrs?.customWidth || 400, imageAttrs?.customHeight || 260);
    const alt = serializeChartData(newData);
    updateImageAttr({ src, alt });
  }, [imageAttrs, updateImageAttr, onChartDataChange, onChartUpdate]);

  // Listen for data panel updates from ExamEditorPage
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent<ChartData>).detail;
      if (data) handleChartUpdate(data);
    };
    window.addEventListener('chart-data-update', handler);
    return () => window.removeEventListener('chart-data-update', handler);
  }, [handleChartUpdate]);

  const visibleTabs = tabs.filter((t) => !t.contextual || (t.id === "image" && hasImageSelected && !hasChartSelected) || (t.id === "chart" && hasChartSelected));

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-visible relative">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b border-border/50 bg-muted/20 px-2 pt-1">
        {visibleTabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold transition-all duration-150 rounded-t-lg -mb-px border-b-2",
                activeTab === tab.id
                  ? "border-primary text-primary bg-card shadow-[0_-1px_4px_0_hsl(var(--primary)/0.08)]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/50",
                tab.contextual && "text-primary/80 bg-primary/5",
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex items-end gap-0.5 px-2 py-2.5 min-h-[56px] relative overflow-visible flex-wrap bg-card">
        {activeTab === "home" && <HomeTab editor={editor} />}
        {activeTab === "insert" && (
          <InsertTab editor={editor} addImage={addImage} addImageFromUrl={addImageFromUrl} addTable={addTable} insertFormula={insertFormula} showComments={showComments} onToggleComments={onToggleComments} />
        )}
        {activeTab === "layout" && <LayoutTab editor={editor} />}
        {activeTab === "view" && <ViewTab zoom={zoom} onZoomChange={onZoomChange} editor={editor} />}
        {activeTab === "image" && imageAttrs && (
          <ImageTab
            editor={editor} imageAttrs={imageAttrs} updateImageAttr={updateImageAttr}
            widthInput={widthInput} heightInput={heightInput}
            handleWidthChange={handleWidthChange} handleHeightChange={handleHeightChange}
            applyPreset={applyPreset}
          />
        )}
        {activeTab === "chart" && chartData && (
          <ChartEditorTab chartData={chartData} onUpdate={handleChartUpdate} showDataPanel={showDataPanel} onToggleDataPanel={onToggleDataPanel} />
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB: Página Inicial
// ═══════════════════════════════════════════
function HomeTab({ editor }: { editor: Editor }) {
  const docxInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      editor.commands.setContent(result.value);
      setUploadStatus(`✓ "${file.name}" carregado com sucesso!`);
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus("✗ Erro ao carregar o arquivo.");
      setTimeout(() => setUploadStatus(null), 3000);
    }
    e.target.value = "";
  };
  const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];
  const moreFonts = [
    { label: "Padrão", value: "Inter" },
    { label: "Serif", value: "Georgia, serif" },
    { label: "Mono", value: "ui-monospace, monospace" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Times New Roman", value: "'Times New Roman', serif" },
    { label: "Courier New", value: "'Courier New', monospace" },
    { label: "Verdana", value: "Verdana, sans-serif" },
    { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
    { label: "Tahoma", value: "Tahoma, sans-serif" },
    { label: "Palatino", value: "'Palatino Linotype', serif" },
    { label: "Garamond", value: "Garamond, serif" },
    { label: "Comic Sans", value: "'Comic Sans MS', cursive" },
    { label: "Impact", value: "Impact, sans-serif" },
    { label: "Lucida Console", value: "'Lucida Console', monospace" },
  ];

  const sortContent = (direction: 'asc' | 'desc') => {
    const html = editor.getHTML();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements = Array.from(doc.body.children);
    elements.sort((a, b) => {
      const textA = (a.textContent || '').trim().toLowerCase();
      const textB = (b.textContent || '').trim().toLowerCase();
      return direction === 'asc' ? textA.localeCompare(textB) : textB.localeCompare(textA);
    });
    const sorted = elements.map(el => el.outerHTML).join('');
    editor.commands.setContent(sorted);
  };

  const findText = () => {
    const term = prompt("Localizar texto:");
    if (!term) return;
    const content = editor.getText();
    const count = (content.match(new RegExp(term, 'gi')) || []).length;
    alert(`Encontrado "${term}" ${count} vez(es) no documento.`);
  };

  const replaceText = () => {
    const search = prompt("Texto a localizar:");
    if (!search) return;
    const replacement = prompt("Substituir por:");
    if (replacement === null) return;
    const html = editor.getHTML();
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const newHtml = html.replace(regex, replacement);
    editor.commands.setContent(newHtml);
  };

  return (
    <>
      {/* Row 1: File, Undo, Font, Size, Headings */}
      <RibbonGroup label="Arquivo">
        <RibbonBtn onClick={() => editor.commands.clearContent()} icon={FilePlus} label="Novo documento" shortcut="Ctrl+N" />
        <RibbonBtn onClick={() => docxInputRef.current?.click()} icon={FolderOpen} label="Abrir documento" shortcut="Ctrl+O" />
        <RibbonBtn onClick={() => {}} icon={Save} label="Salvar" shortcut="Ctrl+S" />
        <RibbonBtn onClick={() => {}} icon={FileDown} label="Salvar como" shortcut="Ctrl+Shift+S" />
        <input ref={docxInputRef} type="file" accept=".docx" className="hidden" onChange={handleDocxUpload} />
      </RibbonGroup>
      {uploadStatus && (
        <div className={cn(
          "flex items-center px-3 py-1 rounded-md text-xs font-medium animate-in fade-in-0",
          uploadStatus.startsWith("✓") ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
        )}>
          {uploadStatus}
        </div>
      )}

      <RibbonDivider />

      <RibbonGroup label="Desfazer">
        <RibbonBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={Undo} label="Desfazer" shortcut="Ctrl+Z" />
        <RibbonBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={Redo} label="Refazer" shortcut="Ctrl+Y" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Fonte">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all min-w-[85px] border border-border/40 hover:border-border">
              <Type className="h-3.5 w-3.5" /><span className="truncate font-medium">Fonte</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px] max-h-[300px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Fontes disponíveis</DropdownMenuLabel>
            {moreFonts.map((f) => (
              <DropdownMenuItem key={f.value} onClick={() => editor.chain().focus().setFontFamily(f.value).run()} style={{ fontFamily: f.value }}>{f.label}</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()}>Limpar fonte</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all border border-border/40 hover:border-border">
              <ALargeSmall className="h-3.5 w-3.5" /><span className="font-medium">Tamanho</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[100px] max-h-[250px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Tamanho da fonte</DropdownMenuLabel>
            {fontSizes.map((size) => (
              <DropdownMenuItem key={size} onClick={() => {
                document.execCommand('fontSize', false, '7');
                const fontElements = document.querySelectorAll('.tiptap font[size="7"]');
                fontElements.forEach(fe => {
                  (fe as HTMLElement).removeAttribute('size');
                  (fe as HTMLElement).style.fontSize = `${size}px`;
                });
              }}>
                <span style={{ fontSize: Math.min(parseInt(size), 24) + 'px' }}>{size}px</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors">
              <Palette className="h-[15px] w-[15px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuLabel className="text-xs">Cor do texto</DropdownMenuLabel>
            {textColors.map((c) => (
              <DropdownMenuItem key={c.value || "d"} onClick={() => c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run()}>
                <span className="h-3 w-3 rounded-full border border-border mr-2" style={{ background: c.value || "currentColor" }} />{c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("p-1.5 rounded-lg transition-colors", editor.isActive("highlight") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/60")}>
              <Highlighter className="h-[15px] w-[15px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuLabel className="text-xs">Realce</DropdownMenuLabel>
            {highlightColors.map((c) => (
              <DropdownMenuItem key={c.value} onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}>
                <span className="h-3 w-3 rounded border border-border mr-2" style={{ background: c.value }} />{c.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetHighlight().run()}>Remover</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Formatação">
        <RibbonBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} label="Negrito" shortcut="Ctrl+B" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} label="Itálico" shortcut="Ctrl+I" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={Underline} label="Sublinhado" shortcut="Ctrl+U" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={Strikethrough} label="Tachado" shortcut="Ctrl+Shift+X" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} icon={Superscript} label="Sobrescrito" shortcut="Ctrl+." />
        <RibbonBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} icon={Subscript} label="Subscrito" shortcut="Ctrl+," />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Parágrafo">
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={AlignLeft} label="Alinhar à esquerda" shortcut="Ctrl+L" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={AlignCenter} label="Centralizar" shortcut="Ctrl+E" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={AlignRight} label="Alinhar à direita" shortcut="Ctrl+R" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} icon={AlignJustify} label="Justificar" shortcut="Ctrl+J" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={List} label="Lista com marcadores" shortcut="Ctrl+Shift+8" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={ListOrdered} label="Lista numerada" shortcut="Ctrl+Shift+7" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={Quote} label="Citação" shortcut="Ctrl+Shift+B" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Títulos">
        <RibbonBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} icon={Heading1} label="Título 1" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} icon={Heading2} label="Título 2" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} icon={Heading3} label="Título 3" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Classificar">
        <RibbonBtn onClick={() => sortContent('asc')} icon={ArrowDownAZ} label="Classificar A → Z" />
        <RibbonBtn onClick={() => sortContent('desc')} icon={ArrowUpAZ} label="Classificar Z → A" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Formatação Rápida">
        <RibbonBtn
          onClick={() => {
            if ((window as any).__formatPainterMarks) {
              // Apply mode: apply stored marks to current selection
              const marks = (window as any).__formatPainterMarks;
              const { from, to } = editor.state.selection;
              if (from === to) return;
              const tr = editor.state.tr;
              editor.state.doc.nodesBetween(from, to, (node, pos) => {
                node.marks.forEach(mark => tr.removeMark(Math.max(pos, from), Math.min(pos + node.nodeSize, to), mark.type));
              });
              marks.forEach((mark: any) => tr.addMark(from, to, mark));
              editor.view.dispatch(tr);
              delete (window as any).__formatPainterMarks;
            } else {
              // Copy mode: store marks from current selection
              const { from } = editor.state.selection;
              const marks = editor.state.doc.resolve(from).marks();
              if (marks.length === 0) return;
              (window as any).__formatPainterMarks = marks;
            }
          }}
          active={!!(window as any).__formatPainterMarks}
          icon={Paintbrush}
          label="Pincel de formatação — clique para copiar, clique novamente no texto destino para aplicar"
        />
        <RibbonBtn
          onClick={() => {
            editor.chain().focus().unsetAllMarks().run();
            editor.chain().focus().clearNodes().run();
          }}
          icon={Eraser}
          label="Limpar toda formatação"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-[7px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all">
              <CaseSensitive className="h-[15px] w-[15px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs">Maiúsculas / Minúsculas</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to);
              if (text) editor.chain().focus().insertContentAt({ from, to }, text.toUpperCase()).run();
            }}>MAIÚSCULAS</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to);
              if (text) editor.chain().focus().insertContentAt({ from, to }, text.toLowerCase()).run();
            }}>minúsculas</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to);
              if (text) {
                const capitalized = text.replace(/\b\w/g, c => c.toUpperCase());
                editor.chain().focus().insertContentAt({ from, to }, capitalized).run();
              }
            }}>Capitalizar Cada Palavra</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Revisão">
        <RibbonBtn onClick={findText} icon={Search} label="Localizar" shortcut="Ctrl+F" />
        <RibbonBtn onClick={replaceText} icon={Replace} label="Substituir" shortcut="Ctrl+H" />
        <RibbonBtn
          onClick={() => {
            const editorEl = document.querySelector('.ProseMirror') as HTMLElement;
            if (editorEl) {
              const current = editorEl.getAttribute('spellcheck');
              const enable = current !== 'true';
              editorEl.setAttribute('spellcheck', String(enable));
              editorEl.setAttribute('lang', 'pt-BR');
              if (enable) { editorEl.blur(); setTimeout(() => editorEl.focus(), 50); }
              alert(enable ? 'Revisão ortográfica ativada.' : 'Revisão ortográfica desativada.');
            }
          }}
          icon={SpellCheck}
          label="Revisão ortográfica"
        />
        <RibbonBtn onClick={() => editor.chain().focus().selectAll().run()} icon={MousePointer2} label="Selecionar tudo" shortcut="Ctrl+A" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Checklist">
        <RibbonBtn
          onClick={() => {
            const html = editor.getHTML();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const elements = Array.from(doc.body.querySelectorAll('p, h1, h2, h3, li, ol, ul'));
            
            // Count questions (paragraphs starting with number or "Questão")
            const questionRegex = /^(\d+[\.\)\-]|quest[aã]o\s*\d+)/i;
            const questions = elements.filter(el => questionRegex.test((el.textContent || '').trim()));
            
            // Check for header
            const hasHeader = html.includes('cabeç') || html.includes('header') || doc.body.querySelector('img') !== null;
            
            // Check for answer key markers
            const hasAnswerKey = html.toLowerCase().includes('gabarito') || html.toLowerCase().includes('resposta');
            
            const checklist = [
              `✅ Total de questões encontradas: ${questions.length}`,
              hasHeader ? '✅ Cabeçalho presente' : '⚠️ Cabeçalho não encontrado',
              hasAnswerKey ? '✅ Gabarito/Respostas referenciados' : '⚠️ Gabarito não encontrado no documento',
              `ℹ️ Total de parágrafos: ${elements.length}`,
              `ℹ️ Total de imagens: ${doc.body.querySelectorAll('img').length}`,
              `ℹ️ Total de tabelas: ${doc.body.querySelectorAll('table').length}`,
            ].join('\n');
            
            alert(`📋 Checklist de Revisão\n\n${checklist}`);
          }}
          icon={ListChecks}
          label="Checklist de revisão"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-[7px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all">
              <GaugeCircle className="h-[15px] w-[15px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Marcar Nível de Dificuldade</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<span style="background:#bbf7d0;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">🟢 Fácil</span> ').run()}>
              🟢 Fácil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<span style="background:#fef08a;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">🟡 Médio</span> ').run()}>
              🟡 Médio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<span style="background:#fecaca;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">🔴 Difícil</span> ').run()}>
              🔴 Difícil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Distribuição no Documento</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              const html = editor.getHTML();
              const easy = (html.match(/🟢 Fácil/g) || []).length;
              const medium = (html.match(/🟡 Médio/g) || []).length;
              const hard = (html.match(/🔴 Difícil/g) || []).length;
              const total = easy + medium + hard;
              alert(`📊 Distribuição de Dificuldade\n\n🟢 Fácil: ${easy} (${total ? Math.round(easy/total*100) : 0}%)\n🟡 Médio: ${medium} (${total ? Math.round(medium/total*100) : 0}%)\n🔴 Difícil: ${hard} (${total ? Math.round(hard/total*100) : 0}%)\n\nTotal: ${total} questões marcadas`);
            }}>
              📊 Ver distribuição
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
    </>
  );
}

// ═══════════════════════════════════════════
// Shapes Dropdown Component
// ═══════════════════════════════════════════
const shapeCategories = [
  {
    label: "Linhas",
    shapes: [
      { name: "Linha horizontal", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="50" x2="95" y2="50"/></svg>' },
      { name: "Linha vertical", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><line x1="50" y1="5" x2="50" y2="95"/></svg>' },
      { name: "Linha diagonal ↘", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><line x1="10" y1="10" x2="90" y2="90"/></svg>' },
      { name: "Linha diagonal ↗", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><line x1="10" y1="90" x2="90" y2="10"/></svg>' },
      { name: "Seta →", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="50" x2="85" y2="50"/><polyline points="75,35 90,50 75,65"/></svg>' },
      { name: "Seta dupla ↔", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><line x1="15" y1="50" x2="85" y2="50"/><polyline points="75,35 90,50 75,65"/><polyline points="25,35 10,50 25,65"/></svg>' },
      { name: "Curva", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><path d="M10 80 Q50 10 90 80"/></svg>' },
      { name: "Arco", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><path d="M10 70 A45 45 0 0 1 90 70"/></svg>' },
    ],
  },
  {
    label: "Retângulos",
    shapes: [
      { name: "Retângulo", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="5" y="15" width="90" height="70"/></svg>' },
      { name: "Retângulo arredondado", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="5" y="15" width="90" height="70" rx="12"/></svg>' },
      { name: "Quadrado", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="10" y="10" width="80" height="80"/></svg>' },
      { name: "Quadrado arredondado", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="10" y="10" width="80" height="80" rx="12"/></svg>' },
      { name: "Retângulo preenchido", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><rect x="5" y="15" width="90" height="70"/></svg>' },
      { name: "Quadrado preenchido", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><rect x="10" y="10" width="80" height="80"/></svg>' },
    ],
  },
  {
    label: "Formas Básicas",
    shapes: [
      { name: "Círculo", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><circle cx="50" cy="50" r="44"/></svg>' },
      { name: "Círculo preenchido", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><circle cx="50" cy="50" r="44"/></svg>' },
      { name: "Elipse", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><ellipse cx="50" cy="50" rx="45" ry="30"/></svg>' },
      { name: "Triângulo", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="50,8 95,90 5,90"/></svg>' },
      { name: "Triângulo preenchido", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><polygon points="50,8 95,90 5,90"/></svg>' },
      { name: "Triângulo retângulo", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="5,90 95,90 5,10"/></svg>' },
      { name: "Losango", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="50,5 95,50 50,95 5,50"/></svg>' },
      { name: "Losango preenchido", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><polygon points="50,5 95,50 50,95 5,50"/></svg>' },
      { name: "Pentágono", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="50,5 97,38 79,92 21,92 3,38"/></svg>' },
      { name: "Hexágono", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="50,5 93,27 93,73 50,95 7,73 7,27"/></svg>' },
      { name: "Octógono", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="34,5 66,5 95,34 95,66 66,95 34,95 5,66 5,34"/></svg>' },
      { name: "Cruz", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="35,5 65,5 65,35 95,35 95,65 65,65 65,95 35,95 35,65 5,65 5,35 35,35"/></svg>' },
      { name: "Coração", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><path d="M50 88 C25 65 5 50 5 30 A22 22 0 0 1 50 20 A22 22 0 0 1 95 30 C95 50 75 65 50 88Z"/></svg>' },
      { name: "Lua", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><path d="M60 10 A40 40 0 1 0 60 90 A30 30 0 1 1 60 10Z"/></svg>' },
      { name: "Raio", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><polygon points="60,5 30,48 50,48 25,95 80,45 55,45"/></svg>' },
    ],
  },
  {
    label: "Setas Largas",
    shapes: [
      { name: "Seta direita", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="5,35 60,35 60,15 95,50 60,85 60,65 5,65"/></svg>' },
      { name: "Seta esquerda", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="95,35 40,35 40,15 5,50 40,85 40,65 95,65"/></svg>' },
      { name: "Seta cima", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="35,95 35,40 15,40 50,5 85,40 65,40 65,95"/></svg>' },
      { name: "Seta baixo", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="35,5 35,60 15,60 50,95 85,60 65,60 65,5"/></svg>' },
      { name: "Seta dupla horizontal", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="25,15 25,35 5,50 25,65 25,85 25,65 75,65 75,85 95,50 75,15 75,35 25,35"/></svg>' },
    ],
  },
  {
    label: "Estrelas e Faixas",
    shapes: [
      { name: "Estrela 5 pontas", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><polygon points="50,5 61,38 97,38 68,59 79,93 50,72 21,93 32,59 3,38 39,38"/></svg>' },
      { name: "Estrela 4 pontas", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><polygon points="50,5 60,40 95,50 60,60 50,95 40,60 5,50 40,40"/></svg>' },
      { name: "Estrela 6 pontas", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><polygon points="50,5 60,35 93,20 75,50 93,80 60,65 50,95 40,65 7,80 25,50 7,20 40,35"/></svg>' },
      { name: "Estrela contorno", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="50,5 61,38 97,38 68,59 79,93 50,72 21,93 32,59 3,38 39,38"/></svg>' },
      { name: "Explosão", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><polygon points="50,2 58,25 80,5 68,30 98,25 75,42 100,55 72,55 90,80 62,62 55,98 48,65 15,90 35,58 2,68 30,48 5,25 35,35 20,5 42,28"/></svg>' },
      { name: "Faixa", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 30 L15 30 L15 20 L85 20 L85 30 L95 30 L85 45 L85 80 L15 80 L15 45 Z"/></svg>' },
    ],
  },
  {
    label: "Formas de Equação",
    shapes: [
      { name: "Mais (+)", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><line x1="50" y1="15" x2="50" y2="85"/><line x1="15" y1="50" x2="85" y2="50"/></svg>' },
      { name: "Menos (−)", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><line x1="15" y1="50" x2="85" y2="50"/></svg>' },
      { name: "Multiplicação (×)", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><line x1="20" y1="20" x2="80" y2="80"/><line x1="80" y1="20" x2="20" y2="80"/></svg>' },
      { name: "Igual (=)", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><line x1="15" y1="38" x2="85" y2="38"/><line x1="15" y1="62" x2="85" y2="62"/></svg>' },
      { name: "Chaves {", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><path d="M65 10 Q45 10 45 30 L45 42 Q45 50 35 50 Q45 50 45 58 L45 70 Q45 90 65 90"/></svg>' },
      { name: "Parênteses ()", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><path d="M35 10 Q15 50 35 90"/><path d="M65 10 Q85 50 65 90"/></svg>' },
    ],
  },
  {
    label: "Fluxograma",
    shapes: [
      { name: "Processo", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="5" y="20" width="90" height="60"/></svg>' },
      { name: "Decisão", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="50,5 95,50 50,95 5,50"/></svg>' },
      { name: "Terminal", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="5" y="25" width="90" height="50" rx="25"/></svg>' },
      { name: "Dados", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="20,20 95,20 80,80 5,80"/></svg>' },
      { name: "Documento", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 15 L95 15 L95 75 Q70 65 50 80 Q30 95 5 75 Z"/></svg>' },
      { name: "Preparação", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="20,20 80,20 95,50 80,80 20,80 5,50"/></svg>' },
    ],
  },
];

const shapeColors = [
  { label: "Preto", value: "#000000" },
  { label: "Branco", value: "#ffffff" },
  { label: "Vermelho", value: "#dc2626" },
  { label: "Azul", value: "#2563eb" },
  { label: "Verde", value: "#16a34a" },
  { label: "Laranja", value: "#ea580c" },
  { label: "Roxo", value: "#9333ea" },
  { label: "Cinza", value: "#6b7280" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Nenhum", value: "none" },
];

function ShapesDropdown({ onInsert }: { onInsert: (svg: string, size?: number, fill?: string, stroke?: string, strokeWidth?: number) => void }) {
  const [fillColor, setFillColor] = useState("#000000");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [shapeSize, setShapeSize] = useState(80);
  const [strokeWidth, setStrokeWidth] = useState(3);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Shapes className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[340px] max-h-[500px] overflow-y-auto p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
        {/* Color & size controls */}
        <div className="flex items-center gap-3 px-1 pb-2 border-b border-border mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">Preenchimento:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-5 h-5 rounded border border-border" style={{ background: fillColor === "none" ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px" : fillColor }} title="Cor de preenchimento" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[120px] p-1">
                <div className="grid grid-cols-4 gap-1">
                  {shapeColors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setFillColor(c.value)}
                      title={c.label}
                      className={cn("w-6 h-6 rounded border transition-all", fillColor === c.value ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground")}
                      style={{ background: c.value === "none" ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 6px 6px" : c.value }}
                    />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">Borda:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-5 h-5 rounded border-2" style={{ borderColor: strokeColor === "none" ? "#ccc" : strokeColor, background: "transparent" }} title="Cor da borda" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[120px] p-1">
                <div className="grid grid-cols-4 gap-1">
                  {shapeColors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setStrokeColor(c.value)}
                      title={c.label}
                      className={cn("w-6 h-6 rounded border transition-all", strokeColor === c.value ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground")}
                      style={{ background: c.value === "none" ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 6px 6px" : c.value }}
                    />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 px-1.5 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-input" title="Espessura da borda">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-foreground">
                          <line x1="1" y1="3" x2="15" y2="3" stroke="currentColor" strokeWidth="1"/>
                          <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="2.5"/>
                          <line x1="1" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="4"/>
                        </svg>
                        <span className="text-[10px] font-medium">{strokeWidth}px</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[100px] p-1">
                      <DropdownMenuLabel className="text-[10px]">Espessura</DropdownMenuLabel>
                      {[1, 2, 3, 4, 5, 6, 8].map((w) => (
                        <DropdownMenuItem
                          key={w}
                          onClick={() => setStrokeWidth(w)}
                          className={cn("flex items-center gap-2 px-2 py-1.5", strokeWidth === w && "bg-primary/10 text-primary")}
                        >
                          <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
                            <line x1="0" y1="6" x2="40" y2="6" stroke="currentColor" strokeWidth={w}/>
                          </svg>
                          <span className="text-[10px]">{w}px</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">Espessura da borda</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-medium">Tam:</span>
            <select
              value={shapeSize}
              onChange={(e) => setShapeSize(Number(e.target.value))}
              className="text-[10px] bg-background border border-input rounded px-1 py-0.5"
            >
              <option value={40}>40px</option>
              <option value={60}>60px</option>
              <option value={80}>80px</option>
              <option value={120}>120px</option>
              <option value={160}>160px</option>
              <option value={200}>200px</option>
            </select>
          </div>
        </div>

        {shapeCategories.map((cat) => (
          <div key={cat.label}>
            <p className="text-[10px] font-semibold text-muted-foreground px-1 pt-2 pb-1">{cat.label}</p>
            <div className="grid grid-cols-8 gap-0.5">
              {cat.shapes.map((shape) => (
                <Tooltip key={shape.name}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onInsert(shape.svg, shapeSize, fillColor, strokeColor, strokeWidth)}
                      className="w-8 h-8 p-1 rounded hover:bg-muted border border-transparent hover:border-border transition-colors flex items-center justify-center text-foreground"
                      dangerouslySetInnerHTML={{ __html: shape.svg.replace('<svg ', '<svg class="w-5 h-5" ') }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">{shape.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
        <DropdownMenuSeparator />
        <p className="text-[10px] text-muted-foreground px-1 py-1">Selecione cores e tamanho antes de inserir. Use a aba "Formato de Imagem" para rotacionar.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════
// Table Dropdown Component
// ═══════════════════════════════════════════
function TableDropdown({ editor }: { editor: Editor }) {
  const [hoverR, setHoverR] = useState(0);
  const [hoverC, setHoverC] = useState(0);
  const maxR = 8, maxC = 8;

  const tableTemplates = [
    { label: "Lista simples", rows: 5, cols: 2, header: true, desc: "2 colunas, 5 linhas" },
    { label: "Tabela de dados", rows: 4, cols: 4, header: true, desc: "4×4 com cabeçalho" },
    { label: "Grade de notas", rows: 6, cols: 5, header: true, desc: "Alunos × Atividades" },
    { label: "Comparação", rows: 3, cols: 3, header: true, desc: "3 colunas comparativas" },
    { label: "Tabela extensa", rows: 10, cols: 6, header: true, desc: "10 linhas × 6 colunas" },
    { label: "Cronograma", rows: 5, cols: 7, header: true, desc: "Dias da semana" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Table className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px] p-2">
        <DropdownMenuLabel className="text-[10px] pb-1">Selecione o tamanho</DropdownMenuLabel>
        <div className="grid gap-[2px] mb-2 mx-auto w-fit" style={{ gridTemplateColumns: `repeat(${maxC}, 1fr)` }}>
          {Array.from({ length: maxR * maxC }).map((_, i) => {
            const r = Math.floor(i / maxC) + 1;
            const c = (i % maxC) + 1;
            return (
              <button
                key={i}
                className={cn(
                  "w-5 h-5 border rounded-[2px] transition-colors",
                  r <= hoverR && c <= hoverC
                    ? "bg-primary/20 border-primary/50"
                    : "bg-muted/30 border-border hover:border-muted-foreground/30"
                )}
                onMouseEnter={() => { setHoverR(r); setHoverC(c); }}
                onMouseLeave={() => { setHoverR(0); setHoverC(0); }}
                onClick={() => editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run()}
              />
            );
          })}
        </div>
        {hoverR > 0 && (
          <p className="text-[10px] text-center text-muted-foreground mb-2">{hoverR} × {hoverC}</p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] pt-1">Modelos de tabela</DropdownMenuLabel>
        {tableTemplates.map((t) => (
          <DropdownMenuItem
            key={t.label}
            onClick={() => editor.chain().focus().insertTable({ rows: t.rows, cols: t.cols, withHeaderRow: t.header }).run()}
            className="flex flex-col items-start gap-0"
          >
            <span className="text-xs font-medium">{t.label}</span>
            <span className="text-[10px] text-muted-foreground">{t.desc}</span>
          </DropdownMenuItem>
        ))}
        {editor.isActive("table") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px]">Editar tabela</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <Columns3 className="h-3.5 w-3.5 mr-2" />
              <span className="text-xs">Adicionar coluna</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
              <RowsIcon className="h-3.5 w-3.5 mr-2" />
              <span className="text-xs">Adicionar linha</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
              <Columns3 className="h-3.5 w-3.5 mr-2 text-destructive" />
              <span className="text-xs text-destructive">Remover coluna</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
              <RowsIcon className="h-3.5 w-3.5 mr-2 text-destructive" />
              <span className="text-xs text-destructive">Remover linha</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()}>
              <Trash2 className="h-3.5 w-3.5 mr-2 text-destructive" />
              <span className="text-xs text-destructive">Excluir tabela</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════
// Charts Dropdown
// ═══════════════════════════════════════════
function ChartsDropdown({ editor }: { editor: Editor }) {
  const charts = [
    {
      label: "Gráfico de Barras",
      icon: "📊",
      svg: '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="80" width="25" height="30" fill="#3b82f6" rx="2"/><rect x="45" y="50" width="25" height="60" fill="#3b82f6" rx="2"/><rect x="80" y="30" width="25" height="80" fill="#3b82f6" rx="2"/><rect x="115" y="60" width="25" height="50" fill="#3b82f6" rx="2"/><rect x="150" y="40" width="25" height="70" fill="#3b82f6" rx="2"/><line x1="5" y1="110" x2="185" y2="110" stroke="#666" stroke-width="1.5"/><line x1="5" y1="10" x2="5" y2="110" stroke="#666" stroke-width="1.5"/></svg>',
    },
    {
      label: "Gráfico de Barras Horizontal",
      icon: "📊",
      svg: '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="10" width="80" height="16" fill="#10b981" rx="2"/><rect x="30" y="32" width="130" height="16" fill="#10b981" rx="2"/><rect x="30" y="54" width="100" height="16" fill="#10b981" rx="2"/><rect x="30" y="76" width="150" height="16" fill="#10b981" rx="2"/><rect x="30" y="98" width="60" height="16" fill="#10b981" rx="2"/><line x1="30" y1="5" x2="30" y2="118" stroke="#666" stroke-width="1.5"/></svg>',
    },
    {
      label: "Gráfico de Linhas",
      icon: "📈",
      svg: '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><polyline points="10,90 45,60 80,70 115,30 150,45 185,20" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="90" r="3" fill="#8b5cf6"/><circle cx="45" cy="60" r="3" fill="#8b5cf6"/><circle cx="80" cy="70" r="3" fill="#8b5cf6"/><circle cx="115" cy="30" r="3" fill="#8b5cf6"/><circle cx="150" cy="45" r="3" fill="#8b5cf6"/><circle cx="185" cy="20" r="3" fill="#8b5cf6"/><line x1="5" y1="110" x2="195" y2="110" stroke="#666" stroke-width="1"/><line x1="5" y1="10" x2="5" y2="110" stroke="#666" stroke-width="1"/></svg>',
    },
    {
      label: "Gráfico de Pizza",
      icon: "🥧",
      svg: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="50" fill="#e2e8f0"/><path d="M60 60 L60 10 A50 50 0 0 1 103 85 Z" fill="#3b82f6"/><path d="M60 60 L103 85 A50 50 0 0 1 17 85 Z" fill="#10b981"/><path d="M60 60 L17 85 A50 50 0 0 1 60 10 Z" fill="#f59e0b"/></svg>',
    },
    {
      label: "Gráfico de Rosca",
      icon: "🍩",
      svg: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" stroke-width="20" stroke-dasharray="100 214" stroke-dashoffset="0"/><circle cx="60" cy="60" r="50" fill="none" stroke="#10b981" stroke-width="20" stroke-dasharray="80 234" stroke-dashoffset="-100"/><circle cx="60" cy="60" r="50" fill="none" stroke="#f59e0b" stroke-width="20" stroke-dasharray="70 244" stroke-dashoffset="-180"/><circle cx="60" cy="60" r="50" fill="none" stroke="#ef4444" stroke-width="20" stroke-dasharray="64 250" stroke-dashoffset="-250"/></svg>',
    },
    {
      label: "Gráfico de Área",
      icon: "📉",
      svg: '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><polygon points="10,100 10,80 50,55 90,65 130,30 170,40 190,20 190,100" fill="#3b82f6" opacity="0.25"/><polyline points="10,80 50,55 90,65 130,30 170,40 190,20" fill="none" stroke="#3b82f6" stroke-width="2"/><line x1="5" y1="100" x2="195" y2="100" stroke="#666" stroke-width="1"/></svg>',
    },
    {
      label: "Gráfico de Dispersão",
      icon: "⚬",
      svg: '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="80" r="5" fill="#ef4444"/><circle cx="55" cy="55" r="5" fill="#ef4444"/><circle cx="80" cy="70" r="5" fill="#ef4444"/><circle cx="100" cy="40" r="5" fill="#ef4444"/><circle cx="130" cy="50" r="5" fill="#ef4444"/><circle cx="150" cy="25" r="5" fill="#ef4444"/><circle cx="170" cy="35" r="5" fill="#ef4444"/><line x1="10" y1="105" x2="190" y2="105" stroke="#666" stroke-width="1"/><line x1="10" y1="10" x2="10" y2="105" stroke="#666" stroke-width="1"/></svg>',
    },
    {
      label: "Espaço para gráfico",
      icon: "📐",
      svg: '',
    },
  ];

  const insertChart = (chart: typeof charts[0]) => {
    if (!chart.svg) {
      editor.chain().focus().insertContent(
        '<p style="text-align:center;padding:30px 20px;border:2px dashed currentColor;border-radius:8px;opacity:0.5;margin:8px 0;">📊 [Espaço reservado para gráfico]</p>'
      ).run();
      return;
    }
    const chartType = chartTypeMap[chart.label] || "bar";
    const data = getDefaultChartData(chartType);
    const src = chartDataToImageSrc(data, 400, 260);
    const alt = serializeChartData(data);
    (editor.commands as any).setImage({ src, alt, customWidth: 400, customHeight: 260 });
  };

  const chartTypeMap: Record<string, ChartData["type"]> = {
    "Gráfico de Barras": "bar",
    "Gráfico de Barras Horizontal": "bar_h",
    "Gráfico de Linhas": "line",
    "Gráfico de Pizza": "pie",
    "Gráfico de Rosca": "pie",
    "Gráfico de Área": "area",
    "Gráfico de Dispersão": "scatter",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <BarChart3 className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px] p-2">
        <DropdownMenuLabel className="text-[10px]">Inserir gráfico</DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {charts.map((chart) => (
            <button
              key={chart.label}
              onClick={() => insertChart(chart)}
              className="flex flex-col items-center gap-1 p-2 rounded-md border border-transparent hover:border-border hover:bg-muted/50 transition-colors"
            >
              {chart.svg ? (
                <div
                  className="w-full h-14 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: chart.svg.replace('<svg ', '<svg class="w-full h-full" ') }}
                />
              ) : (
                <div className="w-full h-14 flex items-center justify-center text-2xl opacity-50">📐</div>
              )}
              <span className="text-[10px] text-muted-foreground font-medium leading-tight text-center">{chart.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground px-1 pt-2">Gráficos são inseridos como imagem. Use a aba "Formato de Imagem" para redimensionar.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════
// Icons/Emoji Dropdown
// ═══════════════════════════════════════════
const iconCategories = [
  {
    label: "Educação",
    icons: ["📚", "📖", "📝", "✏️", "🎓", "📐", "📏", "🔬", "🔭", "🧪", "🧮", "🗂️", "📋", "📎", "🖊️", "🖋️"],
  },
  {
    label: "Símbolos",
    icons: ["✅", "❌", "⚠️", "ℹ️", "❓", "❗", "💡", "⭐", "🔑", "🎯", "🏆", "🔔", "📌", "🔗", "💬", "📢"],
  },
  {
    label: "Setas & Indicadores",
    icons: ["➡️", "⬅️", "⬆️", "⬇️", "↩️", "↪️", "🔄", "▶️", "◀️", "🔼", "🔽", "⏩", "⏪", "☑️", "🔲", "🔳"],
  },
  {
    label: "Números",
    icons: ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "Ⓐ", "Ⓑ", "Ⓒ", "Ⓓ", "Ⓔ", "Ⓕ"],
  },
  {
    label: "Ciências",
    icons: ["⚛️", "🧬", "🌡️", "💊", "🦠", "🌍", "🌙", "☀️", "⚡", "🔥", "💧", "🌿", "🧲", "🔋", "⚙️", "🛠️"],
  },
  {
    label: "Expressões",
    icons: ["😊", "🤔", "😮", "👍", "👎", "👏", "🙋", "✋", "👁️", "💪", "🤝", "🎉", "🎵", "❤️", "🧠", "👤"],
  },
];

function IconsDropdown({ editor }: { editor: Editor }) {
  const [search, setSearch] = useState("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Smile className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px] max-h-[400px] overflow-y-auto p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            placeholder="Buscar ícone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs rounded border border-input bg-background focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        {iconCategories.map((cat) => {
          const filtered = search ? cat.icons.filter(() => cat.label.toLowerCase().includes(search.toLowerCase())) : cat.icons;
          if (filtered.length === 0) return null;
          return (
            <div key={cat.label}>
              <p className="text-[10px] font-semibold text-muted-foreground px-1 pt-1.5 pb-1">{cat.label}</p>
              <div className="grid grid-cols-8 gap-0.5">
                {filtered.map((icon, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => editor.chain().focus().insertContent(icon).run()}
                        className="w-8 h-8 rounded hover:bg-muted border border-transparent hover:border-border transition-colors flex items-center justify-center text-base"
                      >
                        {icon}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px]">{icon}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════
// TAB: Inserir
// ═══════════════════════════════════════════
function InsertTab({ editor, addImage, addImageFromUrl, addTable, insertFormula, showComments, onToggleComments }: {
  editor: Editor; addImage: () => void; addImageFromUrl: () => void;
  addTable: () => void; insertFormula: () => void; showComments?: boolean; onToggleComments?: () => void;
}) {
  const [showEquationPanel, setShowEquationPanel] = useState(false);
  const [showWordArt, setShowWordArt] = useState(false);
  const [headersList, setHeadersList] = useState<{ id: string; name: string; file_url: string; segment: string | null; grade: string | null }[]>([]);
  const [docsList, setDocsList] = useState<{ id: string; name: string; file_url: string; category: string | null }[]>([]);
  const [loadedTemplates, setLoadedTemplates] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (loadedTemplates) return;
    setLoadedTemplates(true);
    const [hRes, dRes] = await Promise.all([
      supabase.from("template_headers").select("id, name, file_url, segment, grade").order("created_at", { ascending: false }),
      supabase.from("template_documents").select("id, name, file_url, category").order("created_at", { ascending: false }),
    ]);
    if (hRes.data) setHeadersList(hRes.data);
    if (dRes.data) setDocsList(dRes.data);
  }, [loadedTemplates]);

  const insertHeaderImage = (url: string) => {
    (editor.commands as any).setImage({ src: url });
  };

  const insertDocTemplate = async (url: string) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      editor.commands.setContent(result.value);
    } catch {
      // fallback: just notify
      alert("Não foi possível carregar o modelo. Tente fazer o download manualmente.");
    }
  };

  const handleInsertEquation = (formula: string, display?: boolean) => {
    (editor.commands as any).insertFormula({ formula, display: display || false });
    setShowEquationPanel(false);
  };

  const insertShapeSvg = (svgContent: string, defaultSize = 80, fillColor = "#000000", strokeColor = "#000000", strokeWidth = 3) => {
    let svg = svgContent
      .replace(/fill="currentColor"/g, `fill="${fillColor}"`)
      .replace(/stroke="currentColor"/g, `stroke="${strokeColor}"`)
      .replace(/stroke-width="\d+"/g, `stroke-width="${strokeWidth}"`);
    if (!svg.includes('xmlns=')) {
      svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }
    svg = svg.replace('<svg ', `<svg width="${defaultSize}" height="${defaultSize}" `);
    const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    (editor.commands as any).setImage({ src: dataUri, alt: "Forma", customWidth: defaultSize, customHeight: defaultSize });
  };

  const insertSymbol = () => {
    const symbols = ['α', 'β', 'γ', 'δ', 'π', 'Σ', 'Ω', '∞', '√', '≠', '≤', '≥', '±', '÷', '×', '°', '©', '®', '™', '€', '£', '¥', '¢', '†', '‡', '§', '¶', '•'];
    const choice = prompt(`Símbolos disponíveis:\n${symbols.join('  ')}\n\nDigite o símbolo desejado:`);
    if (choice) editor.chain().focus().insertContent(choice).run();
  };

  const insertWordArt = (html: string) => {
    editor.chain().focus().insertContent(html).run();
  };

  const insertHeader = () => {
    const text = prompt("Texto do cabeçalho:", "Cabeçalho do Documento");
    if (text) {
      let style = document.querySelector('#editor-header-style') as HTMLStyleElement;
      if (!style) { style = document.createElement('style'); style.id = 'editor-header-style'; document.head.appendChild(style); }
      style.textContent = `.exam-page::before { content: '${text}'; display: block; text-align: center; font-size: 10px; color: hsl(var(--muted-foreground)); border-bottom: 1px solid hsl(var(--border)); padding-bottom: 8px; margin-bottom: 16px; }`;
    }
  };

  const insertFooter = () => {
    const text = prompt("Texto do rodapé:", "Rodapé do Documento");
    if (text) {
      let style = document.querySelector('#editor-footer-style') as HTMLStyleElement;
      if (!style) { style = document.createElement('style'); style.id = 'editor-footer-style'; document.head.appendChild(style); }
      style.textContent = `.exam-page::after { content: '${text}'; display: block; text-align: center; font-size: 10px; color: hsl(var(--muted-foreground)); border-top: 1px solid hsl(var(--border)); padding-top: 8px; margin-top: 16px; }`;
    }
  };

  const insertTextBox = () => {
    editor.chain().focus().insertContent(
      `<p style="border: 1px solid currentColor; padding: 12px; margin: 8px 0; border-radius: 4px;">Caixa de texto — edite aqui</p>`
    ).run();
  };

  return (
    <>
      <RibbonGroup label="Imagem">
        <RibbonBtn onClick={addImage} icon={ImagePlus} label="Upload do computador" size="lg" />
        <RibbonBtn onClick={addImageFromUrl} icon={LinkIcon} label="URL da imagem" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Tabela">
        <TableDropdown editor={editor} />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Formas">
        <ShapesDropdown onInsert={insertShapeSvg} />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Gráficos">
        <ChartsDropdown editor={editor} />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Ícones">
        <IconsDropdown editor={editor} />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Cabeçalho / Rodapé / Páginas">
        <DropdownMenu onOpenChange={(open) => { if (open) loadTemplates(); }}>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <PanelTop className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px] max-h-[300px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Cabeçalhos cadastrados</DropdownMenuLabel>
            {headersList.length === 0 && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum cabeçalho cadastrado</DropdownMenuItem>
            )}
            {headersList.map((h) => (
              <DropdownMenuItem key={h.id} onClick={() => insertHeaderImage(h.file_url)} className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-medium">{h.name}</span>
                {(h.segment || h.grade) && (
                  <span className="text-[10px] text-muted-foreground">{[h.segment, h.grade].filter(Boolean).join(" • ")}</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={insertHeader} className="text-xs">
              <PanelTop className="h-3.5 w-3.5 mr-2" />Cabeçalho de texto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <RibbonBtn onClick={insertFooter} icon={PanelBottom} label="Rodapé" />
        <RibbonBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={FileUp} label="Quebra de página" />
        <RibbonBtn onClick={() => {
          editor.chain().focus().command(({ tr, dispatch }) => {
            if (dispatch) {
              const endPos = tr.doc.content.size;
              tr.insert(endPos - 1, editor.schema.nodes.horizontalRule.create());
              tr.insert(endPos, editor.schema.nodes.paragraph.create());
            }
            return true;
          }).run();
        }} icon={FilePlus} label="Página em branco" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Modelos">
        <DropdownMenu onOpenChange={(open) => { if (open) loadTemplates(); }}>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <FileText className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px] max-h-[350px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Cabeçalhos de prova</DropdownMenuLabel>
            {headersList.length === 0 && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum cabeçalho cadastrado</DropdownMenuItem>
            )}
            {headersList.map((h) => (
              <DropdownMenuItem key={h.id} onClick={() => insertHeaderImage(h.file_url)} className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-medium">{h.name}</span>
                {(h.segment || h.grade) && (
                  <span className="text-[10px] text-muted-foreground">{[h.segment, h.grade].filter(Boolean).join(" • ")}</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Modelos de prova (.docx)</DropdownMenuLabel>
            {docsList.length === 0 && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum modelo cadastrado</DropdownMenuItem>
            )}
            {docsList.map((d) => (
              <DropdownMenuItem key={d.id} onClick={() => insertDocTemplate(d.file_url)} className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-medium">{d.name}</span>
                {d.category && <span className="text-[10px] text-muted-foreground">{d.category}</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Plano de Fundo da Página">
        <WatermarkDropdown editor={editor} />
        <PageColorDropdown editor={editor} />
        <PageBorderDropdown editor={editor} />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Texto">
        <RibbonBtn onClick={insertTextBox} icon={TextCursorInput} label="Caixa de texto" />
        <RibbonBtn onClick={() => setShowWordArt(true)} icon={Sparkles} label="WordArt" />
      </RibbonGroup>
      <WordArtDialog open={showWordArt} onOpenChange={setShowWordArt} onInsert={insertWordArt} />
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Equações / Símbolos">
        <div className="relative">
          <RibbonBtn onClick={() => setShowEquationPanel(!showEquationPanel)} active={showEquationPanel} icon={Sigma} label="Equações" size="lg" />
          {showEquationPanel && (
            <EquationPanel
              onInsert={handleInsertEquation}
              onClose={() => setShowEquationPanel(false)}
            />
          )}
        </div>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Separadores">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Separadores Estilizados</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              ─── Linha simples
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="text-align:center;border-top:2px dashed currentColor;margin:16px 0;padding:0;"></p>').run()}>
              - - - Linha tracejada
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="text-align:center;border-top:2px dotted currentColor;margin:16px 0;padding:0;"></p>').run()}>
              ··· Linha pontilhada
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="text-align:center;border-top:3px double currentColor;margin:16px 0;padding:0;"></p>').run()}>
              ═══ Linha dupla
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="text-align:center;margin:12px 0;font-size:14px;letter-spacing:8px;opacity:0.4;">✦ ✦ ✦</p>').run()}>
              ✦ ✦ ✦ Ornamental
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Questões">
        <RibbonBtn
          onClick={() => {
            // Numeração automática: conta questões existentes e insere a próxima
            const html = editor.getHTML();
            const questionRegex = /(?:^|\>)\s*(\d+)[\.\)\-]/g;
            let maxNum = 0;
            let m;
            while ((m = questionRegex.exec(html)) !== null) {
              const n = parseInt(m[1]);
              if (n > maxNum) maxNum = n;
            }
            const nextNum = maxNum + 1;
            editor.chain().focus().insertContent(`<p><strong>${nextNum}.</strong> </p>`).run();
          }}
          icon={Hash}
          label="Inserir questão numerada"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <MinusIcon className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuLabel className="text-xs">Espaço para Resposta</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              const lines = Array.from({length: 3}, () => '<p style="border-bottom:1px solid currentColor;min-height:28px;margin:4px 0;"></p>').join('');
              editor.chain().focus().insertContent(lines).run();
            }}>📝 3 linhas pautadas</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const lines = Array.from({length: 5}, () => '<p style="border-bottom:1px solid currentColor;min-height:28px;margin:4px 0;"></p>').join('');
              editor.chain().focus().insertContent(lines).run();
            }}>📝 5 linhas pautadas</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const lines = Array.from({length: 10}, () => '<p style="border-bottom:1px solid currentColor;min-height:28px;margin:4px 0;"></p>').join('');
              editor.chain().focus().insertContent(lines).run();
            }}>📝 10 linhas pautadas</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              editor.chain().focus().insertContent('<p style="border:1px solid currentColor;min-height:120px;margin:8px 0;border-radius:4px;padding:8px;"></p>').run();
            }}>📦 Caixa para resposta (pequena)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              editor.chain().focus().insertContent('<p style="border:1px solid currentColor;min-height:240px;margin:8px 0;border-radius:4px;padding:8px;"></p>').run();
            }}>📦 Caixa para resposta (grande)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const n = prompt("Quantas linhas?", "5");
              if (n && parseInt(n) > 0) {
                const lines = Array.from({length: parseInt(n)}, () => '<p style="border-bottom:1px solid currentColor;min-height:28px;margin:4px 0;"></p>').join('');
                editor.chain().focus().insertContent(lines).run();
              }
            }}>✏️ Personalizado...</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Recorte">
        <RibbonBtn
          onClick={() => {
            editor.chain().focus().insertContent(
              '<p style="text-align:center;border-top:2px dashed currentColor;margin:20px 0 8px;padding-top:4px;font-size:11px;opacity:0.5;">✂️ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ✂️</p>'
            ).run();
          }}
          icon={Scissors}
          label="Linha de recorte (destacável)"
        />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Link / Comentário">
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <LinkIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-72 p-3">
            <LinkPopoverContent editor={editor} />
          </PopoverContent>
        </Popover>
        <RibbonBtn onClick={() => onToggleComments?.()} active={showComments} icon={MessageSquareText} label="Comentários" />
      </RibbonGroup>
    </>
  );
}

// ─── Watermark Dropdown ───
function WatermarkDropdown({ editor }: { editor: Editor }) {
  const watermarks = [
    { label: "RASCUNHO", value: "RASCUNHO" },
    { label: "CONFIDENCIAL", value: "CONFIDENCIAL" },
    { label: "CÓPIA", value: "CÓPIA" },
    { label: "AMOSTRA", value: "AMOSTRA" },
    { label: "NÃO COPIAR", value: "NÃO COPIAR" },
    { label: "URGENTE", value: "URGENTE" },
  ];

  const applyWatermark = (text: string) => {
    let style = document.querySelector('#editor-watermark-style') as HTMLStyleElement;
    if (!style) { style = document.createElement('style'); style.id = 'editor-watermark-style'; document.head.appendChild(style); }
    style.textContent = `.exam-page { position: relative; } .exam-page::before { content: '${text}'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: bold; color: rgba(0,0,0,0.06); pointer-events: none; z-index: 0; white-space: nowrap; }`;
  };

  const removeWatermark = () => {
    const style = document.querySelector('#editor-watermark-style') as HTMLStyleElement;
    if (style) style.remove();
  };

  const customWatermark = () => {
    const text = prompt("Texto da marca d'água:");
    if (text) applyWatermark(text);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex flex-col items-center gap-0.5">
          <FileText className="h-4 w-4" />
          <span className="text-[8px] leading-none">Marca-d'água</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuLabel className="text-xs">Marca-d'água</DropdownMenuLabel>
        {watermarks.map((w) => (
          <DropdownMenuItem key={w.value} onClick={() => applyWatermark(w.value)} className="text-xs">
            {w.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={customWatermark} className="text-xs">Personalizada...</DropdownMenuItem>
        <DropdownMenuItem onClick={removeWatermark} className="text-xs text-destructive">Remover marca-d'água</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Page Color Dropdown ───
function PageColorDropdown({ editor }: { editor: Editor }) {
  const pageColors = [
    { label: "Branco", value: "#ffffff" },
    { label: "Creme", value: "#fdf6e3" },
    { label: "Azul claro", value: "#eff6ff" },
    { label: "Verde claro", value: "#f0fdf4" },
    { label: "Rosa claro", value: "#fdf2f8" },
    { label: "Cinza claro", value: "#f9fafb" },
    { label: "Amarelo claro", value: "#fefce8" },
    { label: "Lavanda", value: "#f5f3ff" },
  ];

  const applyPageColor = (color: string) => {
    const page = document.querySelector('.exam-page') as HTMLElement;
    if (page) page.style.backgroundColor = color;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex flex-col items-center gap-0.5">
          <Palette className="h-4 w-4" />
          <span className="text-[8px] leading-none">Cor da Página</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        <DropdownMenuLabel className="text-xs">Cor de fundo</DropdownMenuLabel>
        {pageColors.map((c) => (
          <DropdownMenuItem key={c.value} onClick={() => applyPageColor(c.value)} className="text-xs flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: c.value }} />
            {c.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => applyPageColor("#ffffff")} className="text-xs">Sem cor (Branco)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Page Border Dropdown ───
function PageBorderDropdown({ editor }: { editor: Editor }) {
  const [borderInset, setBorderInset] = useState(5);
  const [activeBorderStyle, setActiveBorderStyle] = useState("none");
  const [borderColor, setBorderColor] = useState("#333333");

  const borderStyles = [
    { label: "Nenhuma", style: "none" },
    { label: "Simples fina", style: "1px solid" },
    { label: "Simples média", style: "2px solid" },
    { label: "Simples grossa", style: "3px solid" },
    { label: "Dupla", style: "4px double" },
    { label: "Pontilhada", style: "2px dashed" },
    { label: "Tracejada", style: "2px dotted" },
    { label: "Decorativa", style: "3px ridge" },
  ];

  const presetColors = [
    "#000000", "#333333", "#666666", "#999999",
    "#1a3c6e", "#2563eb", "#0891b2", "#059669",
    "#dc2626", "#ea580c", "#ca8a04", "#7c3aed",
  ];

  const buildBorderValue = (style: string, color: string) => {
    if (style === "none") return "none";
    return `${style} ${color}`;
  };

  const applyBorderWithInset = (border: string, insetMm: number) => {
    const page = document.querySelector('.exam-page') as HTMLElement;
    if (!page) return;

    let overlay = page.querySelector('.page-border-overlay') as HTMLElement;
    if (border === "none") {
      if (overlay) overlay.remove();
      page.style.border = "none";
      return;
    }

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'page-border-overlay';
      overlay.style.position = 'absolute';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '1';
      overlay.style.boxSizing = 'border-box';
      page.style.position = 'relative';
      page.insertBefore(overlay, page.firstChild);
    }

    overlay.style.top = `${insetMm}mm`;
    overlay.style.left = `${insetMm}mm`;
    overlay.style.right = `${insetMm}mm`;
    overlay.style.bottom = `${insetMm}mm`;
    overlay.style.border = border;
    page.style.border = "none";
  };

  const handleSelectStyle = (style: string) => {
    setActiveBorderStyle(style);
    applyBorderWithInset(buildBorderValue(style, borderColor), borderInset);
  };

  const handleColorChange = (color: string) => {
    setBorderColor(color);
    if (activeBorderStyle !== "none") {
      applyBorderWithInset(buildBorderValue(activeBorderStyle, color), borderInset);
    }
  };

  const handleInsetChange = (value: number[]) => {
    const mm = value[0];
    setBorderInset(mm);
    if (activeBorderStyle !== "none") {
      applyBorderWithInset(buildBorderValue(activeBorderStyle, borderColor), mm);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex flex-col items-center gap-0.5">
          <Square className="h-4 w-4" />
          <span className="text-[8px] leading-none">Bordas</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px]">
        <DropdownMenuLabel className="text-xs">Estilo da Borda</DropdownMenuLabel>
        {borderStyles.map((b) => (
          <DropdownMenuItem key={b.label} onClick={() => handleSelectStyle(b.style)} className="text-xs flex items-center gap-2">
            {b.style !== "none" ? (
              <div className="w-6 h-4 rounded-sm" style={{ border: `${b.style} ${borderColor}` }} />
            ) : (
              <div className="w-6 h-4" />
            )}
            {b.label}
            {activeBorderStyle === b.style && <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-3 py-2 space-y-2">
          <span className="text-[10px] font-medium text-muted-foreground">Cor da Borda</span>
          <div className="grid grid-cols-6 gap-1">
            {presetColors.map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className={`w-5 h-5 rounded-sm border transition-all ${borderColor === c ? 'ring-2 ring-primary ring-offset-1' : 'border-border hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <label className="text-[10px] text-muted-foreground">Personalizada:</label>
            <input
              type="color"
              value={borderColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-border"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{borderColor}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">Sangria (margem interna)</span>
            <span className="text-[10px] font-semibold text-foreground">{borderInset}mm</span>
          </div>
          <Slider
            value={[borderInset]}
            onValueChange={handleInsetChange}
            min={0}
            max={20}
            step={1}
            className="w-full"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Link Popover Content ───
function LinkPopoverContent({ editor }: { editor: Editor }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    if (selectedText) setText(selectedText);
    const linkMark = editor.getAttributes("link");
    if (linkMark?.href) setUrl(linkMark.href);
  }, [editor]);

  const handleInsert = () => {
    if (!url.trim()) return;
    const finalUrl = url.startsWith("http") ? url : `https://${url}`;
    if (text.trim()) {
      editor.chain().focus().insertContent(`<a href="${finalUrl}" target="_blank">${text}</a>`).run();
    } else {
      editor.chain().focus().setMark("link", { href: finalUrl, target: "_blank" }).run();
    }
  };

  const handleRemove = () => {
    editor.chain().focus().unsetMark("link").run();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <LinkIcon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Inserir Link</span>
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-muted-foreground">Texto a exibir</label>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Texto do link" className="h-8 text-xs" />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-muted-foreground">URL</label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleInsert(); }} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleInsert} disabled={!url.trim()} className="flex-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
          Inserir
        </button>
        <button onClick={handleRemove} className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          Remover
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB: Layout
// ═══════════════════════════════════════════
function LayoutTab({ editor }: { editor: Editor }) {
  const [marginTop, setMarginTop] = useState("50");
  const [marginBottom, setMarginBottom] = useState("50");
  const [marginLeft, setMarginLeft] = useState("60");
  const [marginRight, setMarginRight] = useState("60");

  const applyMargins = (t: string, b: string, l: string, r: string) => {
    setMarginTop(t); setMarginBottom(b); setMarginLeft(l); setMarginRight(r);
    const el = document.querySelector('.tiptap') as HTMLElement;
    if (el) el.style.padding = `${t}px ${r}px ${b}px ${l}px`;
  };

  const applyIndent = (increase: boolean) => {
    const el = document.querySelector('.tiptap') as HTMLElement;
    if (!el) return;
    const current = parseInt(el.style.paddingLeft || "60");
    const next = increase ? current + 20 : Math.max(20, current - 20);
    el.style.paddingLeft = `${next}px`;
    setMarginLeft(String(next));
  };

  const applyLineSpacing = (value: string) => {
    const el = document.querySelector('.tiptap') as HTMLElement;
    if (el) el.style.lineHeight = value;
  };

  const applyParagraphSpacing = (value: string) => {
    const style = document.querySelector('#editor-paragraph-spacing') || document.createElement('style');
    style.id = 'editor-paragraph-spacing';
    style.textContent = `.tiptap p { margin-bottom: ${value}; } .tiptap h1, .tiptap h2, .tiptap h3 { margin-bottom: ${value}; }`;
    if (!style.parentNode) document.head.appendChild(style);
  };

  return (
    <>
      <RibbonGroup label="Margens">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Ruler className="h-4 w-4" /><span>Margens</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Predefinições</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => applyMargins("50", "50", "60", "60")}>Normal (2,5 cm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMargins("25", "25", "30", "30")}>Estreita (1,27 cm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMargins("72", "72", "72", "72")}>Larga (3,18 cm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMargins("50", "50", "90", "90")}>Moderada</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Personalizar (px)</DropdownMenuLabel>
            <div className="px-2 py-1.5 grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-muted-foreground">Superior</label>
                <input type="number" value={marginTop} onChange={(e) => { setMarginTop(e.target.value); applyMargins(e.target.value, marginBottom, marginLeft, marginRight); }}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground" min={0} max={200} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-muted-foreground">Inferior</label>
                <input type="number" value={marginBottom} onChange={(e) => { setMarginBottom(e.target.value); applyMargins(marginTop, e.target.value, marginLeft, marginRight); }}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground" min={0} max={200} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-muted-foreground">Esquerda</label>
                <input type="number" value={marginLeft} onChange={(e) => { setMarginLeft(e.target.value); applyMargins(marginTop, marginBottom, e.target.value, marginRight); }}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground" min={0} max={200} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-muted-foreground">Direita</label>
                <input type="number" value={marginRight} onChange={(e) => { setMarginRight(e.target.value); applyMargins(marginTop, marginBottom, marginLeft, e.target.value); }}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground" min={0} max={200} />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Orientação">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <LayoutTemplate className="h-4 w-4" /><span>Orientação</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.exam-page') as HTMLElement;
              if (el) { el.style.width = '210mm'; el.style.minHeight = '297mm'; }
            }}>📄 Retrato</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.exam-page') as HTMLElement;
              if (el) { el.style.width = '297mm'; el.style.minHeight = '210mm'; }
            }}>📄 Paisagem</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Tamanho">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Settings2 className="h-4 w-4" /><span>Papel</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">Tamanho do papel</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.exam-page') as HTMLElement;
              if (el) { el.style.width = '210mm'; el.style.minHeight = '297mm'; }
            }}>A4 (210 × 297 mm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.exam-page') as HTMLElement;
              if (el) { el.style.width = '216mm'; el.style.minHeight = '279mm'; }
            }}>Carta (216 × 279 mm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.exam-page') as HTMLElement;
              if (el) { el.style.width = '216mm'; el.style.minHeight = '356mm'; }
            }}>Ofício (216 × 356 mm)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Colunas">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Columns3 className="h-4 w-4" /><span>Colunas</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs">Número de colunas</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.tiptap') as HTMLElement;
              if (el) { el.style.columnCount = '1'; el.style.columnGap = '0'; el.style.columnRule = 'none'; }
            }}>
              <div className="flex items-center gap-2"><div className="flex gap-0.5"><div className="w-8 h-5 bg-muted-foreground/20 rounded-sm" /></div><span>1 Coluna</span></div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.tiptap') as HTMLElement;
              if (el) { el.style.columnCount = '2'; el.style.columnGap = '24px'; el.style.columnRule = '1px solid hsl(var(--border))'; }
            }}>
              <div className="flex items-center gap-2"><div className="flex gap-0.5"><div className="w-3.5 h-5 bg-muted-foreground/20 rounded-sm" /><div className="w-3.5 h-5 bg-muted-foreground/20 rounded-sm" /></div><span>2 Colunas</span></div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.tiptap') as HTMLElement;
              if (el) { el.style.columnCount = '3'; el.style.columnGap = '20px'; el.style.columnRule = '1px solid hsl(var(--border))'; }
            }}>
              <div className="flex items-center gap-2"><div className="flex gap-0.5"><div className="w-2.5 h-5 bg-muted-foreground/20 rounded-sm" /><div className="w-2.5 h-5 bg-muted-foreground/20 rounded-sm" /><div className="w-2.5 h-5 bg-muted-foreground/20 rounded-sm" /></div><span>3 Colunas</span></div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonGroup label="Recuo">
        <RibbonBtn onClick={() => applyIndent(true)} icon={IndentIncrease} label="Aumentar recuo" />
        <RibbonBtn onClick={() => applyIndent(false)} icon={IndentDecrease} label="Diminuir recuo" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Espaçamento">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <ArrowUpDown className="h-4 w-4" /><span>Linhas</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuLabel className="text-xs">Espaçamento entre linhas</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => applyLineSpacing("1")}>Simples (1.0)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyLineSpacing("1.15")}>1.15</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyLineSpacing("1.5")}>1.5</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyLineSpacing("1.7")}>1.7 (Padrão)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyLineSpacing("2")}>Duplo (2.0)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyLineSpacing("2.5")}>2.5</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyLineSpacing("3")}>Triplo (3.0)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Pilcrow className="h-4 w-4" /><span>Parágrafos</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">Espaço entre parágrafos</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => applyParagraphSpacing("0")}>Nenhum</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyParagraphSpacing("0.3rem")}>Pequeno (Padrão)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyParagraphSpacing("0.6rem")}>Médio</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyParagraphSpacing("1rem")}>Grande</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyParagraphSpacing("1.5rem")}>Extra grande</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Quebra de Texto">
        <RibbonBtn onClick={() => {
          const el = document.querySelector('.tiptap') as HTMLElement;
          if (el) el.style.wordBreak = el.style.wordBreak === 'break-all' ? 'normal' : 'break-all';
        }} icon={WrapText} label="Quebra automática de texto" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Quebras">
        <RibbonBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={SeparatorHorizontal} label="Quebra de página" />
      </RibbonGroup>
    </>
  );
}

// ═══════════════════════════════════════════
// TAB: Exibição
// ═══════════════════════════════════════════
function ViewTab({ zoom, onZoomChange, editor }: { zoom: number; onZoomChange: (z: number) => void; editor: Editor }) {
  const [showRuler, setShowRuler] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const toggleRuler = () => {
    const next = !showRuler;
    setShowRuler(next);
    let el = document.querySelector('#editor-ruler-style') as HTMLStyleElement;
    if (!el) { el = document.createElement('style'); el.id = 'editor-ruler-style'; document.head.appendChild(el); }
    el.textContent = next
      ? `.exam-page { background-image: linear-gradient(to right, transparent 59px, hsl(var(--border)) 59px, hsl(var(--border)) 60px, transparent 60px); background-size: 100% 100%; background-repeat: no-repeat; }`
      : '';
  };

  const toggleGrid = () => {
    const next = !showGrid;
    setShowGrid(next);
    let el = document.querySelector('#editor-grid-style') as HTMLStyleElement;
    if (!el) { el = document.createElement('style'); el.id = 'editor-grid-style'; document.head.appendChild(el); }
    el.textContent = next
      ? `.tiptap { background-image: linear-gradient(hsl(var(--border) / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.15) 1px, transparent 1px); background-size: 20px 20px; }`
      : '';
  };

  const handlePrintPreview = () => {
    const examElement = document.querySelector('.exam-page') as HTMLElement | null;

    if (!examElement) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    const examHtml = examElement.outerHTML;

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Visualização de Impressão - Prova</title>
          ${styles}
          <style>
            html, body {
              margin: 0;
              padding: 0;
              background: hsl(0 0% 100%);
            }

            .print-root {
              display: flex;
              justify-content: center;
              padding: 10mm;
              box-sizing: border-box;
            }

            .print-root .exam-page {
              transform: none !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              margin: 0 !important;
              width: 210mm !important;
              max-width: 210mm !important;
              min-height: 297mm !important;
              background: hsl(0 0% 100%) !important;
            }

            @media print {
              .print-root {
                padding: 0;
              }

              @page {
                size: A4 portrait;
                margin: 10mm;
              }
            }
          </style>
        </head>
        <body>
          <main class="print-root">
            ${examHtml}
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <>
      <RibbonGroup label="Régua">
        <RibbonBtn onClick={toggleRuler} active={showRuler} icon={Ruler} label="Mostrar/Ocultar régua" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Linha da Grade">
        <RibbonBtn onClick={toggleGrid} active={showGrid} icon={Grid3X3} label="Mostrar/Ocultar linhas de grade" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Zoom">
        <RibbonBtn onClick={() => onZoomChange(Math.max(50, zoom - 10))} icon={ZoomOut} label="Diminuir zoom" />
        <span className="text-xs font-medium text-foreground min-w-[40px] text-center">{zoom}%</span>
        <RibbonBtn onClick={() => onZoomChange(Math.min(200, zoom + 10))} icon={ZoomIn} label="Aumentar zoom" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Predefinições">
        <button onClick={() => onZoomChange(75)} className={cn("px-2 py-1 rounded text-xs transition-colors", zoom === 75 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>75%</button>
        <button onClick={() => onZoomChange(100)} className={cn("px-2 py-1 rounded text-xs transition-colors", zoom === 100 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>100%</button>
        <button onClick={() => onZoomChange(125)} className={cn("px-2 py-1 rounded text-xs transition-colors", zoom === 125 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>125%</button>
        <button onClick={() => onZoomChange(150)} className={cn("px-2 py-1 rounded text-xs transition-colors", zoom === 150 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>150%</button>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Visualização">
        <RibbonBtn onClick={handlePrintPreview} icon={Printer} label="Visualização de impressão" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Contadores">
        <RibbonBtn
          onClick={() => {
            const html = editor.getHTML();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const allText = doc.body.innerText || '';
            const questionMatches = allText.match(/(?:^|\n)\s*\d+[\.\)\-]/g) || [];
            const questionKeyword = (allText.match(/quest[aã]o/gi) || []).length;
            const total = Math.max(questionMatches.length, questionKeyword);
            const easy = (html.match(/🟢 Fácil/g) || []).length;
            const medium = (html.match(/🟡 Médio/g) || []).length;
            const hard = (html.match(/🔴 Difícil/g) || []).length;
            const images = doc.body.querySelectorAll('img').length;
            const tables = doc.body.querySelectorAll('table').length;
            alert(`📊 Estatísticas do Documento\n\n📝 Questões: ~${total}\n🖼️ Imagens: ${images}\n📋 Tabelas: ${tables}\n\n📊 Dificuldade:\n  🟢 Fácil: ${easy}\n  🟡 Médio: ${medium}\n  🔴 Difícil: ${hard}`);
          }}
          icon={BarChart2}
          label="Contador de questões e estatísticas"
        />
        <RibbonBtn
          onClick={() => {
            const html = editor.getHTML();
            const issues: string[] = [];
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const imgs = doc.body.querySelectorAll('img');
            if (imgs.length === 0) issues.push('⚠️ Nenhuma imagem/cabeçalho encontrado');
            const text = (doc.body.textContent || '').trim();
            if (text.length < 50) issues.push('⚠️ Documento parece vazio ou muito curto');
            const hasOptions = /\b[abcdABCD]\)|\([abcdABCD]\)/.test(text);
            if (!hasOptions) issues.push('ℹ️ Nenhuma alternativa (a/b/c/d) detectada');
            if (!html.toLowerCase().includes('gabarito') && !html.toLowerCase().includes('resposta'))
              issues.push('⚠️ Gabarito/respostas não mencionados');
            if (issues.length === 0) {
              alert('✅ Verificação concluída!\nNenhum problema encontrado.');
            } else {
              alert(`🔍 Verificação do Documento\n\n${issues.join('\n')}`);
            }
          }}
          icon={AlertCircle}
          label="Verificar documento"
        />
      </RibbonGroup>
    </>
  );
}

// ═══════════════════════════════════════════
// TAB: Formato de Imagem
// ═══════════════════════════════════════════
function ImageTab({ editor, imageAttrs, updateImageAttr, widthInput, heightInput, handleWidthChange, handleHeightChange, applyPreset }: {
  editor: Editor; imageAttrs: any; updateImageAttr: (a: Record<string, any>) => void;
  widthInput: string; heightInput: string;
  handleWidthChange: (v: string) => void; handleHeightChange: (v: string) => void;
  applyPreset: (w: number) => void;
}) {
  const currentFloat = imageAttrs.float || "none";
  const currentBorder = imageAttrs.border || "none";
  const currentShadow = imageAttrs.shadow || "none";
  const currentRadius = imageAttrs.borderRadius || "0";
  const currentFilter = imageAttrs.filter || "";

  return (
    <>
      <RibbonGroup label="Tamanho">
        <RibbonBtn onClick={() => applyPreset(150)} active={imageAttrs.customWidth === 150} icon={Minimize2} label="Pequeno (150px)" />
        <RibbonBtn onClick={() => applyPreset(350)} active={imageAttrs.customWidth === 350} icon={Square} label="Médio (350px)" />
        <RibbonBtn onClick={() => applyPreset(600)} active={imageAttrs.customWidth === 600} icon={Maximize2} label="Grande (600px)" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Dimensões (px)">
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-muted-foreground">L:</label>
          <input type="number" value={widthInput} onChange={(e) => handleWidthChange(e.target.value)}
            className="w-14 px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-primary" min={20} max={2000} />
        </div>
        <span className="text-[10px] text-muted-foreground">×</span>
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-muted-foreground">A:</label>
          <input type="number" value={heightInput} onChange={(e) => handleHeightChange(e.target.value)}
            className="w-14 px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-primary" min={20} max={2000} />
        </div>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Borda">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("p-1.5 rounded-md transition-colors", currentBorder !== "none" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              <Frame className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">Borda da Imagem</DropdownMenuLabel>
            {borderStyles.map((b) => (
              <DropdownMenuItem key={b.value} onClick={() => updateImageAttr({ border: b.value })} className={cn(currentBorder === b.value && "bg-primary/10")}>
                <span className="h-4 w-6 rounded mr-2 bg-muted" style={{ border: b.value !== "none" ? b.value : undefined }} />{b.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("p-1.5 rounded-md transition-colors", currentRadius !== "0" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              <CircleDot className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[150px]">
            <DropdownMenuLabel className="text-xs">Arredondamento</DropdownMenuLabel>
            {borderRadiusOptions.map((r) => (
              <DropdownMenuItem key={r.value} onClick={() => updateImageAttr({ borderRadius: r.value })} className={cn(currentRadius === r.value && "bg-primary/10")}>
                <span className="h-4 w-4 bg-primary/20 mr-2" style={{ borderRadius: r.value }} />{r.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Efeitos">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("p-1.5 rounded-md transition-colors", currentShadow !== "none" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              <Layers className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[150px]">
            <DropdownMenuLabel className="text-xs">Sombra</DropdownMenuLabel>
            {shadowEffects.map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => updateImageAttr({ shadow: s.value })} className={cn(currentShadow === s.value && "bg-primary/10")}>{s.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("p-1.5 rounded-md transition-colors", currentFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              <SunMedium className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">Filtros</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => updateImageAttr({ filter: "" })}>Nenhum</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateImageAttr({ filter: "grayscale(100%)" })}>Escala de cinza</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateImageAttr({ filter: "sepia(80%)" })}>Sépia</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateImageAttr({ filter: "brightness(120%)" })}>Brilho +</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateImageAttr({ filter: "brightness(80%)" })}>Brilho −</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateImageAttr({ filter: "contrast(130%)" })}>Contraste +</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateImageAttr({ filter: "blur(1px)" })}>Desfoque</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateImageAttr({ filter: "saturate(150%)" })}>Saturação +</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Posição">
        <RibbonBtn onClick={() => updateImageAttr({ float: "left" })} active={currentFloat === "left"} icon={AlignLeft} label="Esquerda" />
        <RibbonBtn onClick={() => updateImageAttr({ float: "none" })} active={currentFloat === "none"} icon={AlignCenter} label="Centro" />
        <RibbonBtn onClick={() => updateImageAttr({ float: "right" })} active={currentFloat === "right"} icon={AlignRight} label="Direita" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Transformar">
        <RibbonBtn onClick={() => updateImageAttr({ rotation: ((imageAttrs.rotation || 0) + 90) % 360 })} icon={RotateCw} label="Girar 90°" />
        <RibbonBtn onClick={() => updateImageAttr({ flipH: !imageAttrs.flipH })} active={!!imageAttrs.flipH} icon={FlipHorizontal} label="Espelhar H" />
        <RibbonBtn onClick={() => updateImageAttr({ flipV: !imageAttrs.flipV })} active={!!imageAttrs.flipV} icon={FlipVertical} label="Espelhar V" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Excluir">
        <RibbonBtn onClick={() => editor.chain().focus().deleteSelection().run()} icon={Trash2} label="Excluir imagem" className="hover:text-destructive" />
      </RibbonGroup>
    </>
  );
}
