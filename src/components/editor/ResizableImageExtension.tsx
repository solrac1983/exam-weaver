import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  Minimize2,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings2,
  X,
  Check,
} from "lucide-react";

type ImageFloat = "none" | "left" | "right";
type PresetSize = "small" | "medium" | "large" | "custom";

const presets: Record<Exclude<PresetSize, "custom">, { w: number; label: string }> = {
  small: { w: 150, label: "Pequeno" },
  medium: { w: 350, label: "Médio" },
  large: { w: 600, label: "Grande" },
};

function ResizableImageView({ node, updateAttributes, selected }: any) {
  const { src, alt, customWidth, customHeight, float = "none" } = node.attrs;
  const [showControls, setShowControls] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [editW, setEditW] = useState<string>(String(customWidth || ""));
  const [editH, setEditH] = useState<string>(String(customHeight || ""));
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const currentFloat: ImageFloat = float;

  // Detect natural image size
  useEffect(() => {
    const img = new Image();
    img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  const aspectRatio = naturalSize ? naturalSize.w / naturalSize.h : 1;

  // Determine current preset
  const activePreset: PresetSize =
    customWidth === presets.small.w ? "small"
    : customWidth === presets.medium.w ? "medium"
    : customWidth === presets.large.w ? "large"
    : customWidth ? "custom" : "large";

  const displayWidth = customWidth || presets.large.w;
  const displayHeight = customHeight || (customWidth ? Math.round(customWidth / aspectRatio) : undefined);

  const applyPreset = (key: Exclude<PresetSize, "custom">) => {
    const w = presets[key].w;
    const h = Math.round(w / aspectRatio);
    updateAttributes({ customWidth: w, customHeight: h });
    setEditW(String(w));
    setEditH(String(h));
    setShowCustom(false);
  };

  const handleWidthChange = (val: string) => {
    setEditW(val);
    const w = parseInt(val);
    if (w > 0 && naturalSize) {
      const h = Math.round(w / aspectRatio);
      setEditH(String(h));
      updateAttributes({ customWidth: w, customHeight: h });
    }
  };

  const handleHeightChange = (val: string) => {
    setEditH(val);
    const h = parseInt(val);
    if (h > 0 && naturalSize) {
      const w = Math.round(h * aspectRatio);
      setEditW(String(w));
      updateAttributes({ customWidth: w, customHeight: h });
    }
  };

  const floatStyles: Record<ImageFloat, string> = {
    none: "mx-auto clear-both",
    left: "float-left mr-4 mb-2",
    right: "float-right ml-4 mb-2",
  };

  return (
    <NodeViewWrapper
      className={cn(
        "relative my-2 group",
        floatStyles[currentFloat],
        currentFloat === "none" && "flex justify-center"
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => { setShowControls(false); setShowCustom(false); }}
    >
      <div
        className="relative inline-block"
        style={{ width: `${displayWidth}px`, maxWidth: "100%" }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          style={displayHeight ? { width: "100%", height: `${displayHeight}px`, objectFit: "contain" } : undefined}
          className={cn(
            "block w-full h-auto rounded transition-shadow",
            selected && "ring-2 ring-primary ring-offset-2",
            !displayHeight && "h-auto"
          )}
          draggable={false}
        />

        {/* Controls overlay */}
        {(showControls || selected) && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-lg px-1.5 py-1 z-10 whitespace-nowrap">
            {/* Preset sizes */}
            <ControlButton
              active={activePreset === "small"}
              onClick={() => applyPreset("small")}
              icon={Minimize2}
              label="Pequeno (150px)"
            />
            <ControlButton
              active={activePreset === "medium"}
              onClick={() => applyPreset("medium")}
              icon={Square}
              label="Médio (350px)"
            />
            <ControlButton
              active={activePreset === "large"}
              onClick={() => applyPreset("large")}
              icon={Maximize2}
              label="Grande (600px)"
            />
            <ControlButton
              active={showCustom}
              onClick={() => {
                setShowCustom(!showCustom);
                setEditW(String(customWidth || displayWidth));
                setEditH(String(displayHeight || ""));
              }}
              icon={Settings2}
              label="Personalizado (px)"
            />

            <div className="w-px h-4 bg-border mx-1" />

            {/* Position */}
            <ControlButton
              active={currentFloat === "left"}
              onClick={() => updateAttributes({ float: currentFloat === "left" ? "none" : "left" })}
              icon={AlignLeft}
              label="Esquerda"
            />
            <ControlButton
              active={currentFloat === "none"}
              onClick={() => updateAttributes({ float: "none" })}
              icon={AlignCenter}
              label="Centro"
            />
            <ControlButton
              active={currentFloat === "right"}
              onClick={() => updateAttributes({ float: currentFloat === "right" ? "none" : "right" })}
              icon={AlignRight}
              label="Direita"
            />
          </div>
        )}

        {/* Custom size panel */}
        {showCustom && (
          <div className="absolute -top-[5.5rem] left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg px-3 py-2 z-20 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <label className="text-[10px] text-muted-foreground font-medium">L:</label>
                <input
                  type="number"
                  value={editW}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                  placeholder="px"
                  min={20}
                  max={2000}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">×</span>
              <div className="flex items-center gap-1">
                <label className="text-[10px] text-muted-foreground font-medium">A:</label>
                <input
                  type="number"
                  value={editH}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                  placeholder="px"
                  min={20}
                  max={2000}
                />
              </div>
              <span className="text-[10px] text-muted-foreground ml-1">px</span>
            </div>
            {naturalSize && (
              <p className="text-[9px] text-muted-foreground mt-1 text-center">
                Original: {naturalSize.w} × {naturalSize.h}
              </p>
            )}
          </div>
        )}

        {/* Live size indicator */}
        {(showControls || selected) && (
          <div className="absolute bottom-1 right-1 bg-foreground/70 text-background text-[9px] px-1.5 py-0.5 rounded font-mono">
            {displayWidth} × {displayHeight || "auto"}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function ControlButton({
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

export const ResizableImage = Node.create({
  name: "image",
  group: "block",
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      customWidth: { default: null },
      customHeight: { default: null },
      float: { default: "none" },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { customWidth, customHeight, float, ...rest } = HTMLAttributes;
    const parts: string[] = [];
    if (customWidth) parts.push(`width:${customWidth}px`);
    if (customHeight) parts.push(`height:${customHeight}px;object-fit:contain`);
    if (float === "left") parts.push("float:left;margin-right:1rem");
    if (float === "right") parts.push("float:right;margin-left:1rem");
    return ["img", mergeAttributes(rest, { style: parts.join(";") })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    } as any;
  },
});
