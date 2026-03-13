import { Editor } from "@tiptap/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Palette, Square, CheckCircle2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

// ─── Watermark ───
export function WatermarkDropdown({ editor }: { editor: Editor }) {
  const watermarks = ["RASCUNHO", "CONFIDENCIAL", "CÓPIA", "AMOSTRA", "NÃO COPIAR", "URGENTE"];

  const applyWatermark = (text: string) => {
    let style = document.querySelector('#editor-watermark-style') as HTMLStyleElement;
    if (!style) { style = document.createElement('style'); style.id = 'editor-watermark-style'; document.head.appendChild(style); }
    style.textContent = `.exam-page{position:relative}.exam-page::before{content:'${text}';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:80px;font-weight:bold;color:rgba(0,0,0,0.06);pointer-events:none;z-index:0;white-space:nowrap}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-[6px] rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <FileText className="h-[14px] w-[14px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[11px] font-medium px-2 py-1">Marca-d'água</TooltipContent>
        </Tooltip>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuLabel className="text-xs">Marca-d'água</DropdownMenuLabel>
        {watermarks.map((w) => <DropdownMenuItem key={w} onClick={() => applyWatermark(w)} className="text-xs">{w}</DropdownMenuItem>)}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { const t = prompt("Texto da marca d'água:"); if (t) applyWatermark(t); }} className="text-xs">Personalizada...</DropdownMenuItem>
        <DropdownMenuItem onClick={() => { const s = document.querySelector('#editor-watermark-style'); if (s) s.remove(); }} className="text-xs text-destructive">Remover</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Page Color ───
export function PageColorDropdown({ editor }: { editor: Editor }) {
  const pageColors = [
    { label: "Branco", value: "#ffffff" }, { label: "Creme", value: "#fdf6e3" },
    { label: "Azul claro", value: "#eff6ff" }, { label: "Verde claro", value: "#f0fdf4" },
    { label: "Rosa claro", value: "#fdf2f8" }, { label: "Cinza claro", value: "#f9fafb" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-[6px] rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Palette className="h-[14px] w-[14px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[11px] font-medium px-2 py-1">Cor da Página</TooltipContent>
        </Tooltip>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        <DropdownMenuLabel className="text-xs">Cor de fundo</DropdownMenuLabel>
        {pageColors.map((c) => (
          <DropdownMenuItem key={c.value} onClick={() => { const page = document.querySelector('.exam-page') as HTMLElement; if (page) page.style.backgroundColor = c.value; }} className="text-xs flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: c.value }} />{c.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Page Border ───
export function PageBorderDropdown({ editor }: { editor: Editor }) {
  const [borderInset, setBorderInset] = useState(5);
  const [activeBorderStyle, setActiveBorderStyle] = useState("none");
  const [borderColor, setBorderColor] = useState("#333333");
  const [borderTarget, setBorderTarget] = useState<"page" | "paragraph">("page");

  const borderStyles = [
    { label: "Nenhuma", style: "none" }, { label: "Simples fina", style: "1px solid" },
    { label: "Simples média", style: "2px solid" }, { label: "Dupla", style: "4px double" },
    { label: "Pontilhada", style: "2px dashed" }, { label: "Tracejada", style: "2px dotted" },
  ];

  const presetColors = ["#000000", "#333333", "#666666", "#2563eb", "#dc2626", "#059669", "#7c3aed", "#ea580c", "#ca8a04", "#999999", "#0891b2", "#1a3c6e"];

  const buildBorderValue = (style: string, color: string) => style === "none" ? "none" : `${style} ${color}`;

  const applyBorder = (borderValue: string, inset: number, target: "page" | "paragraph") => {
    // Remove both styles first
    const pageStyle = document.querySelector('#editor-page-border-style') as HTMLStyleElement;
    const paraStyle = document.querySelector('#editor-paragraph-border-style') as HTMLStyleElement;
    if (pageStyle) pageStyle.textContent = '';
    if (paraStyle) paraStyle.textContent = '';

    if (borderValue === "none") return;

    if (target === "page") {
      let style = pageStyle;
      if (!style) { style = document.createElement('style'); style.id = 'editor-page-border-style'; document.head.appendChild(style); }
      style.textContent = `.exam-page .tiptap::before{content:'';position:absolute;top:${inset}mm;left:${inset}mm;right:${inset}mm;bottom:${inset}mm;border:${borderValue};pointer-events:none;z-index:1}`;
    } else {
      let style = paraStyle;
      if (!style) { style = document.createElement('style'); style.id = 'editor-paragraph-border-style'; document.head.appendChild(style); }
      style.textContent = `.exam-page .tiptap p,.exam-page .tiptap h1,.exam-page .tiptap h2,.exam-page .tiptap h3,.exam-page .tiptap h4{border:${borderValue};padding:4px 8px;margin-bottom:2px}`;
    }
  };

  const handleSelectStyle = (style: string) => {
    setActiveBorderStyle(style);
    applyBorder(buildBorderValue(style, borderColor), borderInset, borderTarget);
  };

  const handleTargetChange = (target: "page" | "paragraph") => {
    setBorderTarget(target);
    if (activeBorderStyle !== "none") {
      applyBorder(buildBorderValue(activeBorderStyle, borderColor), borderInset, target);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex flex-col items-center gap-0.5">
          <Square className="h-4 w-4" /><span className="text-[8px] leading-none">Bordas</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px]">
        <DropdownMenuLabel className="text-xs">Aplicar em</DropdownMenuLabel>
        <div className="flex gap-1 px-2 pb-1">
          <button onClick={() => handleTargetChange("page")} className={cn("px-2 py-1 rounded text-[10px] font-medium transition-colors", borderTarget === "page" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>Página</button>
          <button onClick={() => handleTargetChange("paragraph")} className={cn("px-2 py-1 rounded text-[10px] font-medium transition-colors", borderTarget === "paragraph" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>Parágrafo</button>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">Estilo da Borda</DropdownMenuLabel>
        {borderStyles.map((b) => (
          <DropdownMenuItem key={b.label} onClick={() => handleSelectStyle(b.style)} className="text-xs flex items-center gap-2">
            {b.style !== "none" ? <div className="w-6 h-4 rounded-sm" style={{ border: `${b.style} ${borderColor}` }} /> : <div className="w-6 h-4" />}
            {b.label}
            {activeBorderStyle === b.style && <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-3 py-2 space-y-2">
          <span className="text-[10px] font-medium text-muted-foreground">Cor da Borda</span>
          <div className="grid grid-cols-6 gap-1">
            {presetColors.map((c) => (
              <button key={c} onClick={() => { setBorderColor(c); if (activeBorderStyle !== "none") applyBorder(buildBorderValue(activeBorderStyle, c), borderInset, borderTarget); }}
                className={cn("w-5 h-5 rounded-sm border transition-all", borderColor === c ? "ring-2 ring-primary ring-offset-1" : "border-border hover:scale-110")}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        {borderTarget === "page" && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">Sangria</span>
                <span className="text-[10px] font-semibold text-foreground">{borderInset}mm</span>
              </div>
              <Slider value={[borderInset]} onValueChange={(v) => { setBorderInset(v[0]); if (activeBorderStyle !== "none") applyBorder(buildBorderValue(activeBorderStyle, borderColor), v[0], borderTarget); }} min={0} max={20} step={1} className="w-full" />
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
