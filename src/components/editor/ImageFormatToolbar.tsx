import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  Minimize2,
  Square,
  Maximize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  WrapText,
  RectangleHorizontal,
  CircleDot,
  Crop,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  SunMedium,
  Contrast,
  Trash2,
  Settings2,
  Frame,
  Layers,
  ImageIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useCallback } from "react";

interface ImageFormatToolbarProps {
  editor: Editor;
}

function ToolbarBtn({
  onClick,
  active,
  disabled,
  icon: Icon,
  label,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
            disabled && "opacity-40 cursor-not-allowed",
            className
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function ToolbarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-0.5">{children}</div>
      <span className="text-[9px] text-muted-foreground font-medium leading-none">{label}</span>
    </div>
  );
}

const borderStyles = [
  { label: "Nenhuma", value: "none" },
  { label: "Fina", value: "1px solid hsl(var(--border))" },
  { label: "Média", value: "2px solid hsl(var(--border))" },
  { label: "Grossa", value: "3px solid hsl(var(--foreground))" },
  { label: "Arredondada", value: "2px solid hsl(var(--primary))" },
  { label: "Pontilhada", value: "2px dashed hsl(var(--muted-foreground))" },
];

const shadowEffects = [
  { label: "Nenhuma", value: "none" },
  { label: "Suave", value: "0 2px 8px rgba(0,0,0,0.12)" },
  { label: "Média", value: "0 4px 16px rgba(0,0,0,0.18)" },
  { label: "Forte", value: "0 8px 30px rgba(0,0,0,0.25)" },
  { label: "Interna", value: "inset 0 2px 8px rgba(0,0,0,0.15)" },
];

const borderRadiusOptions = [
  { label: "Sem arredondar", value: "0" },
  { label: "Pequeno", value: "4px" },
  { label: "Médio", value: "8px" },
  { label: "Grande", value: "16px" },
  { label: "Circular", value: "50%" },
];

export function ImageFormatToolbar({ editor }: ImageFormatToolbarProps) {
  const [imageAttrs, setImageAttrs] = useState<any>(null);
  const [widthInput, setWidthInput] = useState("");
  const [heightInput, setHeightInput] = useState("");

  const getSelectedImageNode = useCallback(() => {
    const { state } = editor;
    const { selection } = state;
    if (selection && (selection as any).node?.type?.name === "image") {
      return (selection as any).node;
    }
    return null;
  }, [editor]);

  const updateImageAttr = useCallback(
    (attrs: Record<string, any>) => {
      const { state } = editor;
      const { selection } = state;
      if (selection && (selection as any).node?.type?.name === "image") {
        const pos = (selection as any).from;
        const tr = state.tr.setNodeMarkup(pos, undefined, {
          ...(selection as any).node.attrs,
          ...attrs,
        });
        editor.view.dispatch(tr);
      }
    },
    [editor]
  );

  useEffect(() => {
    const handler = () => {
      const node = getSelectedImageNode();
      if (node) {
        setImageAttrs(node.attrs);
        setWidthInput(String(node.attrs.customWidth || ""));
        setHeightInput(String(node.attrs.customHeight || ""));
      } else {
        setImageAttrs(null);
      }
    };
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    handler();
    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("transaction", handler);
    };
  }, [editor, getSelectedImageNode]);

  if (!imageAttrs) return null;

  const currentFloat = imageAttrs.float || "none";
  const currentBorder = imageAttrs.border || "none";
  const currentShadow = imageAttrs.shadow || "none";
  const currentRadius = imageAttrs.borderRadius || "0";
  const currentFilter = imageAttrs.filter || "";
  const currentRotation = imageAttrs.rotation || 0;

  const handleWidthChange = (val: string) => {
    setWidthInput(val);
    const w = parseInt(val);
    if (w > 0) {
      // Maintain aspect ratio
      const imgEl = document.querySelector(`.ProseMirror img[src="${imageAttrs.src}"]`) as HTMLImageElement;
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
      const imgEl = document.querySelector(`.ProseMirror img[src="${imageAttrs.src}"]`) as HTMLImageElement;
      const ratio = imgEl ? imgEl.naturalWidth / imgEl.naturalHeight : 1;
      const w = Math.round(h * ratio);
      setWidthInput(String(w));
      updateImageAttr({ customWidth: w, customHeight: h });
    }
  };

  const applyPreset = (w: number) => {
    const imgEl = document.querySelector(`.ProseMirror img[src="${imageAttrs.src}"]`) as HTMLImageElement;
    const ratio = imgEl ? imgEl.naturalWidth / imgEl.naturalHeight : 1;
    const h = Math.round(w / ratio);
    setWidthInput(String(w));
    setHeightInput(String(h));
    updateImageAttr({ customWidth: w, customHeight: h });
  };

  const rotateImage = () => {
    const newRotation = ((currentRotation || 0) + 90) % 360;
    updateImageAttr({ rotation: newRotation });
  };

  const deleteImage = () => {
    editor.chain().focus().deleteSelection().run();
  };

  const applyFilter = (filter: string) => {
    updateImageAttr({ filter });
  };

  return (
    <div className="glass-card rounded-lg border border-border overflow-hidden animate-fade-in">
      {/* Tab label */}
      <div className="flex items-center px-3 py-1 bg-primary/5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Formato de Imagem</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-3 px-3 py-2 bg-muted/10">
        {/* Presets */}
        <ToolbarGroup label="Tamanho">
          <ToolbarBtn
            onClick={() => applyPreset(150)}
            active={imageAttrs.customWidth === 150}
            icon={Minimize2}
            label="Pequeno (150px)"
          />
          <ToolbarBtn
            onClick={() => applyPreset(350)}
            active={imageAttrs.customWidth === 350}
            icon={Square}
            label="Médio (350px)"
          />
          <ToolbarBtn
            onClick={() => applyPreset(600)}
            active={imageAttrs.customWidth === 600}
            icon={Maximize2}
            label="Grande (600px)"
          />
        </ToolbarGroup>

        <Separator orientation="vertical" className="h-10" />

        {/* Custom dimensions */}
        <ToolbarGroup label="Dimensões (px)">
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-muted-foreground">L:</label>
            <input
              type="number"
              value={widthInput}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="w-14 px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
              min={20}
              max={2000}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">×</span>
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-muted-foreground">A:</label>
            <input
              type="number"
              value={heightInput}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="w-14 px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
              min={20}
              max={2000}
            />
          </div>
        </ToolbarGroup>

        <Separator orientation="vertical" className="h-10" />

        {/* Border */}
        <ToolbarGroup label="Borda">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "p-1.5 rounded-md transition-colors",
                currentBorder !== "none"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
                <Frame className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              <DropdownMenuLabel className="text-xs">Borda da Imagem</DropdownMenuLabel>
              {borderStyles.map((b) => (
                <DropdownMenuItem
                  key={b.value}
                  onClick={() => updateImageAttr({ border: b.value })}
                  className={cn(currentBorder === b.value && "bg-primary/10")}
                >
                  <span
                    className="h-4 w-6 rounded mr-2 bg-muted"
                    style={{ border: b.value !== "none" ? b.value : undefined }}
                  />
                  {b.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Border radius */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "p-1.5 rounded-md transition-colors",
                currentRadius !== "0"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
                <CircleDot className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[150px]">
              <DropdownMenuLabel className="text-xs">Arredondamento</DropdownMenuLabel>
              {borderRadiusOptions.map((r) => (
                <DropdownMenuItem
                  key={r.value}
                  onClick={() => updateImageAttr({ borderRadius: r.value })}
                  className={cn(currentRadius === r.value && "bg-primary/10")}
                >
                  <span
                    className="h-4 w-4 bg-primary/20 mr-2"
                    style={{ borderRadius: r.value }}
                  />
                  {r.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </ToolbarGroup>

        <Separator orientation="vertical" className="h-10" />

        {/* Effects */}
        <ToolbarGroup label="Efeitos">
          {/* Shadow */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "p-1.5 rounded-md transition-colors",
                currentShadow !== "none"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
                <Layers className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[150px]">
              <DropdownMenuLabel className="text-xs">Sombra</DropdownMenuLabel>
              {shadowEffects.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => updateImageAttr({ shadow: s.value })}
                  className={cn(currentShadow === s.value && "bg-primary/10")}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "p-1.5 rounded-md transition-colors",
                currentFilter
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
                <SunMedium className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              <DropdownMenuLabel className="text-xs">Filtros</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => applyFilter("")}>Nenhum</DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFilter("grayscale(100%)")}>Escala de cinza</DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFilter("sepia(80%)")}>Sépia</DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFilter("brightness(120%)")}>Brilho +</DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFilter("brightness(80%)")}>Brilho −</DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFilter("contrast(130%)")}>Contraste +</DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFilter("blur(1px)")}>Desfoque leve</DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFilter("saturate(150%)")}>Saturação +</DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFilter("opacity(70%)")}>Transparência</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ToolbarGroup>

        <Separator orientation="vertical" className="h-10" />

        {/* Layout / Position */}
        <ToolbarGroup label="Posição">
          <ToolbarBtn
            onClick={() => updateImageAttr({ float: "left" })}
            active={currentFloat === "left"}
            icon={AlignLeft}
            label="Esquerda (texto contorna)"
          />
          <ToolbarBtn
            onClick={() => updateImageAttr({ float: "none" })}
            active={currentFloat === "none"}
            icon={AlignCenter}
            label="Centralizado"
          />
          <ToolbarBtn
            onClick={() => updateImageAttr({ float: "right" })}
            active={currentFloat === "right"}
            icon={AlignRight}
            label="Direita (texto contorna)"
          />
        </ToolbarGroup>

        <Separator orientation="vertical" className="h-10" />

        {/* Transform */}
        <ToolbarGroup label="Transformar">
          <ToolbarBtn
            onClick={rotateImage}
            icon={RotateCw}
            label="Girar 90°"
          />
          <ToolbarBtn
            onClick={() => updateImageAttr({ flipH: !imageAttrs.flipH })}
            active={!!imageAttrs.flipH}
            icon={FlipHorizontal}
            label="Espelhar horizontal"
          />
          <ToolbarBtn
            onClick={() => updateImageAttr({ flipV: !imageAttrs.flipV })}
            active={!!imageAttrs.flipV}
            icon={FlipVertical}
            label="Espelhar vertical"
          />
        </ToolbarGroup>

        <Separator orientation="vertical" className="h-10" />

        {/* Delete */}
        <ToolbarGroup label="Excluir">
          <ToolbarBtn
            onClick={deleteImage}
            icon={Trash2}
            label="Excluir imagem"
            className="hover:text-destructive"
          />
        </ToolbarGroup>
      </div>
    </div>
  );
}
