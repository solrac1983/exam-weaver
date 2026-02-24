import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Heading1, Heading2,
  Heading3, Undo, Redo, Quote, Superscript, Subscript, Highlighter,
  Palette, Type, Image, ImagePlus, Link, Table, Minus, FunctionSquare,
  Columns3, RowsIcon, Trash2, Save, FilePlus, FolderOpen, FileDown,
  BarChart3, MessageSquare, SeparatorHorizontal, Ruler, LayoutTemplate,
  Printer, ZoomIn, ZoomOut, Grid3X3, Eye, Maximize2, Minimize2, Square,
  Frame, CircleDot, Layers, SunMedium, RotateCw, FlipHorizontal,
  FlipVertical, Crop, Settings2, Contrast, ImageIcon, IndentIncrease,
  IndentDecrease, WrapText, RotateCcw, FileText, MoveVertical,
  ArrowUpDown, Pilcrow,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

// ─── Shared Button ───
function RibbonBtn({
  onClick, active, disabled, icon: Icon, label, className, size = "sm",
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  icon: React.ElementType; label: string; className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button" onClick={onClick} disabled={disabled}
          className={cn(
            "rounded-md transition-colors",
            size === "lg" ? "p-2" : "p-1.5",
            active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            disabled && "opacity-40 cursor-not-allowed", className,
          )}
        >
          <Icon className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1">
      <div className="flex items-center gap-0.5">{children}</div>
      <span className="text-[9px] text-muted-foreground font-medium leading-none whitespace-nowrap">{label}</span>
    </div>
  );
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

type TabId = "home" | "insert" | "layout" | "view" | "image";

const tabs: { id: TabId; label: string; icon: React.ElementType; contextual?: boolean }[] = [
  { id: "home", label: "Página Inicial", icon: Type },
  { id: "insert", label: "Inserir", icon: ImagePlus },
  { id: "layout", label: "Layout", icon: LayoutTemplate },
  { id: "view", label: "Exibição", icon: Eye },
  { id: "image", label: "Formato de Imagem", icon: ImageIcon, contextual: true },
];

interface EditorRibbonProps {
  editor: Editor;
  zoom: number;
  onZoomChange: (z: number) => void;
}

export function EditorRibbon({ editor, zoom, onZoomChange }: EditorRibbonProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasImageSelected, setHasImageSelected] = useState(false);
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
        setActiveTab("image");
      } else {
        setHasImageSelected(false);
        setImageAttrs(null);
        if (activeTab === "image") setActiveTab("home");
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

  const visibleTabs = tabs.filter((t) => !t.contextual || (t.id === "image" && hasImageSelected));

  return (
    <div className="glass-card rounded-lg border border-border overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-muted/30 px-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary bg-card/60"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
              tab.contextual && "text-primary/80",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-wrap items-end gap-1 px-2 py-2 bg-muted/10 min-h-[52px]">
        {activeTab === "home" && <HomeTab editor={editor} />}
        {activeTab === "insert" && (
          <InsertTab editor={editor} addImage={addImage} addImageFromUrl={addImageFromUrl} addTable={addTable} insertFormula={insertFormula} />
        )}
        {activeTab === "layout" && <LayoutTab editor={editor} />}
        {activeTab === "view" && <ViewTab zoom={zoom} onZoomChange={onZoomChange} />}
        {activeTab === "image" && imageAttrs && (
          <ImageTab
            editor={editor} imageAttrs={imageAttrs} updateImageAttr={updateImageAttr}
            widthInput={widthInput} heightInput={heightInput}
            handleWidthChange={handleWidthChange} handleHeightChange={handleHeightChange}
            applyPreset={applyPreset}
          />
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
  return (
    <>
      <RibbonGroup label="Arquivo">
        <RibbonBtn onClick={() => editor.commands.clearContent()} icon={FilePlus} label="Novo documento" />
        <RibbonBtn onClick={() => {}} icon={FolderOpen} label="Abrir documento" />
        <RibbonBtn onClick={() => {}} icon={Save} label="Salvar" />
        <RibbonBtn onClick={() => {}} icon={FileDown} label="Salvar como" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Desfazer">
        <RibbonBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={Undo} label="Desfazer (Ctrl+Z)" />
        <RibbonBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={Redo} label="Refazer (Ctrl+Y)" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Fonte">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-[80px]">
              <Type className="h-3.5 w-3.5" /><span className="truncate">Fonte</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">Família da fonte</DropdownMenuLabel>
            {fontFamilies.map((f) => (
              <DropdownMenuItem key={f.value} onClick={() => editor.chain().focus().setFontFamily(f.value).run()} style={{ fontFamily: f.value }}>{f.label}</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()}>Limpar fonte</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Títulos">
        <RibbonBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} icon={Heading1} label="Título 1" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} icon={Heading2} label="Título 2" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} icon={Heading3} label="Título 3" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Formatação">
        <RibbonBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} label="Negrito" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} label="Itálico" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={Underline} label="Sublinhado" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={Strikethrough} label="Tachado" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} icon={Superscript} label="Sobrescrito" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} icon={Subscript} label="Subscrito" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Cor">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Palette className="h-4 w-4" /></button>
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
            <button className={cn("p-1.5 rounded-md transition-colors", editor.isActive("highlight") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              <Highlighter className="h-4 w-4" />
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
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Alinhamento">
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={AlignLeft} label="Esquerda" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={AlignCenter} label="Centro" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={AlignRight} label="Direita" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} icon={AlignJustify} label="Justificar" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Listas">
        <RibbonBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={List} label="Marcadores" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={ListOrdered} label="Numerada" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={Quote} label="Citação" />
      </RibbonGroup>
    </>
  );
}

// ═══════════════════════════════════════════
// TAB: Inserir
// ═══════════════════════════════════════════
function InsertTab({ editor, addImage, addImageFromUrl, addTable, insertFormula }: {
  editor: Editor; addImage: () => void; addImageFromUrl: () => void;
  addTable: () => void; insertFormula: () => void;
}) {
  return (
    <>
      <RibbonGroup label="Imagem">
        <RibbonBtn onClick={addImage} icon={ImagePlus} label="Upload do computador" size="lg" />
        <RibbonBtn onClick={addImageFromUrl} icon={Link} label="URL da imagem" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Tabela">
        <RibbonBtn onClick={addTable} icon={Table} label="Inserir tabela 3×3" size="lg" />
        {editor.isActive("table") && (
          <>
            <RibbonBtn onClick={() => editor.chain().focus().addColumnAfter().run()} icon={Columns3} label="Adicionar coluna" />
            <RibbonBtn onClick={() => editor.chain().focus().addRowAfter().run()} icon={RowsIcon} label="Adicionar linha" />
            <RibbonBtn onClick={() => editor.chain().focus().deleteTable().run()} icon={Trash2} label="Excluir tabela" className="hover:text-destructive" />
          </>
        )}
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Elementos">
        <RibbonBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} label="Linha horizontal" />
        <RibbonBtn onClick={insertFormula} icon={FunctionSquare} label="Fórmula LaTeX" size="lg" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Link">
        <RibbonBtn onClick={() => {
          const url = prompt("Cole a URL do link:");
          if (url) editor.chain().focus().setMark("link", { href: url }).run();
        }} icon={Link} label="Inserir link" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Comentário">
        <RibbonBtn onClick={() => {}} icon={MessageSquare} label="Inserir comentário" />
      </RibbonGroup>
    </>
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
      <RibbonGroup label="Alinhamento">
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={AlignLeft} label="Esquerda" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={AlignCenter} label="Centro" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={AlignRight} label="Direita" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} icon={AlignJustify} label="Justificado" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Girar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <RotateCw className="h-4 w-4" /><span>Girar</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">Rotação da página</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.exam-page') as HTMLElement;
              if (el) el.style.transform = 'rotate(0deg)';
            }}>0° (Normal)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.exam-page') as HTMLElement;
              if (el) el.style.transform = 'rotate(90deg)';
            }}>90° Horário</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.exam-page') as HTMLElement;
              if (el) el.style.transform = 'rotate(-90deg)';
            }}>90° Anti-horário</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const el = document.querySelector('.exam-page') as HTMLElement;
              if (el) el.style.transform = 'rotate(180deg)';
            }}>180°</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
function ViewTab({ zoom, onZoomChange }: { zoom: number; onZoomChange: (z: number) => void }) {
  return (
    <>
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
        <RibbonBtn onClick={() => window.print()} icon={Printer} label="Visualização de impressão" />
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
