import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Maximize2,
  Minimize2,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings2,
  MoveVertical,
  LayoutGrid,
} from "lucide-react";
import { useState } from "react";

export type ObjectFloat = "none" | "left" | "right" | "top-bottom";
export type PresetSize = "small" | "medium" | "large" | "custom";

export const sizePresets: Record<Exclude<PresetSize, "custom">, { w: number; label: string }> = {
  small: { w: 150, label: "Pequeno" },
  medium: { w: 350, label: "Médio" },
  large: { w: 600, label: "Grande" },
};

export const floatStyles: Record<ObjectFloat, string> = {
  none: "mx-auto clear-both",
  left: "float-left mr-4 mb-2",
  right: "float-right ml-4 mb-2",
  "top-bottom": "mx-auto clear-both block",
};

function ToolbarButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "p-1 rounded transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

interface ObjectToolbarProps {
  currentFloat: ObjectFloat;
  onFloatChange: (float: ObjectFloat) => void;
  activePreset: PresetSize;
  onPresetChange: (preset: Exclude<PresetSize, "custom">) => void;
  customWidth: string;
  customHeight: string;
  onWidthChange: (val: string) => void;
  onHeightChange: (val: string) => void;
  naturalSize?: { w: number; h: number } | null;
  showSizeControls?: boolean;
  onCloseToolbar?: () => void;
}

export function ObjectToolbar({
  currentFloat,
  onFloatChange,
  activePreset,
  onPresetChange,
  customWidth,
  customHeight,
  onWidthChange,
  onHeightChange,
  naturalSize,
  showSizeControls = true,
  onCloseToolbar,
}: ObjectToolbarProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [showPosition, setShowPosition] = useState(false);

  const handlePopoverClose = (open: boolean, setter: (v: boolean) => void, otherSetter: (v: boolean) => void) => {
    setter(open);
    if (open) otherSetter(false);
  };

  return (
    <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-lg px-1.5 py-1 z-30 whitespace-nowrap">
      {showSizeControls && (
        <>
          <ToolbarButton active={activePreset === "small"} onClick={() => onPresetChange("small")} icon={Minimize2} label="Pequeno (150px)" />
          <ToolbarButton active={activePreset === "medium"} onClick={() => onPresetChange("medium")} icon={Square} label="Médio (350px)" />
          <ToolbarButton active={activePreset === "large"} onClick={() => onPresetChange("large")} icon={Maximize2} label="Grande (600px)" />

          <Popover open={showCustom} onOpenChange={(open) => handlePopoverClose(open, setShowCustom, setShowPosition)}>
            <PopoverTrigger asChild>
              <button type="button" title="Personalizado (px)" className={cn("p-1 rounded transition-colors", showCustom ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="center" className="w-auto p-2.5" sideOffset={8}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-[10px] text-muted-foreground font-medium">L:</label>
                  <input type="number" value={customWidth} onChange={(e) => onWidthChange(e.target.value)} className="w-16 px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-primary" min={20} max={2000} />
                </div>
                <span className="text-[10px] text-muted-foreground">×</span>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] text-muted-foreground font-medium">A:</label>
                  <input type="number" value={customHeight} onChange={(e) => onHeightChange(e.target.value)} className="w-16 px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-primary" min={20} max={2000} />
                </div>
                <span className="text-[10px] text-muted-foreground ml-1">px</span>
              </div>
              {naturalSize && (
                <p className="text-[9px] text-muted-foreground mt-1.5 text-center">Original: {naturalSize.w} × {naturalSize.h}</p>
              )}
            </PopoverContent>
          </Popover>

          <div className="w-px h-4 bg-border mx-1" />
        </>
      )}

      <ToolbarButton active={currentFloat === "none"} onClick={() => onFloatChange("none")} icon={AlignCenter} label="Alinhado com o Texto" />
      <ToolbarButton active={currentFloat === "left"} onClick={() => onFloatChange("left")} icon={AlignLeft} label="Quadrado (Esquerda)" />
      <ToolbarButton active={currentFloat === "right"} onClick={() => onFloatChange("right")} icon={AlignRight} label="Quadrado (Direita)" />
      <ToolbarButton active={currentFloat === "top-bottom"} onClick={() => onFloatChange("top-bottom")} icon={MoveVertical} label="Superior e Inferior" />

      <div className="w-px h-4 bg-border mx-1" />

      <Popover open={showPosition} onOpenChange={(open) => handlePopoverClose(open, setShowPosition, setShowCustom)}>
        <PopoverTrigger asChild>
          <button type="button" title="Posição" className={cn("p-1 rounded transition-colors", showPosition ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-auto p-3" sideOffset={8}>
          <p className="text-[10px] text-muted-foreground font-medium mb-2 text-center">Posição na Página</p>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              ["left", "top"], ["none", "top"], ["right", "top"],
              ["left", "middle"], ["none", "middle"], ["right", "middle"],
              ["left", "bottom"], ["none", "bottom"], ["right", "bottom"],
            ] as const).map(([f, v], i) => (
              <button key={i} onClick={() => { onFloatChange(f as ObjectFloat); setShowPosition(false); }}
                className={cn("w-11 h-14 rounded border relative overflow-hidden transition-colors", currentFloat === f ? "border-primary bg-primary/10" : "border-input hover:bg-muted")}>
                <div className="absolute inset-1 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4, 5].map(l => <div key={l} className="h-[1.5px] bg-muted-foreground/20 rounded-full" />)}
                </div>
                <div className={cn(
                  "absolute w-3.5 h-2 bg-primary/50 rounded-[1px]",
                  f === "left" && "left-1", f === "none" && "left-1/2 -translate-x-1/2", f === "right" && "right-1",
                  v === "top" && "top-1", v === "middle" && "top-1/2 -translate-y-1/2", v === "bottom" && "bottom-1"
                )} />
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
