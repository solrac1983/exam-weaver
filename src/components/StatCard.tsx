import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "warning" | "success" | "info";
}

const variantStyles = {
  default: "border-border",
  warning: "border-warning/30 bg-warning/5",
  success: "border-success/30 bg-success/5",
  info: "border-info/30 bg-info/5",
};

const iconVariantStyles = {
  default: "text-muted-foreground bg-muted",
  warning: "text-warning bg-warning/10",
  success: "text-success bg-success/10",
  info: "text-info bg-info/10",
};

export function StatCard({ label, value, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <div className={cn("glass-card rounded-lg p-4 animate-fade-in", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 font-display">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={cn("p-2 rounded-lg", iconVariantStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
