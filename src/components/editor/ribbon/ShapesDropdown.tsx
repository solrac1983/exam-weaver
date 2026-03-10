import { cn } from "@/lib/utils";
import { useState } from "react";
import { Shapes } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const shapeCategories = [
  { label: "Linhas", shapes: [
    { name: "Linha horizontal", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="50" x2="95" y2="50"/></svg>' },
    { name: "Seta →", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="50" x2="85" y2="50"/><polyline points="75,35 90,50 75,65"/></svg>' },
    { name: "Curva", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><path d="M10 80 Q50 10 90 80"/></svg>' },
  ]},
  { label: "Retângulos", shapes: [
    { name: "Retângulo", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="5" y="15" width="90" height="70"/></svg>' },
    { name: "Retângulo arredondado", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="5" y="15" width="90" height="70" rx="12"/></svg>' },
    { name: "Quadrado", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="10" y="10" width="80" height="80"/></svg>' },
  ]},
  { label: "Formas Básicas", shapes: [
    { name: "Círculo", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><circle cx="50" cy="50" r="44"/></svg>' },
    { name: "Triângulo", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="50,8 95,90 5,90"/></svg>' },
    { name: "Losango", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="50,5 95,50 50,95 5,50"/></svg>' },
    { name: "Estrela", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><polygon points="50,5 61,38 97,38 68,59 79,93 50,72 21,93 32,59 3,38 39,38"/></svg>' },
    { name: "Coração", svg: '<svg viewBox="0 0 100 100" fill="currentColor" stroke="none"><path d="M50 88 C25 65 5 50 5 30 A22 22 0 0 1 50 20 A22 22 0 0 1 95 30 C95 50 75 65 50 88Z"/></svg>' },
  ]},
  { label: "Setas Largas", shapes: [
    { name: "Seta direita", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="5,35 60,35 60,15 95,50 60,85 60,65 5,65"/></svg>' },
    { name: "Seta esquerda", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="95,35 40,35 40,15 5,50 40,85 40,65 95,65"/></svg>' },
  ]},
  { label: "Fluxograma", shapes: [
    { name: "Processo", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="5" y="20" width="90" height="60"/></svg>' },
    { name: "Decisão", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><polygon points="50,5 95,50 50,95 5,50"/></svg>' },
    { name: "Terminal", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><rect x="5" y="25" width="90" height="50" rx="25"/></svg>' },
  ]},
];

const shapeColors = [
  { label: "Preto", value: "#000000" }, { label: "Branco", value: "#ffffff" },
  { label: "Vermelho", value: "#dc2626" }, { label: "Azul", value: "#2563eb" },
  { label: "Verde", value: "#16a34a" }, { label: "Roxo", value: "#9333ea" },
  { label: "Cinza", value: "#6b7280" }, { label: "Nenhum", value: "none" },
];

export function ShapesDropdown({ onInsert }: { onInsert: (svg: string, size?: number, fill?: string, stroke?: string, strokeWidth?: number) => void }) {
  const [fillColor, setFillColor] = useState("#000000");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [shapeSize, setShapeSize] = useState(80);
  const [strokeWidth, setStrokeWidth] = useState(3);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Shapes className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px] max-h-[450px] overflow-y-auto p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="flex items-center gap-2 px-1 pb-2 border-b border-border mb-1 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Preencher:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-5 h-5 rounded border border-border" style={{ background: fillColor === "none" ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px" : fillColor }} />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[100px] p-1">
                <div className="grid grid-cols-4 gap-1">
                  {shapeColors.map((c) => (
                    <button key={c.value} onClick={() => setFillColor(c.value)} title={c.label}
                      className={cn("w-5 h-5 rounded border transition-all", fillColor === c.value ? "border-primary ring-1 ring-primary" : "border-border")}
                      style={{ background: c.value === "none" ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 6px 6px" : c.value }} />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Borda:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-5 h-5 rounded border-2" style={{ borderColor: strokeColor === "none" ? "#ccc" : strokeColor, background: "transparent" }} />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[100px] p-1">
                <div className="grid grid-cols-4 gap-1">
                  {shapeColors.map((c) => (
                    <button key={c.value} onClick={() => setStrokeColor(c.value)} title={c.label}
                      className={cn("w-5 h-5 rounded border transition-all", strokeColor === c.value ? "border-primary ring-1 ring-primary" : "border-border")}
                      style={{ background: c.value === "none" ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 6px 6px" : c.value }} />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Tam:</span>
            <select value={shapeSize} onChange={(e) => setShapeSize(Number(e.target.value))} className="text-[10px] bg-background border border-input rounded px-1 py-0.5">
              {[40, 60, 80, 120, 160, 200].map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
          </div>
        </div>
        {shapeCategories.map((cat) => (
          <div key={cat.label}>
            <p className="text-[10px] font-semibold text-muted-foreground px-1 pt-2 pb-1">{cat.label}</p>
            <div className="grid grid-cols-8 gap-0.5">
              {cat.shapes.map((shape) => (
                <Tooltip key={shape.name}>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => onInsert(shape.svg, shapeSize, fillColor, strokeColor, strokeWidth)}
                      className="w-8 h-8 p-1 rounded hover:bg-muted border border-transparent hover:border-border transition-colors flex items-center justify-center text-foreground"
                      dangerouslySetInnerHTML={{ __html: shape.svg.replace('<svg ', '<svg class="w-5 h-5" ') }} />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">{shape.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
