import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  Minimize2,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings2,
  GripVertical,
  MoveVertical,
  LayoutGrid,
} from "lucide-react";

type ImageFloat = "none" | "left" | "right" | "top-bottom";
type PresetSize = "small" | "medium" | "large" | "custom";

const presets: Record<Exclude<PresetSize, "custom">, { w: number; label: string }> = {
  small: { w: 150, label: "Pequeno" },
  medium: { w: 350, label: "Médio" },
  large: { w: 600, label: "Grande" },
};

function ResizableImageView({ node, updateAttributes, selected }: any) {
  const { src, alt, customWidth, customHeight, float = "none", border = "none", shadow = "none", borderRadius = "0", filter = "", rotation = 0, flipH = false, flipV = false } = node.attrs;
  const [showControls, setShowControls] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showPosition, setShowPosition] = useState(false);
  const [editW, setEditW] = useState<string>(String(customWidth || ""));
  const [editH, setEditH] = useState<string>(String(customHeight || ""));
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [resizing, setResizing] = useState<null | string>(null); // "se" | "sw" | "ne" | "nw" | "e" | "w"
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });

  const currentFloat: ImageFloat = float;

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  const aspectRatio = naturalSize ? naturalSize.w / naturalSize.h : 1;

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
    if (w > 0) {
      const h = Math.round(w / aspectRatio);
      setEditH(String(h));
      updateAttributes({ customWidth: w, customHeight: h });
    }
  };

  const handleHeightChange = (val: string) => {
    setEditH(val);
    const h = parseInt(val);
    if (h > 0) {
      const w = Math.round(h * aspectRatio);
      setEditW(String(w));
      updateAttributes({ customWidth: w, customHeight: h });
    }
  };

  // --- Resize handles via drag ---
  const onResizeStart = useCallback(
    (handle: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(handle);
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: displayWidth,
        h: displayHeight || Math.round(displayWidth / aspectRatio),
      };

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startRef.current.x;
        const dy = ev.clientY - startRef.current.y;
        let newW = startRef.current.w;

        if (handle.includes("e")) newW = Math.max(50, startRef.current.w + dx);
        if (handle.includes("w")) newW = Math.max(50, startRef.current.w - dx);

        const newH = Math.round(newW / aspectRatio);
        updateAttributes({ customWidth: newW, customHeight: newH });
        setEditW(String(newW));
        setEditH(String(newH));
      };

      const onUp = () => {
        setResizing(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [displayWidth, displayHeight, aspectRatio, updateAttributes]
  );

  const floatStyles: Record<ImageFloat, string> = {
    none: "mx-auto clear-both",
    left: "float-left mr-4 mb-2",
    right: "float-right ml-4 mb-2",
    "top-bottom": "mx-auto clear-both block",
  };

  const showHandles = showControls || selected || !!resizing;

  return (
    <NodeViewWrapper
      className={cn(
        "relative my-2 group",
        floatStyles[currentFloat],
        (currentFloat === "none" || currentFloat === "top-bottom") && "flex justify-center"
      )}
      data-drag-handle=""
      draggable="true"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
      if (!resizing) {
          setShowControls(false);
          setShowCustom(false);
          setShowPosition(false);
        }
      }}
    >
      <div
        ref={containerRef}
        className="relative inline-block"
        style={{ width: `${displayWidth}px`, maxWidth: "100%" }}
      >
        <img
          src={src}
          alt={alt || ""}
          style={{
            width: "100%",
            ...(displayHeight ? { height: `${displayHeight}px`, objectFit: "contain" as const } : {}),
            ...(border !== "none" ? { border } : {}),
            ...(shadow !== "none" ? { boxShadow: shadow } : {}),
            ...(borderRadius !== "0" ? { borderRadius } : {}),
            ...(filter ? { filter } : {}),
            transform: [
              rotation ? `rotate(${rotation}deg)` : "",
              flipH ? "scaleX(-1)" : "",
              flipV ? "scaleY(-1)" : "",
            ].filter(Boolean).join(" ") || undefined,
          }}
          className={cn(
            "block w-full h-auto rounded transition-all select-none",
            selected && "ring-2 ring-primary ring-offset-2",
            !displayHeight && "h-auto"
          )}
          draggable={false}
        />

        {/* Drag handle indicator */}
        {showHandles && (
          <div
            className="absolute top-1 left-1 p-0.5 rounded bg-foreground/60 text-background cursor-grab active:cursor-grabbing"
            title="Arraste para mover"
            data-drag-handle=""
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Resize handles — corner and side */}
        {showHandles && (
          <>
            {/* Right edge */}
            <div
              onMouseDown={onResizeStart("e")}
              className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-8 bg-primary/80 rounded-full cursor-ew-resize hover:bg-primary transition-colors"
              title="Arrastar para redimensionar"
            />
            {/* Left edge */}
            <div
              onMouseDown={onResizeStart("w")}
              className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-8 bg-primary/80 rounded-full cursor-ew-resize hover:bg-primary transition-colors"
            />
            {/* Bottom-right corner */}
            <div
              onMouseDown={onResizeStart("se")}
              className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full cursor-nwse-resize border-2 border-card hover:scale-110 transition-transform"
            />
            {/* Bottom-left corner */}
            <div
              onMouseDown={onResizeStart("sw")}
              className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-primary rounded-full cursor-nesw-resize border-2 border-card hover:scale-110 transition-transform"
            />
          </>
        )}

        {/* Controls toolbar */}
        {showHandles && !resizing && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-lg px-1.5 py-1 z-10 whitespace-nowrap">
            <ControlButton active={activePreset === "small"} onClick={() => applyPreset("small")} icon={Minimize2} label="Pequeno (150px)" />
            <ControlButton active={activePreset === "medium"} onClick={() => applyPreset("medium")} icon={Square} label="Médio (350px)" />
            <ControlButton active={activePreset === "large"} onClick={() => applyPreset("large")} icon={Maximize2} label="Grande (600px)" />
            <ControlButton
              active={showCustom}
              onClick={() => {
                setShowCustom(!showCustom);
                setShowPosition(false);
                setEditW(String(customWidth || displayWidth));
                setEditH(String(displayHeight || ""));
              }}
              icon={Settings2}
              label="Personalizado (px)"
            />

            <div className="w-px h-4 bg-border mx-1" />

            <ControlButton active={currentFloat === "none"} onClick={() => updateAttributes({ float: "none" })} icon={AlignCenter} label="Alinhado com o Texto" />
            <ControlButton active={currentFloat === "left"} onClick={() => updateAttributes({ float: "left" })} icon={AlignLeft} label="Quadrado (Esquerda)" />
            <ControlButton active={currentFloat === "right"} onClick={() => updateAttributes({ float: "right" })} icon={AlignRight} label="Quadrado (Direita)" />
            <ControlButton active={currentFloat === "top-bottom"} onClick={() => updateAttributes({ float: "top-bottom" })} icon={MoveVertical} label="Superior e Inferior" />

            <div className="w-px h-4 bg-border mx-1" />

            <ControlButton active={showPosition} onClick={() => { setShowPosition(!showPosition); setShowCustom(false); }} icon={LayoutGrid} label="Posição" />
          </div>
        )}

        {/* Custom size panel */}
        {showCustom && !resizing && (
          <div className="absolute -top-[5.5rem] left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg px-3 py-2 z-20 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <label className="text-[10px] text-muted-foreground font-medium">L:</label>
                <input
                  type="number"
                  value={editW}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
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

        {/* Position panel */}
        {showPosition && !resizing && (
          <div className="absolute -top-[13rem] left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg px-3 py-2.5 z-20">
            <p className="text-[10px] text-muted-foreground font-medium mb-2 text-center">Posição na Página</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ["left","top"], ["none","top"], ["right","top"],
                ["left","middle"], ["none","middle"], ["right","middle"],
                ["left","bottom"], ["none","bottom"], ["right","bottom"],
              ] as const).map(([f, v], i) => (
                <button
                  key={i}
                  onClick={() => { updateAttributes({ float: f }); setShowPosition(false); }}
                  className={cn(
                    "w-11 h-14 rounded border relative overflow-hidden transition-colors",
                    currentFloat === f ? "border-primary bg-primary/10" : "border-input hover:bg-muted"
                  )}
                >
                  <div className="absolute inset-1 flex flex-col justify-between">
                    {[0,1,2,3,4,5].map(l => <div key={l} className="h-[1.5px] bg-muted-foreground/20 rounded-full" />)}
                  </div>
                  <div className={cn(
                    "absolute w-3.5 h-2 bg-primary/50 rounded-[1px]",
                    f === "left" && "left-1", f === "none" && "left-1/2 -translate-x-1/2", f === "right" && "right-1",
                    v === "top" && "top-1", v === "middle" && "top-1/2 -translate-y-1/2", v === "bottom" && "bottom-1"
                  )} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Size indicator */}
        {showHandles && (
          <div className="absolute bottom-1 right-1 bg-foreground/70 text-background text-[9px] px-1.5 py-0.5 rounded font-mono pointer-events-none">
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
      border: { default: "none" },
      shadow: { default: "none" },
      borderRadius: { default: "0" },
      filter: { default: "" },
      rotation: { default: 0 },
      flipH: { default: false },
      flipV: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { customWidth, customHeight, float, border, shadow, borderRadius, filter, rotation, flipH, flipV, ...rest } = HTMLAttributes;
    const parts: string[] = [];
    if (customWidth) parts.push(`width:${customWidth}px`);
    if (customHeight) parts.push(`height:${customHeight}px;object-fit:contain`);
    if (float === "left") parts.push("float:left;margin-right:1rem");
    if (float === "right") parts.push("float:right;margin-left:1rem");
    if (float === "top-bottom") parts.push("display:block;clear:both;margin:1rem auto");
    if (border && border !== "none") parts.push(`border:${border}`);
    if (shadow && shadow !== "none") parts.push(`box-shadow:${shadow}`);
    if (borderRadius && borderRadius !== "0") parts.push(`border-radius:${borderRadius}`);
    if (filter) parts.push(`filter:${filter}`);
    const transforms: string[] = [];
    if (rotation) transforms.push(`rotate(${rotation}deg)`);
    if (flipH) transforms.push("scaleX(-1)");
    if (flipV) transforms.push("scaleY(-1)");
    if (transforms.length) parts.push(`transform:${transforms.join(" ")}`);
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
