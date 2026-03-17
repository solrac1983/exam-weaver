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
  position: number;
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
  hangingIndent: number;
  onHangingIndentChange: (px: number) => void;
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

/** Ruler height in px */
const RULER_H = 18;
const CM_PX = 37.8;

export function EditorRuler({
  pageWidth = 794,
  marginLeft,
  marginRight,
  onMarginLeftChange,
  onMarginRightChange,
  firstLineIndent,
  onFirstLineIndentChange,
  hangingIndent,
  onHangingIndentChange,
  tabStops,
  onTabStopsChange,
}: EditorRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"left" | "right" | "indent" | "hanging" | null>(null);
  const [draggingTab, setDraggingTab] = useState<string | null>(null);
  const [nextTabType, setNextTabType] = useState<TabStopType>("left");

  const cycleTabType = () => {
    const idx = tabStopCycle.indexOf(nextTabType);
    setNextTabType(tabStopCycle[(idx + 1) % tabStopCycle.length]);
  };

  const handleRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!rulerRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-handle]")) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x <= marginLeft || x >= pageWidth - marginRight) return;
      const newStop: TabStop = {
        id: crypto.randomUUID(),
        position: Math.round(x),
        type: nextTabType,
      };
      onTabStopsChange(
        [...tabStops, newStop].sort((a, b) => a.position - b.position)
      );
    },
    [tabStops, onTabStopsChange, nextTabType, marginLeft, marginRight, pageWidth]
  );

  const handleTabMouseDown = useCallback(
    (tabId: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingTab(tabId);
      const startX = e.clientX;
      const tab = tabStops.find((t) => t.id === tabId);
      if (!tab) return;
      const startPos = tab.position;

      const handleMove = (me: MouseEvent) => {
        const delta = me.clientX - startX;
        const newPos = Math.round(
          Math.max(marginLeft, Math.min(pageWidth - marginRight, startPos + delta))
        );
        onTabStopsChange(
          tabStops
            .map((t) => (t.id === tabId ? { ...t, position: newPos } : t))
            .sort((a, b) => a.position - b.position)
        );
      };
      const handleUp = (me: MouseEvent) => {
        setDraggingTab(null);
        if (rulerRef.current) {
          const rect = rulerRef.current.getBoundingClientRect();
          if (me.clientY > rect.bottom + 30) {
            onTabStopsChange(tabStops.filter((t) => t.id !== tabId));
          }
        }
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [tabStops, onTabStopsChange, marginLeft, marginRight, pageWidth]
  );

  const handleTabDoubleClick = useCallback(
    (tabId: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onTabStopsChange(
        tabStops.map((t) => {
          if (t.id !== tabId) return t;
          const idx = tabStopCycle.indexOf(t.type);
          return { ...t, type: tabStopCycle[(idx + 1) % tabStopCycle.length] };
        })
      );
    },
    [tabStops, onTabStopsChange]
  );

  const handleMouseDown = useCallback(
    (type: "left" | "right" | "indent" | "hanging") =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(type);
        const startX = e.clientX;

        let startVal: number;
        if (type === "left") startVal = marginLeft;
        else if (type === "right") startVal = marginRight;
        else if (type === "indent") startVal = firstLineIndent;
        else startVal = hangingIndent;

        const handleMove = (me: MouseEvent) => {
          const delta = me.clientX - startX;
          if (type === "left") {
            onMarginLeftChange(Math.round(Math.max(0, Math.min(pageWidth / 3, startVal + delta))));
          } else if (type === "right") {
            onMarginRightChange(Math.round(Math.max(0, Math.min(pageWidth / 3, startVal - delta))));
          } else if (type === "indent") {
            onFirstLineIndentChange(Math.round(Math.max(-200, Math.min(300, startVal + delta))));
          } else {
            setHangingIndent(Math.round(Math.max(0, Math.min(300, startVal + delta))));
          }
        };
        const handleUp = () => {
          setDragging(null);
          document.removeEventListener("mousemove", handleMove);
          document.removeEventListener("mouseup", handleUp);
        };
        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", handleUp);
      },
    [marginLeft, marginRight, firstLineIndent, hangingIndent, pageWidth, onMarginLeftChange, onMarginRightChange, onFirstLineIndentChange]
  );

  // Build tick marks — numbered every cm
  const ticks: React.ReactNode[] = [];
  const totalCm = Math.floor(pageWidth / CM_PX);
  for (let i = 0; i <= totalCm; i++) {
    const x = i * CM_PX;
    // Full cm tick
    ticks.push(
      <div key={i} className="absolute" style={{ left: `${x}px`, bottom: 0 }}>
        <div className="w-px bg-muted-foreground/50" style={{ height: "6px" }} />
      </div>
    );
    // Number label
    if (i > 0) {
      ticks.push(
        <span
          key={`n${i}`}
          className="absolute text-[9px] text-muted-foreground/70 select-none leading-none font-medium"
          style={{ left: `${x}px`, bottom: "6px", transform: "translateX(-50%)" }}
        >
          {i}
        </span>
      );
    }
    // Half-cm tick
    const halfX = x + CM_PX / 2;
    if (halfX < pageWidth) {
      ticks.push(
        <div key={`h${i}`} className="absolute" style={{ left: `${halfX}px`, bottom: 0 }}>
          <div className="w-px bg-muted-foreground/30" style={{ height: "4px" }} />
        </div>
      );
    }
    // Quarter ticks
    const q1 = x + CM_PX / 4;
    const q3 = x + (CM_PX * 3) / 4;
    if (q1 < pageWidth) {
      ticks.push(
        <div key={`q1${i}`} className="absolute" style={{ left: `${q1}px`, bottom: 0 }}>
          <div className="w-px bg-muted-foreground/20" style={{ height: "2px" }} />
        </div>
      );
    }
    if (q3 < pageWidth) {
      ticks.push(
        <div key={`q3${i}`} className="absolute" style={{ left: `${q3}px`, bottom: 0 }}>
          <div className="w-px bg-muted-foreground/20" style={{ height: "2px" }} />
        </div>
      );
    }
  }

  const currentIcon = tabStopIcons[nextTabType];

  // Positions for the Word-style indent markers
  const leftEdge = marginLeft;
  const rightEdge = pageWidth - marginRight;
  const firstLinePos = leftEdge + firstLineIndent;
  const hangingPos = leftEdge + hangingIndent;

  return (
    <div className="flex items-end">
      {/* Tab type selector */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={cycleTabType}
            className="flex items-center justify-center border border-border bg-background hover:bg-muted transition-colors shrink-0"
            style={{ width: RULER_H + 4, height: RULER_H + 4 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" dangerouslySetInnerHTML={{ __html: currentIcon.svg }} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px]">
          Tabulação: {currentIcon.label} — clique para alternar
        </TooltipContent>
      </Tooltip>

      {/* Ruler bar */}
      <div
        ref={rulerRef}
        className="relative bg-[hsl(0,0%,95%)] border-b border-border overflow-visible select-none cursor-crosshair"
        style={{ width: `${pageWidth}px`, height: `${RULER_H + 4}px` }}
        onClick={handleRulerClick}
      >
        {/* Margin shading (gray areas outside margins) */}
        <div
          className="absolute inset-y-0 left-0 bg-[hsl(0,0%,85%)]"
          style={{ width: `${marginLeft}px` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-[hsl(0,0%,85%)]"
          style={{ width: `${marginRight}px` }}
        />

        {/* Tick marks */}
        <div className="absolute inset-0 pointer-events-none">{ticks}</div>

        {/* ─── Word-style indent markers ─── */}

        {/* First Line Indent: ▼ triangle at top */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              data-handle
              onMouseDown={handleMouseDown("indent")}
              className={cn(
                "absolute z-20 cursor-pointer group",
                dragging === "indent" && "opacity-70"
              )}
              style={{ left: `${firstLinePos - 5}px`, top: 0 }}
            >
              <svg width="10" height="8" viewBox="0 0 10 8">
                <polygon
                  points="0,0 10,0 5,8"
                  fill={dragging === "indent" ? "hsl(213,80%,45%)" : "hsl(0,0%,50%)"}
                  className="group-hover:fill-[hsl(213,80%,45%)] transition-colors"
                />
              </svg>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">
            Recuo da primeira linha: {Math.round(firstLineIndent / CM_PX * 10) / 10} cm
          </TooltipContent>
        </Tooltip>

        {/* Hanging Indent: ▲ triangle at bottom */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              data-handle
              onMouseDown={handleMouseDown("hanging")}
              className={cn(
                "absolute z-20 cursor-pointer group",
                dragging === "hanging" && "opacity-70"
              )}
              style={{ left: `${hangingPos - 5}px`, bottom: 0 }}
            >
              <svg width="10" height="8" viewBox="0 0 10 8">
                <polygon
                  points="0,8 10,8 5,0"
                  fill={dragging === "hanging" ? "hsl(213,80%,45%)" : "hsl(0,0%,50%)"}
                  className="group-hover:fill-[hsl(213,80%,45%)] transition-colors"
                />
              </svg>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">
            Recuo deslocado: {Math.round(hangingIndent / CM_PX * 10) / 10} cm
          </TooltipContent>
        </Tooltip>

        {/* Left Margin: □ small rectangle below hanging indent */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              data-handle
              onMouseDown={handleMouseDown("left")}
              className={cn(
                "absolute z-10 cursor-col-resize group",
                dragging === "left" && "opacity-70"
              )}
              style={{ left: `${leftEdge - 4}px`, bottom: 0 }}
            >
              <svg width="8" height="5" viewBox="0 0 8 5">
                <rect
                  x="0" y="0" width="8" height="5" rx="1"
                  fill={dragging === "left" ? "hsl(213,80%,45%)" : "hsl(0,0%,50%)"}
                  className="group-hover:fill-[hsl(213,80%,45%)] transition-colors"
                />
              </svg>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">
            Margem esquerda: {Math.round(marginLeft / CM_PX * 10) / 10} cm
          </TooltipContent>
        </Tooltip>

        {/* Right Margin: ▲ triangle at bottom-right */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              data-handle
              onMouseDown={handleMouseDown("right")}
              className={cn(
                "absolute z-20 cursor-col-resize group",
                dragging === "right" && "opacity-70"
              )}
              style={{ left: `${rightEdge - 5}px`, bottom: 0 }}
            >
              <svg width="10" height="8" viewBox="0 0 10 8">
                <polygon
                  points="0,8 10,8 5,0"
                  fill={dragging === "right" ? "hsl(213,80%,45%)" : "hsl(0,0%,50%)"}
                  className="group-hover:fill-[hsl(213,80%,45%)] transition-colors"
                />
              </svg>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">
            Margem direita: {Math.round(marginRight / CM_PX * 10) / 10} cm
          </TooltipContent>
        </Tooltip>

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
                Tab {icon.label} em {Math.round((tab.position / CM_PX) * 10) / 10} cm
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
