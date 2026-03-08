import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface EditorRulerProps {
  /** Page width in px (default 794 = ~210mm at 96dpi) */
  pageWidth?: number;
  marginLeft: number;
  marginRight: number;
  onMarginLeftChange: (px: number) => void;
  onMarginRightChange: (px: number) => void;
  firstLineIndent: number;
  onFirstLineIndentChange: (px: number) => void;
}

export function EditorRuler({
  pageWidth = 794,
  marginLeft,
  marginRight,
  onMarginLeftChange,
  onMarginRightChange,
  firstLineIndent,
  onFirstLineIndentChange,
}: EditorRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"left" | "right" | "indent" | null>(null);

  const handleMouseDown = useCallback((type: "left" | "right" | "indent") => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);

    const startX = e.clientX;
    const startVal = type === "left" ? marginLeft : type === "right" ? marginRight : firstLineIndent;

    const handleMove = (me: MouseEvent) => {
      const delta = me.clientX - startX;
      const newVal = Math.max(0, Math.min(pageWidth / 3, type === "right" ? startVal - delta : startVal + delta));
      if (type === "left") onMarginLeftChange(Math.round(newVal));
      else if (type === "right") onMarginRightChange(Math.round(newVal));
      else onFirstLineIndentChange(Math.round(Math.max(0, Math.min(200, startVal + delta))));
    };

    const handleUp = () => {
      setDragging(null);
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, [marginLeft, marginRight, firstLineIndent, pageWidth, onMarginLeftChange, onMarginRightChange, onFirstLineIndentChange]);

  // Render tick marks every 1cm (~37.8px at 96dpi)
  const cmPx = 37.8;
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= Math.floor(pageWidth / cmPx); i++) {
    const x = i * cmPx;
    const isMajor = i % 1 === 0;
    ticks.push(
      <div key={i} className="absolute top-0" style={{ left: `${x}px` }}>
        <div className={cn("bg-muted-foreground/40", isMajor ? "w-px h-3" : "w-px h-1.5")} />
        {isMajor && (
          <span className="absolute -top-0.5 left-0.5 text-[8px] text-muted-foreground/50 select-none leading-none">
            {i}
          </span>
        )}
      </div>
    );
    // Half-cm tick
    if (x + cmPx / 2 < pageWidth) {
      ticks.push(
        <div key={`${i}h`} className="absolute top-0" style={{ left: `${x + cmPx / 2}px` }}>
          <div className="w-px h-2 bg-muted-foreground/25" />
        </div>
      );
    }
  }

  return (
    <div
      ref={rulerRef}
      className="relative h-5 bg-muted/40 border-b border-border overflow-hidden select-none"
      style={{ width: `${pageWidth}px` }}
    >
      {/* Margin shading */}
      <div className="absolute inset-y-0 left-0 bg-muted-foreground/8" style={{ width: `${marginLeft}px` }} />
      <div className="absolute inset-y-0 right-0 bg-muted-foreground/8" style={{ width: `${marginRight}px` }} />

      {/* Ticks */}
      <div className="absolute bottom-0 left-0 right-0 h-3">
        {ticks}
      </div>

      {/* Left margin handle */}
      <div
        onMouseDown={handleMouseDown("left")}
        className={cn(
          "absolute top-0 bottom-0 w-2 cursor-col-resize z-10 group",
          dragging === "left" && "bg-primary/20"
        )}
        style={{ left: `${marginLeft - 4}px` }}
        title={`Margem esquerda: ${marginLeft}px`}
      >
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-1 h-3 bg-primary/60 rounded-full group-hover:bg-primary transition-colors" />
      </div>

      {/* First line indent handle */}
      <div
        onMouseDown={handleMouseDown("indent")}
        className={cn(
          "absolute top-0 w-3 h-2.5 cursor-col-resize z-10 group",
          dragging === "indent" && "bg-accent/30"
        )}
        style={{ left: `${marginLeft + firstLineIndent - 6}px` }}
        title={`Recuo da 1ª linha: ${firstLineIndent}px`}
      >
        <svg viewBox="0 0 12 10" className="w-3 h-2.5 text-primary/70 group-hover:text-primary transition-colors">
          <polygon points="6,10 0,0 12,0" fill="currentColor" />
        </svg>
      </div>

      {/* Right margin handle */}
      <div
        onMouseDown={handleMouseDown("right")}
        className={cn(
          "absolute top-0 bottom-0 w-2 cursor-col-resize z-10 group",
          dragging === "right" && "bg-primary/20"
        )}
        style={{ right: `${marginRight - 4}px` }}
        title={`Margem direita: ${marginRight}px`}
      >
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-1 h-3 bg-primary/60 rounded-full group-hover:bg-primary transition-colors" />
      </div>
    </div>
  );
}
