import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  AlignLeft, AlignCenter, AlignRight, Minimize2, Square, Maximize2,
  Frame, CircleDot, Layers, SunMedium, RotateCw, FlipHorizontal, FlipVertical, Crop, Trash2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { RibbonBtn, RibbonGroup } from "./RibbonShared";
import { borderStyles, shadowEffects, borderRadiusOptions } from "./RibbonConstants";

interface ImageTabProps {
  editor: Editor;
  imageAttrs: any;
  updateImageAttr: (a: Record<string, any>) => void;
  widthInput: string;
  heightInput: string;
  handleWidthChange: (v: string) => void;
  handleHeightChange: (v: string) => void;
  applyPreset: (w: number) => void;
}

export function ImageTab({ editor, imageAttrs, updateImageAttr, widthInput, heightInput, handleWidthChange, handleHeightChange, applyPreset }: ImageTabProps) {
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
            <button className={cn("p-1.5 rounded transition-colors", currentBorder !== "none" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
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
            <button className={cn("p-1.5 rounded transition-colors", currentRadius !== "0" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
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
            <button className={cn("p-1.5 rounded transition-colors", currentShadow !== "none" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
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
            <button className={cn("p-1.5 rounded transition-colors", currentFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
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
        <RibbonBtn onClick={() => updateImageAttr({ flipH: !imageAttrs.flipH })} active={imageAttrs.flipH} icon={FlipHorizontal} label="Espelhar horizontal" />
        <RibbonBtn onClick={() => updateImageAttr({ flipV: !imageAttrs.flipV })} active={imageAttrs.flipV} icon={FlipVertical} label="Espelhar vertical" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Ações">
        <RibbonBtn onClick={() => editor.chain().focus().deleteSelection().run()} icon={Trash2} label="Remover imagem" />
      </RibbonGroup>
    </>
  );
}
