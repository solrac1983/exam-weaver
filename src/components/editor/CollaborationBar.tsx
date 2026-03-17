import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Awareness } from "y-protocols/awareness";

interface UserState {
  name: string;
  color: string;
  avatar?: string;
}

interface CollaborationBarProps {
  awareness: Awareness | null;
}

const COLLAB_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

export function CollaborationBar({ awareness }: CollaborationBarProps) {
  const [users, setUsers] = useState<Map<number, UserState>>(new Map());

  useEffect(() => {
    if (!awareness) return;

    const update = () => {
      const states = new Map<number, UserState>();
      awareness.getStates().forEach((state, clientId) => {
        if (clientId !== awareness.clientID && state.user) {
          states.set(clientId, state.user as UserState);
        }
      });
      setUsers(new Map(states));
    };

    awareness.on("change", update);
    update();

    return () => {
      awareness.off("change", update);
    };
  }, [awareness]);

  if (users.size === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 px-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">
          {users.size + 1}
        </span>
        <div className="flex -space-x-1.5">
          {Array.from(users.entries()).map(([clientId, user]) => (
            <Tooltip key={clientId}>
              <TooltipTrigger asChild>
                <div
                  className="h-6 w-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {user.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

export { COLLAB_COLORS };
