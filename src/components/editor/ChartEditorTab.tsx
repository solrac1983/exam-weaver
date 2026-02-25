import { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  BarChart3, PieChart, TrendingUp, CircleDot, ScatterChart,
  Plus, Minus, Trash2, Palette, Type as TypeIcon,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

// ─── Chart Data Model ───
export interface ChartData {
  type: "bar" | "bar_h" | "line" | "pie" | "area" | "scatter";
  title: string;
  categories: string[];
  series: { name: string; values: number[]; color: string }[];
}

const defaultColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
const colorPalette = [
  "#3b82f6", "#2563eb", "#1d4ed8",
  "#10b981", "#059669", "#047857",
  "#f59e0b", "#d97706", "#b45309",
  "#ef4444", "#dc2626", "#b91c1c",
  "#8b5cf6", "#7c3aed", "#6d28d9",
  "#ec4899", "#db2777", "#be185d",
  "#06b6d4", "#0891b2", "#0e7490",
  "#84cc16", "#65a30d", "#4d7c0f",
  "#6b7280", "#374151", "#111827",
];

export const CHART_ALT_PREFIX = "chart:";

export function isChartImage(alt: string | null): boolean {
  return !!alt && alt.startsWith(CHART_ALT_PREFIX);
}

export function parseChartData(alt: string): ChartData | null {
  if (!alt.startsWith(CHART_ALT_PREFIX)) return null;
  try {
    return JSON.parse(alt.slice(CHART_ALT_PREFIX.length));
  } catch { return null; }
}

export function serializeChartData(data: ChartData): string {
  return CHART_ALT_PREFIX + JSON.stringify(data);
}

export function getDefaultChartData(type: ChartData["type"]): ChartData {
  return {
    type,
    title: "Título do Gráfico",
    categories: ["Cat 1", "Cat 2", "Cat 3", "Cat 4"],
    series: [
      { name: "Série 1", values: [4.3, 2.5, 3.5, 4.5], color: defaultColors[0] },
      { name: "Série 2", values: [2.4, 4.4, 1.8, 2.8], color: defaultColors[1] },
      { name: "Série 3", values: [2, 2, 3, 5], color: defaultColors[2] },
    ],
  };
}

// ─── SVG Chart Renderer ───
export function renderChartSVG(data: ChartData, w = 400, h = 260): string {
  const { type, title, categories, series } = data;
  const titleH = title ? 25 : 0;
  const padT = 15 + titleH, padB = 30, padL = 40, padR = 15;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  let allVals = series.flatMap(s => s.values);
  const maxVal = Math.max(...allVals, 1);

  const titleSvg = title ? `<text x="${w / 2}" y="${18}" text-anchor="middle" font-size="13" font-weight="600" fill="#374151">${escSvg(title)}</text>` : "";
  const axisColor = "#9ca3af";

  if (type === "bar") {
    const groupW = plotW / categories.length;
    const barW = Math.min(groupW * 0.7 / series.length, 30);
    const bars = categories.map((cat, ci) => {
      return series.map((s, si) => {
        const bh = (s.values[ci] / maxVal) * plotH;
        const x = padL + ci * groupW + (groupW - barW * series.length) / 2 + si * barW;
        const y = padT + plotH - bh;
        return `<rect x="${x}" y="${y}" width="${barW - 1}" height="${bh}" fill="${s.color}" rx="2"/>`;
      }).join("");
    }).join("");
    const labels = categories.map((cat, ci) => {
      const x = padL + ci * groupW + groupW / 2;
      return `<text x="${x}" y="${h - 8}" text-anchor="middle" font-size="9" fill="${axisColor}">${escSvg(cat)}</text>`;
    }).join("");
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => {
      const y = padT + plotH * (1 - f);
      const val = (maxVal * f).toFixed(1);
      return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/><text x="${padL - 4}" y="${y + 3}" text-anchor="end" font-size="8" fill="${axisColor}">${val}</text>`;
    }).join("");
    return wrapSvg(w, h, `${titleSvg}${gridLines}<line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="${axisColor}" stroke-width="1"/><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="${axisColor}" stroke-width="1"/>${bars}${labels}`);
  }

  if (type === "bar_h") {
    const groupH = plotH / categories.length;
    const barH = Math.min(groupH * 0.7 / series.length, 20);
    const bars = categories.map((cat, ci) => {
      return series.map((s, si) => {
        const bw = (s.values[ci] / maxVal) * plotW;
        const y = padT + ci * groupH + (groupH - barH * series.length) / 2 + si * barH;
        return `<rect x="${padL}" y="${y}" width="${bw}" height="${barH - 1}" fill="${s.color}" rx="2"/>`;
      }).join("");
    }).join("");
    const labels = categories.map((cat, ci) => {
      const y = padT + ci * groupH + groupH / 2;
      return `<text x="${padL - 4}" y="${y + 3}" text-anchor="end" font-size="9" fill="${axisColor}">${escSvg(cat)}</text>`;
    }).join("");
    return wrapSvg(w, h, `${titleSvg}<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="${axisColor}" stroke-width="1"/>${bars}${labels}`);
  }

  if (type === "line" || type === "area") {
    const stepX = plotW / Math.max(categories.length - 1, 1);
    const lines = series.map(s => {
      const pts = s.values.map((v, i) => `${padL + i * stepX},${padT + plotH - (v / maxVal) * plotH}`).join(" ");
      const areaPoly = type === "area" ? `<polygon points="${padL},${padT + plotH} ${pts} ${padL + (s.values.length - 1) * stepX},${padT + plotH}" fill="${s.color}" opacity="0.15"/>` : "";
      const circles = s.values.map((v, i) => `<circle cx="${padL + i * stepX}" cy="${padT + plotH - (v / maxVal) * plotH}" r="3" fill="${s.color}"/>`).join("");
      return `${areaPoly}<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
    }).join("");
    const labels = categories.map((cat, ci) => `<text x="${padL + ci * stepX}" y="${h - 8}" text-anchor="middle" font-size="9" fill="${axisColor}">${escSvg(cat)}</text>`).join("");
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => {
      const y = padT + plotH * (1 - f);
      return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/><text x="${padL - 4}" y="${y + 3}" text-anchor="end" font-size="8" fill="${axisColor}">${(maxVal * f).toFixed(1)}</text>`;
    }).join("");
    return wrapSvg(w, h, `${titleSvg}${gridLines}<line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="${axisColor}" stroke-width="1"/><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="${axisColor}" stroke-width="1"/>${lines}${labels}`);
  }

  if (type === "pie") {
    const vals = series[0]?.values || [1, 1, 1];
    const colors = series.map(s => s.color).concat(defaultColors);
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2, cy = padT + plotH / 2, r = Math.min(plotW, plotH) / 2 - 5;
    let cumAngle = -Math.PI / 2;
    const slices = vals.map((v, i) => {
      const angle = (v / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(cumAngle);
      const y1 = cy + r * Math.sin(cumAngle);
      cumAngle += angle;
      const x2 = cx + r * Math.cos(cumAngle);
      const y2 = cy + r * Math.sin(cumAngle);
      const large = angle > Math.PI ? 1 : 0;
      const color = colors[i % colors.length];
      return `<path d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}"/>`;
    }).join("");
    const legend = categories.map((cat, i) => {
      const color = colors[i % colors.length];
      const lx = 10, ly = h - 15 + (i - categories.length) * 14;
      return ly > padT ? `<rect x="${lx}" y="${ly - 6}" width="8" height="8" fill="${color}" rx="1"/><text x="${lx + 12}" y="${ly + 2}" font-size="8" fill="${axisColor}">${escSvg(cat)}</text>` : "";
    }).join("");
    return wrapSvg(w, h, `${titleSvg}${slices}${legend}`);
  }

  if (type === "scatter") {
    const dots = series.flatMap(s => s.values.map((v, i) => {
      const x = padL + (i / Math.max(s.values.length - 1, 1)) * plotW;
      const y = padT + plotH - (v / maxVal) * plotH;
      return `<circle cx="${x}" cy="${y}" r="5" fill="${s.color}" opacity="0.8"/>`;
    })).join("");
    const gridLines = [0, 0.5, 1].map(f => {
      const y = padT + plotH * (1 - f);
      return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>`;
    }).join("");
    return wrapSvg(w, h, `${titleSvg}${gridLines}<line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="${axisColor}" stroke-width="1"/><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="${axisColor}" stroke-width="1"/>${dots}`);
  }

  return wrapSvg(w, h, `<text x="${w/2}" y="${h/2}" text-anchor="middle" fill="#999">Gráfico</text>`);
}

function escSvg(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function wrapSvg(w: number, h: number, content: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="background:white;font-family:sans-serif">${content}</svg>`;
}

export function chartDataToImageSrc(data: ChartData, w = 400, h = 260): string {
  const svg = renderChartSVG(data, w, h);
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// ─── Ribbon Button helper ───
function RBtn({
  onClick, active, disabled, icon: Icon, label, className,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  icon: React.ElementType; label: string; className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button" onClick={onClick} disabled={disabled}
          className={cn(
            "rounded-md transition-colors p-1.5",
            active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            disabled && "opacity-40 cursor-not-allowed", className,
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

function RGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1">
      <div className="flex items-center gap-0.5">{children}</div>
      <span className="text-[9px] text-muted-foreground font-medium leading-none whitespace-nowrap">{label}</span>
    </div>
  );
}

// ─── Chart Editor Tab ───
const chartTypes: { id: ChartData["type"]; label: string; icon: React.ElementType }[] = [
  { id: "bar", label: "Barras", icon: BarChart3 },
  { id: "bar_h", label: "Barras H", icon: BarChart3 },
  { id: "line", label: "Linhas", icon: TrendingUp },
  { id: "pie", label: "Pizza", icon: PieChart },
  { id: "area", label: "Área", icon: TrendingUp },
  { id: "scatter", label: "Dispersão", icon: ScatterChart },
];

interface ChartTabProps {
  chartData: ChartData;
  onUpdate: (data: ChartData) => void;
}

export function ChartEditorTab({ chartData, onUpdate }: ChartTabProps) {
  const [showDataTable, setShowDataTable] = useState(false);

  const updateType = (type: ChartData["type"]) => onUpdate({ ...chartData, type });

  const updateTitle = () => {
    const t = prompt("Título do gráfico:", chartData.title);
    if (t !== null) onUpdate({ ...chartData, title: t });
  };

  const updateSeriesColor = (si: number, color: string) => {
    const newSeries = [...chartData.series];
    newSeries[si] = { ...newSeries[si], color };
    onUpdate({ ...chartData, series: newSeries });
  };

  const updateCellValue = (si: number, ci: number, val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return;
    const newSeries = chartData.series.map((s, i) =>
      i === si ? { ...s, values: s.values.map((v, j) => j === ci ? n : v) } : s
    );
    onUpdate({ ...chartData, series: newSeries });
  };

  const updateCategoryName = (ci: number, name: string) => {
    const cats = [...chartData.categories];
    cats[ci] = name;
    onUpdate({ ...chartData, categories: cats });
  };

  const updateSeriesName = (si: number, name: string) => {
    const newSeries = [...chartData.series];
    newSeries[si] = { ...newSeries[si], name };
    onUpdate({ ...chartData, series: newSeries });
  };

  const addCategory = () => {
    const cats = [...chartData.categories, `Cat ${chartData.categories.length + 1}`];
    const newSeries = chartData.series.map(s => ({ ...s, values: [...s.values, 0] }));
    onUpdate({ ...chartData, categories: cats, series: newSeries });
  };

  const removeCategory = (ci: number) => {
    if (chartData.categories.length <= 1) return;
    const cats = chartData.categories.filter((_, i) => i !== ci);
    const newSeries = chartData.series.map(s => ({ ...s, values: s.values.filter((_, i) => i !== ci) }));
    onUpdate({ ...chartData, categories: cats, series: newSeries });
  };

  const addSeries = () => {
    const si = chartData.series.length;
    const newS = { name: `Série ${si + 1}`, values: chartData.categories.map(() => 0), color: defaultColors[si % defaultColors.length] };
    onUpdate({ ...chartData, series: [...chartData.series, newS] });
  };

  const removeSeries = (si: number) => {
    if (chartData.series.length <= 1) return;
    onUpdate({ ...chartData, series: chartData.series.filter((_, i) => i !== si) });
  };

  return (
    <>
      <RGroup label="Tipo de Gráfico">
        {chartTypes.map(ct => (
          <RBtn key={ct.id} onClick={() => updateType(ct.id)} active={chartData.type === ct.id} icon={ct.icon} label={ct.label} />
        ))}
      </RGroup>
      <Separator orientation="vertical" className="h-10" />
      <RGroup label="Cores">
        {chartData.series.map((s, si) => (
          <DropdownMenu key={si}>
            <DropdownMenuTrigger asChild>
              <button
                className="w-6 h-6 rounded border border-border hover:ring-1 hover:ring-primary transition-all"
                style={{ background: s.color }}
                title={s.name}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-1.5 min-w-[130px]">
              <DropdownMenuLabel className="text-[10px]">{s.name}</DropdownMenuLabel>
              <div className="grid grid-cols-6 gap-1">
                {colorPalette.map(c => (
                  <button
                    key={c}
                    className={cn("w-5 h-5 rounded border transition-all", s.color === c ? "border-primary ring-1 ring-primary" : "border-border")}
                    style={{ background: c }}
                    onClick={() => updateSeriesColor(si, c)}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </RGroup>
      <Separator orientation="vertical" className="h-10" />
      <RGroup label="Título">
        <RBtn onClick={updateTitle} icon={TypeIcon} label="Editar título" />
      </RGroup>
      <Separator orientation="vertical" className="h-10" />
      <RGroup label="Dados">
        <button
          type="button"
          onClick={() => setShowDataTable(!showDataTable)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all border",
            showDataTable
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50"
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Editar Dados
        </button>
        <RBtn onClick={addCategory} icon={Plus} label="Adicionar categoria" />
        <RBtn onClick={addSeries} icon={Plus} label="Adicionar série" />
      </RGroup>

      {/* Data table overlay */}
      {showDataTable && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl p-3 max-h-[300px] overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-foreground">Dados do Gráfico</h4>
            <button onClick={() => setShowDataTable(false)} className="text-muted-foreground hover:text-foreground text-xs px-2 py-0.5 rounded hover:bg-muted">Fechar</button>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="border border-border bg-muted/50 px-2 py-1 text-left font-medium text-muted-foreground w-[80px]"></th>
                {chartData.series.map((s, si) => (
                  <th key={si} className="border border-border px-1 py-1 min-w-[70px]" style={{ backgroundColor: s.color + "20" }}>
                    <div className="flex items-center gap-1">
                      <input
                        value={s.name}
                        onChange={e => updateSeriesName(si, e.target.value)}
                        className="w-full bg-transparent text-xs font-medium outline-none text-center"
                      />
                      {chartData.series.length > 1 && (
                        <button onClick={() => removeSeries(si)} className="text-destructive/50 hover:text-destructive flex-shrink-0" title="Remover série">
                          <Minus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.categories.map((cat, ci) => (
                <tr key={ci}>
                  <td className="border border-border bg-muted/30 px-1 py-1">
                    <div className="flex items-center gap-1">
                      <input
                        value={cat}
                        onChange={e => updateCategoryName(ci, e.target.value)}
                        className="w-full bg-transparent text-xs font-medium outline-none"
                      />
                      {chartData.categories.length > 1 && (
                        <button onClick={() => removeCategory(ci)} className="text-destructive/50 hover:text-destructive flex-shrink-0">
                          <Minus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                  {chartData.series.map((s, si) => (
                    <td key={si} className="border border-border px-1 py-1">
                      <input
                        type="number"
                        step="0.1"
                        value={s.values[ci] ?? 0}
                        onChange={e => updateCellValue(si, ci, e.target.value)}
                        className="w-full bg-transparent text-xs text-center outline-none focus:bg-primary/5 rounded"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
