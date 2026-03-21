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
            "flex flex-col items-center justify-center gap-[3px] rounded-md px-2 py-1.5 min-w-[44px] transition-all duration-100 group/stk",
            active
              ? "bg-white/20 text-white shadow-[inset_0_0_0_1px_hsl(0_0%_100%/0.25)]"
              : "text-white/75 hover:text-white hover:bg-white/[0.12]",
            disabled && "opacity-30 cursor-not-allowed pointer-events-none",
            className,
          )}
        >
          <Icon className="h-[18px] w-[18px] transition-transform duration-100 group-hover/stk:scale-110" />
          <span className="text-[9px] font-medium leading-none whitespace-nowrap tracking-wide select-none">
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
    <div className={cn("flex flex-col items-center gap-0", className)}>
      <div className="flex items-center gap-[2px] px-0.5 py-0.5">{children}</div>
      <span className="text-[8px] text-white/40 font-semibold leading-none whitespace-nowrap uppercase tracking-widest select-none">{label}</span>
    </div>
  );
}

export function RibbonDivider() {
  return <Separator orientation="vertical" className="h-11 mx-0.5 bg-white/20" />;
}
