import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type TabStopType = "left" | "center" | "right" | "decimal";

export interface TabStop {
  id: string;
  position: number; // px from left edge
  type: TabStopType;
}

interface EditorRulerProps {
  pageWidth?: number;
  marginLeft: number;
  marginRight: number;
  onMarginLeftChange: (px: number) => void;
  onMarginRightChange: (px: number) => void;
  firstLineIndent: number;
  onFirstLineIndentChange: (px: number) => void;
  tabStops: TabStop[];
  onTabStopsChange: (stops: TabStop[]) => void;
}

const tabStopIcons: Record<TabStopType, { svg: string; label: string }> = {
  left: {
    svg: '<line x1="4" y1="2" x2="4" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="10" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/>',
    label: "Esquerda",
  },
  center: {
    svg: '<line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="10" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/>',
    label: "Centro",
  },
  right: {
    svg: '<line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="10" x2="8" y2="10" stroke="currentColor" stroke-width="1.5"/>',
    label: "Direita",
  },
  decimal: {
    svg: '<line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="10" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6" r="1" fill="currentColor"/>',
    label: "Decimal",
  },
};

const tabStopCycle: TabStopType[] = ["left", "center", "right", "decimal"];

export function EditorRuler({
  pageWidth = 794,
  marginLeft,
  marginRight,
  onMarginLeftChange,
  onMarginRightChange,
  firstLineIndent,
  onFirstLineIndentChange,
  tabStops,
  onTabStopsChange,
}: EditorRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"left" | "right" | "indent" | null>(null);
  const [draggingTab, setDraggingTab] = useState<string | null>(null);
  const [nextTabType, setNextTabType] = useState<TabStopType>("left");

  // Cycle through tab types when clicking the tab type selector
  const cycleTabType = () => {
    const idx = tabStopCycle.indexOf(nextTabType);
    setNextTabType(tabStopCycle[(idx + 1) % tabStopCycle.length]);
  };

  // Add tab stop on ruler click (not on handles)
  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    // Don't add if clicking on an existing handle
    const target = e.target as HTMLElement;
    if (target.closest('[data-handle]')) return;

    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Only add within content area
    if (x <= marginLeft || x >= pageWidth - marginRight) return;

    const newStop: TabStop = {
      id: crypto.randomUUID(),
      position: Math.round(x),
      type: nextTabType,
    };
    onTabStopsChange([...tabStops, newStop].sort((a, b) => a.position - b.position));
  }, [tabStops, onTabStopsChange, nextTabType, marginLeft, marginRight, pageWidth]);

  // Drag tab stop
  const handleTabMouseDown = useCallback((tabId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTab(tabId);

    const startX = e.clientX;
    const tab = tabStops.find(t => t.id === tabId);
    if (!tab) return;
    const startPos = tab.position;

    const handleMove = (me: MouseEvent) => {
      const delta = me.clientX - startX;
      const newPos = Math.round(Math.max(marginLeft, Math.min(pageWidth - marginRight, startPos + delta)));
      onTabStopsChange(tabStops.map(t => t.id === tabId ? { ...t, position: newPos } : t).sort((a, b) => a.position - b.position));
    };

    const handleUp = (me: MouseEvent) => {
      setDraggingTab(null);
      // If dragged off ruler (below), remove the tab stop
      if (rulerRef.current) {
        const rect = rulerRef.current.getBoundingClientRect();
        if (me.clientY > rect.bottom + 30) {
          onTabStopsChange(tabStops.filter(t => t.id !== tabId));
        }
      }
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, [tabStops, onTabStopsChange, marginLeft, marginRight, pageWidth]);

  // Double-click to change tab type
  const handleTabDoubleClick = useCallback((tabId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTabStopsChange(tabStops.map(t => {
      if (t.id !== tabId) return t;
      const idx = tabStopCycle.indexOf(t.type);
      return { ...t, type: tabStopCycle[(idx + 1) % tabStopCycle.length] };
    }));
  }, [tabStops, onTabStopsChange]);

  const handleMouseDown = useCallback((type: "left" | "right" | "indent") => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    ticks.push(
      <div key={i} className="absolute top-0" style={{ left: `${x}px` }}>
        <div className="w-px h-3 bg-muted-foreground/40" />
        <span className="absolute -top-0.5 left-0.5 text-[8px] text-muted-foreground/50 select-none leading-none">
          {i}
        </span>
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

  const currentIcon = tabStopIcons[nextTabType];

  return (
    <div className="flex items-stretch">
      {/* Tab type selector button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={cycleTabType}
            className="w-5 h-5 flex items-center justify-center border border-border bg-muted/40 hover:bg-muted transition-colors rounded-l text-muted-foreground hover:text-foreground shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" dangerouslySetInnerHTML={{ __html: currentIcon.svg }} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px]">
          Tabulação: {currentIcon.label} — clique para alternar
        </TooltipContent>
      </Tooltip>

      {/* Ruler */}
      <div
        ref={rulerRef}
        className="relative h-5 bg-muted/40 border-b border-t border-r border-border overflow-visible select-none cursor-crosshair"
        style={{ width: `${pageWidth}px` }}
        onClick={handleRulerClick}
      >
        {/* Margin shading */}
        <div className="absolute inset-y-0 left-0 bg-muted-foreground/8 pointer-events-none" style={{ width: `${marginLeft}px` }} />
        <div className="absolute inset-y-0 right-0 bg-muted-foreground/8 pointer-events-none" style={{ width: `${marginRight}px` }} />

        {/* Ticks */}
        <div className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none">
          {ticks}
        </div>

        {/* Left margin handle */}
        <div
          data-handle
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
          data-handle
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
          data-handle
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

        {/* Tab stops */}
        {tabStops.map((tab) => {
          const icon = tabStopIcons[tab.type];
          return (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <div
                  data-handle
                  onMouseDown={handleTabMouseDown(tab.id)}
                  onDoubleClick={handleTabDoubleClick(tab.id)}
                  className={cn(
                    "absolute bottom-0 w-3 h-3 cursor-move z-20 group",
                    draggingTab === tab.id && "scale-125"
                  )}
                  style={{ left: `${tab.position - 6}px` }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="text-foreground/70 group-hover:text-primary transition-colors"
                    dangerouslySetInnerHTML={{ __html: icon.svg }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                Tab {icon.label} em {Math.round(tab.position / 37.8 * 10) / 10} cm — duplo clique para alternar tipo · arraste para fora para remover
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
