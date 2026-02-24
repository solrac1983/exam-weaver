import { Demand } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { examTypeLabels } from "@/data/mockData";
import { Calendar, Clock, User, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemandCardProps {
  demand: Demand;
  onClick?: () => void;
}

function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

export function DemandCard({ demand, onClick }: DemandCardProps) {
  const overdue = isOverdue(demand.deadline) && !["approved", "final"].includes(demand.status);

  return (
    <button
      onClick={onClick}
      className={cn(
        "glass-card w-full rounded-lg p-4 text-left transition-all hover:shadow-md hover:border-primary/20 group animate-fade-in",
        overdue && "border-destructive/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {examTypeLabels[demand.examType]}
            </span>
            <StatusBadge status={demand.status} />
          </div>
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {demand.subjectName}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {demand.classGroups.join(", ")}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {demand.teacherName}
        </span>
        <span className={cn("flex items-center gap-1", overdue && "text-destructive font-medium")}>
          <Clock className="h-3 w-3" />
          {new Date(demand.deadline).toLocaleDateString("pt-BR")}
          {overdue && " (atrasada)"}
        </span>
        {demand.applicationDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(demand.applicationDate).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
    </button>
  );
}
