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
            "rb-icon-btn inline-flex items-center justify-center rounded-md transition-all duration-150 relative group/btn",
            size === "lg" ? "h-8 w-8" : "h-7 w-7",
            active && "is-active",
            "active:scale-[0.94]",
            disabled && "opacity-30 cursor-not-allowed pointer-events-none active:scale-100",
            className,
          )}
        >
          <Icon className={cn(
            "transition-transform duration-150",
            size === "lg" ? "h-[16px] w-[16px]" : "h-[14px] w-[14px]",
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

/** Large stacked button with icon on top and label below — Word-style */
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
            "rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk",
            active && "is-active",
            "active:scale-[0.97]",
            disabled && "opacity-30 cursor-not-allowed pointer-events-none active:scale-100",
            className,
          )}
        >
          <Icon className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
          <span className="rb-stack-label whitespace-nowrap select-none">
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
    <div className={cn("rb-group flex flex-col items-center gap-1 px-2 py-1 relative", className)}>
      <div className="flex items-center gap-[2px]">{children}</div>
      <span className="rb-group-label whitespace-nowrap select-none">{label}</span>
    </div>
  );
}

export function RibbonDivider() {
  return <Separator orientation="vertical" className="h-14 mx-1.5 bg-[hsl(var(--rb-border,214_15%_88%))]" />;
}
