import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { ObjectToolbar, floatStyles, sizePresets, type ObjectFloat, type PresetSize } from "./ObjectToolbar";

function ResizableImageView({ node, updateAttributes, selected }: any) {
  const { src, alt, customWidth, customHeight, float = "none", border = "none", shadow = "none", borderRadius = "0", filter = "", rotation = 0, flipH = false, flipV = false } = node.attrs;
  const [showControls, setShowControls] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [editW, setEditW] = useState<string>(String(customWidth || ""));
  const [editH, setEditH] = useState<string>(String(customHeight || ""));
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [resizing, setResizing] = useState<null | string>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });

  const currentFloat: ObjectFloat = float;

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  const aspectRatio = naturalSize ? naturalSize.w / naturalSize.h : 1;

  const activePreset: PresetSize =
    customWidth === sizePresets.small.w ? "small"
    : customWidth === sizePresets.medium.w ? "medium"
    : customWidth === sizePresets.large.w ? "large"
    : customWidth ? "custom" : "large";

  const displayWidth = customWidth || sizePresets.large.w;
  const displayHeight = customHeight || (customWidth ? Math.round(customWidth / aspectRatio) : undefined);

  const applyPreset = (key: Exclude<PresetSize, "custom">) => {
    const w = sizePresets[key].w;
    const h = Math.round(w / aspectRatio);
    updateAttributes({ customWidth: w, customHeight: h });
    setEditW(String(w));
    setEditH(String(h));
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

  const onResizeStart = useCallback(
    (handle: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(handle);
      startRef.current = { x: e.clientX, y: e.clientY, w: displayWidth, h: displayHeight || Math.round(displayWidth / aspectRatio) };

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startRef.current.x;
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
      onMouseEnter={() => { setIsHovered(true); setShowControls(true); }}
      onMouseLeave={() => { setIsHovered(false); if (!resizing) setShowControls(false); }}
    >
      <div ref={containerRef} className="relative inline-block" style={{ width: `${displayWidth}px`, maxWidth: "100%" }}>
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
            transform: [rotation ? `rotate(${rotation}deg)` : "", flipH ? "scaleX(-1)" : "", flipV ? "scaleY(-1)" : ""].filter(Boolean).join(" ") || undefined,
          }}
          className={cn("block w-full h-auto rounded transition-all select-none", selected && "ring-2 ring-primary ring-offset-2", !displayHeight && "h-auto")}
          draggable={false}
        />

        {showHandles && (
          <div className="absolute top-1 left-1 p-0.5 rounded bg-foreground/60 text-background cursor-grab active:cursor-grabbing" title="Arraste para mover" data-drag-handle="">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}

        {showHandles && (
          <>
            <div onMouseDown={onResizeStart("e")} className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-8 bg-primary/80 rounded-full cursor-ew-resize hover:bg-primary transition-colors" />
            <div onMouseDown={onResizeStart("w")} className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-8 bg-primary/80 rounded-full cursor-ew-resize hover:bg-primary transition-colors" />
            <div onMouseDown={onResizeStart("se")} className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full cursor-nwse-resize border-2 border-card hover:scale-110 transition-transform" />
            <div onMouseDown={onResizeStart("sw")} className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-primary rounded-full cursor-nesw-resize border-2 border-card hover:scale-110 transition-transform" />
          </>
        )}

        {showHandles && !resizing && (
          <ObjectToolbar
            currentFloat={currentFloat}
            onFloatChange={(f) => updateAttributes({ float: f })}
            activePreset={activePreset}
            onPresetChange={applyPreset}
            customWidth={editW}
            customHeight={editH}
            onWidthChange={handleWidthChange}
            onHeightChange={handleHeightChange}
            naturalSize={naturalSize}
            showSizeControls={true}
          />
        )}

        {showHandles && (
          <div className="absolute bottom-1 right-1 bg-foreground/70 text-background text-[9px] px-1.5 py-0.5 rounded font-mono pointer-events-none">
            {displayWidth} × {displayHeight || "auto"}
          </div>
        )}
      </div>
    </NodeViewWrapper>
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
          return commands.insertContent({ type: this.name, attrs: options });
        },
    } as any;
  },
});
