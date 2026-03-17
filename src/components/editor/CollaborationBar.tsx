import { useEffect, useState } from "react";
import { Users, PenLine } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Awareness } from "y-protocols/awareness";

interface UserState {
  name: string;
  color: string;
  avatar?: string;
  isTyping?: boolean;
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
          states.set(clientId, {
            ...(state.user as UserState),
            isTyping: !!state.isTyping,
          });
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

  const typingUsers = Array.from(users.values()).filter((u) => u.isTyping);

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
                <div className="relative shrink-0">
                  <div
                    className={`h-6 w-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white ${user.isTyping ? "ring-2 ring-offset-1 ring-offset-background animate-pulse" : ""}`}
                    style={{
                      backgroundColor: user.color,
                      ...(user.isTyping ? { ringColor: user.color } : {}),
                    }}
                  >
                    {user.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  {user.isTyping && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-background flex items-center justify-center"
                      style={{ backgroundColor: user.color }}
                    >
                      <PenLine className="h-1.5 w-1.5 text-white" />
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {user.name} {user.isTyping ? "— editando agora" : ""}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-1 ml-1.5 text-xs text-muted-foreground animate-pulse">
            <PenLine className="h-3 w-3" />
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} editando...`
                : `${typingUsers.length} editando...`}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export { COLLAB_COLORS };
