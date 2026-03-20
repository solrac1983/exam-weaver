import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

export function RibbonBtn({
  onClick, active, disabled, icon: Icon, label, shortcut, className, size = "sm",
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  icon: React.ElementType; label: string; shortcut?: string; className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "rounded transition-all duration-100 relative group/btn",
            size === "lg" ? "p-2" : "p-[6px]",
            active
              ? "bg-white/25 text-white shadow-[inset_0_0_0_1px_hsl(0_0%_100%/0.3)]"
              : "text-white/80 hover:text-white hover:bg-white/15",
            disabled && "opacity-30 cursor-not-allowed pointer-events-none", className,
          )}
        >
          <Icon className={cn(
            "transition-transform duration-100",
            size === "lg" ? "h-4.5 w-4.5" : "h-[14px] w-[14px]",
            !disabled && !active && "group-hover/btn:scale-105"
          )} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px] font-medium px-2 py-1 shadow-md">
        <span>{label}</span>
        {shortcut && <kbd className="ml-1.5 text-[10px] text-muted-foreground bg-muted/80 px-1 py-0.5 rounded font-mono">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

export function RibbonGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-0", className)}>
      <div className="flex items-center gap-[2px] px-0.5 py-0.5">{children}</div>
      <span className="text-[8px] text-muted-foreground/50 font-semibold leading-none whitespace-nowrap uppercase tracking-widest select-none">{label}</span>
    </div>
  );
}

export function RibbonDivider() {
  return <Separator orientation="vertical" className="h-11 mx-0.5 bg-border/40" />;
}
