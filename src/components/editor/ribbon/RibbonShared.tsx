import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

function TooltipBody({ label, shortcut, description }: { label: string; shortcut?: string; description?: string }) {
  return (
    <div className="flex flex-col gap-0.5 max-w-[200px]">
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-[11px]">{label}</span>
        {shortcut && (
          <kbd className="text-[9px] text-muted-foreground bg-muted/80 px-1 py-0.5 rounded font-mono leading-none">
            {shortcut}
          </kbd>
        )}
      </div>
      {description && (
        <span className="text-[10px] text-muted-foreground leading-snug">{description}</span>
      )}
    </div>
  );
}

export function RibbonBtn({
  onClick, active, disabled, icon: Icon, label, shortcut, description, className, size = "sm",
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  icon: React.ElementType; label: string; shortcut?: string; description?: string; className?: string;
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
            "rounded-md transition-all duration-150 relative group/btn",
            size === "lg" ? "p-2" : "p-[7px]",
            active
              ? "bg-gradient-to-b from-white/30 to-white/15 text-white shadow-[inset_0_0_0_1px_hsl(0_0%_100%/0.35),0_2px_8px_-3px_hsl(213_95%_60%/0.5)]"
              : "text-white/75 hover:text-white hover:bg-white/[0.12] hover:shadow-[inset_0_0_0_1px_hsl(0_0%_100%/0.10)]",
            "active:scale-[0.94]",
            disabled && "opacity-30 cursor-not-allowed pointer-events-none active:scale-100", className,
          )}
        >
          <Icon className={cn(
            "transition-transform duration-150",
            size === "lg" ? "h-4.5 w-4.5" : "h-[14px] w-[14px]",
            !disabled && !active && "group-hover/btn:scale-110"
          )} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2.5 py-1.5 shadow-lg">
        <TooltipBody label={label} shortcut={shortcut} description={description} />
      </TooltipContent>
    </Tooltip>
  );
}

/** Large stacked button with icon on top and label below — premium Word-style */
export function RibbonStackedBtn({
  onClick, active, disabled, icon: Icon, label, shortcut, description, className,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  icon: React.ElementType; label: string; shortcut?: string; description?: string; className?: string;
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
            "flex flex-col items-center justify-center gap-[4px] rounded-lg px-2.5 py-2 min-w-[48px] transition-all duration-150 group/stk",
            active
              ? "bg-gradient-to-b from-white/25 to-white/10 text-white shadow-[inset_0_0_0_1px_hsl(0_0%_100%/0.3),0_3px_10px_-4px_hsl(213_95%_60%/0.5)]"
              : "text-white/75 hover:text-white hover:bg-white/[0.10] hover:shadow-[inset_0_0_0_1px_hsl(0_0%_100%/0.08)]",
            "active:scale-[0.96]",
            disabled && "opacity-30 cursor-not-allowed pointer-events-none active:scale-100",
            className,
          )}
        >
          <Icon className="h-[19px] w-[19px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
          <span className="text-[9.5px] font-medium leading-none whitespace-nowrap tracking-wide select-none opacity-90">
            {label}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2.5 py-1.5 shadow-lg">
        <TooltipBody label={label} shortcut={shortcut} description={description} />
      </TooltipContent>
    </Tooltip>
  );
}

export function RibbonGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 px-1.5 relative", className)}>
      <div className="flex items-center gap-[3px] px-0.5 py-0.5">{children}</div>
      <span className="text-[8.5px] text-white/45 font-semibold leading-none whitespace-nowrap uppercase tracking-[0.12em] select-none mt-0.5">{label}</span>
    </div>
  );
}

export function RibbonDivider() {
  return <Separator orientation="vertical" className="h-12 mx-1 bg-gradient-to-b from-transparent via-white/15 to-transparent" />;
}
