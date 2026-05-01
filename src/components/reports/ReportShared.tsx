import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { buildPrintHTML } from "./reportUtils";
import { toast } from "sonner";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

// ── Animated counter hook ──
export function useAnimatedNumber(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();
    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { cancelled = true; };
  }, [target, duration]);
  return value;
}

// ── Animated Stat card ──
export function AnimatedStat({ label, value, icon: Icon, color = "text-primary", subtitle, trend }: {
  label: string; value: number; icon: React.ElementType; color?: string; subtitle?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const animatedValue = useAnimatedNumber(value);
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 md:p-5 flex items-start gap-3 hover:shadow-md transition-all duration-300 group">
      <div className={`p-2.5 rounded-xl bg-muted/80 ${color} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-2xl md:text-3xl font-bold text-foreground tabular-nums">{animatedValue}</p>
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${
              trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            }`}>
              {trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : trend === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Action bar ──
export function ReportActions({ title, contentRef }: { title: string; contentRef: React.RefObject<HTMLDivElement | null> }) {
  const handleAction = (type: "print" | "pdf") => {
    if (!contentRef.current) return;
    const html = buildPrintHTML(title, contentRef.current);
    const w = window.open("", "_blank");
    if (!w) { showInvokeError("Popup bloqueado. Permita popups."); return; }
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.print(); };
    if (type === "pdf") toast.info("Use 'Salvar como PDF' na janela de impressão.");
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleAction("print")}>
        <Printer className="h-4 w-4" />Imprimir
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleAction("pdf")}>
        <FileDown className="h-4 w-4" />Exportar PDF
      </Button>
    </div>
  );
}

// ── Completion ring ──
export function CompletionRing({ percentage }: { percentage: number }) {
  const animated = useAnimatedNumber(percentage, 1200);
  const data = [{ name: "Concluído", value: animated }, { name: "Restante", value: 100 - animated }];
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col items-center">
      <h3 className="text-sm font-semibold text-foreground mb-2">Taxa de Conclusão</h3>
      <div className="relative" style={{ width: 160, height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={55} outerRadius={72} startAngle={90} endAngle={-270} paddingAngle={2}>
              <Cell fill="hsl(var(--success))" />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{animated}%</span>
          <span className="text-[10px] text-muted-foreground">concluídas</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Aprovadas</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted" /> Em andamento</span>
      </div>
    </div>
  );
}

// ── Empty state ──
export function EmptyReport({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-12 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
