import { ChartData } from "./ChartEditorTab";
import { Plus, Minus, X, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

interface ChartDataPanelProps {
  chartData: ChartData;
  onUpdate: (data: ChartData) => void;
  onClose: () => void;
}

export function ChartDataPanel({ chartData, onUpdate, onClose }: ChartDataPanelProps) {
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
    <div className="w-[320px] flex-shrink-0 bg-card border border-border rounded-lg overflow-hidden animate-slide-in-left flex flex-col h-fit max-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Dados do Gráfico</h3>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground rounded-md hover:bg-muted p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <button
          onClick={addCategory}
          className="flex items-center gap-1 text-xs text-primary hover:bg-primary/10 rounded-md px-2 py-1 transition-colors"
        >
          <Plus className="h-3 w-3" /> Categoria
        </button>
        <button
          onClick={addSeries}
          className="flex items-center gap-1 text-xs text-primary hover:bg-primary/10 rounded-md px-2 py-1 transition-colors"
        >
          <Plus className="h-3 w-3" /> Série
        </button>
      </div>

      {/* Data Table */}
      <div className="overflow-auto flex-1 p-3">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="border border-border bg-muted/50 px-2 py-1.5 text-left font-medium text-muted-foreground w-[80px]"></th>
              {chartData.series.map((s, si) => (
                <th key={si} className="border border-border px-1 py-1.5 min-w-[70px]" style={{ backgroundColor: s.color + "20" }}>
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
                <td className="border border-border bg-muted/30 px-1 py-1.5">
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
                  <td key={si} className="border border-border px-1 py-1.5">
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
    </div>
  );
}
