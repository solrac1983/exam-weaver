import { Editor } from "@tiptap/react";
import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { chartDataToImageSrc, serializeChartData, getDefaultChartData, type ChartData } from "../ChartEditorTab";

const charts = [
  { label: "Gráfico de Barras", type: "bar" as const, svg: '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="80" width="25" height="30" fill="#3b82f6" rx="2"/><rect x="45" y="50" width="25" height="60" fill="#3b82f6" rx="2"/><rect x="80" y="30" width="25" height="80" fill="#3b82f6" rx="2"/><rect x="115" y="60" width="25" height="50" fill="#3b82f6" rx="2"/><rect x="150" y="40" width="25" height="70" fill="#3b82f6" rx="2"/><line x1="5" y1="110" x2="185" y2="110" stroke="#666" stroke-width="1.5"/></svg>' },
  { label: "Gráfico de Linhas", type: "line" as const, svg: '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><polyline points="10,90 45,60 80,70 115,30 150,45 185,20" fill="none" stroke="#8b5cf6" stroke-width="2.5"/></svg>' },
  { label: "Gráfico de Pizza", type: "pie" as const, svg: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 60 L60 10 A50 50 0 0 1 103 85 Z" fill="#3b82f6"/><path d="M60 60 L103 85 A50 50 0 0 1 17 85 Z" fill="#10b981"/><path d="M60 60 L17 85 A50 50 0 0 1 60 10 Z" fill="#f59e0b"/></svg>' },
  { label: "Gráfico de Área", type: "area" as const, svg: '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><polygon points="10,100 10,80 50,55 90,65 130,30 170,40 190,20 190,100" fill="#3b82f6" opacity="0.25"/><polyline points="10,80 50,55 90,65 130,30 170,40 190,20" fill="none" stroke="#3b82f6" stroke-width="2"/></svg>' },
  { label: "Espaço reservado", type: null, svg: '' },
];

export function ChartsDropdown({ editor }: { editor: Editor }) {
  const insertChart = (chart: typeof charts[0]) => {
    if (!chart.type) {
      editor.chain().focus().insertContent(
        '<p style="text-align:center;padding:30px 20px;border:2px dashed currentColor;border-radius:8px;opacity:0.5;margin:8px 0;">📊 [Espaço reservado para gráfico]</p>'
      ).run();
      return;
    }
    const data = getDefaultChartData(chart.type);
    const src = chartDataToImageSrc(data, 400, 260);
    const alt = serializeChartData(data);
    (editor.commands as any).setImage({ src, alt, customWidth: 400, customHeight: 260 });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <BarChart3 className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px] p-2">
        <DropdownMenuLabel className="text-[10px]">Inserir gráfico</DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {charts.map((chart) => (
            <button key={chart.label} onClick={() => insertChart(chart)}
              className="flex flex-col items-center gap-1 p-2 rounded border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
              {chart.svg ? (
                <div className="w-full h-12 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: chart.svg.replace('<svg ', '<svg class="w-full h-full" ') }} />
              ) : (
                <div className="w-full h-12 flex items-center justify-center text-2xl opacity-50">📐</div>
              )}
              <span className="text-[10px] text-muted-foreground font-medium leading-tight text-center">{chart.label}</span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
