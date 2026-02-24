import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  Minimize2,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

type ImageSize = "small" | "medium" | "large";
type ImageFloat = "none" | "left" | "right";

const sizeConfig: Record<ImageSize, { width: string; label: string }> = {
  small: { width: "200px", label: "P" },
  medium: { width: "400px", label: "M" },
  large: { width: "100%", label: "G" },
};

function ResizableImageView({ node, updateAttributes, selected }: any) {
  const { src, alt, size = "large", float = "none" } = node.attrs;
  const [showControls, setShowControls] = useState(false);

  const currentSize: ImageSize = size;
  const currentFloat: ImageFloat = float;

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
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="relative inline-block" style={{ width: sizeConfig[currentSize].width, maxWidth: "100%" }}>
        <img
          src={src}
          alt={alt || ""}
          className={cn(
            "block w-full h-auto rounded transition-shadow",
            selected && "ring-2 ring-primary ring-offset-2"
          )}
          draggable={false}
        />

        {/* Controls overlay */}
        {(showControls || selected) && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-lg px-1.5 py-1 z-10">
            {/* Size buttons */}
            <span className="text-[10px] text-muted-foreground mr-1 font-medium">Tamanho:</span>
            <ControlButton
              active={currentSize === "small"}
              onClick={() => updateAttributes({ size: "small" })}
              icon={Minimize2}
              label="Pequeno"
            />
            <ControlButton
              active={currentSize === "medium"}
              onClick={() => updateAttributes({ size: "medium" })}
              icon={Square}
              label="Médio"
            />
            <ControlButton
              active={currentSize === "large"}
              onClick={() => updateAttributes({ size: "large" })}
              icon={Maximize2}
              label="Grande"
            />

            <div className="w-px h-4 bg-border mx-1" />

            {/* Position buttons */}
            <span className="text-[10px] text-muted-foreground mr-1 font-medium">Posição:</span>
            <ControlButton
              active={currentFloat === "left"}
              onClick={() => updateAttributes({ float: currentFloat === "left" ? "none" : "left" })}
              icon={AlignLeft}
              label="Esquerda do texto"
            />
            <ControlButton
              active={currentFloat === "none"}
              onClick={() => updateAttributes({ float: "none" })}
              icon={AlignCenter}
              label="Centralizado"
            />
            <ControlButton
              active={currentFloat === "right"}
              onClick={() => updateAttributes({ float: currentFloat === "right" ? "none" : "right" })}
              icon={AlignRight}
              label="Direita do texto"
            />
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
      size: { default: "large" },
      float: { default: "none" },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { size, float, ...rest } = HTMLAttributes;
    const style = `width:${sizeConfig[size as ImageSize]?.width || "100%"};${
      float === "left" ? "float:left;margin-right:1rem;" : float === "right" ? "float:right;margin-left:1rem;" : ""
    }`;
    return ["img", mergeAttributes(rest, { style })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string; size?: string; float?: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    } as any;
  },
});
