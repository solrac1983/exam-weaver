import { DemandStatus } from "@/types";
import { statusLabels } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: DemandStatus | string;
  className?: string;
}

const statusStyleMap: Record<string, string> = {
  pending: "status-draft",
  draft: "status-draft",
  in_progress: "status-sent",
  submitted: "status-sent",
  review: "status-review",
  revision_requested: "status-overdue",
  approved: "status-approved",
  final: "status-approved",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyleMap[status] || "status-draft",
        className
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}
