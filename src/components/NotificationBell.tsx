import { useSimuladoNotifications } from "@/hooks/useSimuladoNotifications";
import { Bell, Check, CheckCheck, Trash2, Send, CheckCircle2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function NotificationIcon({ type }: { type?: string }) {
  if (type === "demand_approved" || type === "simulado_approved") return <CheckCircle2 className="h-4 w-4" />;
  if (type === "demand_revision" || type === "simulado_revision") return <MessageSquare className="h-4 w-4" />;
  if (type === "demand_submitted") return <Send className="h-4 w-4" />;
  return <Send className="h-4 w-4" />;
}

function notificationIconBg(type?: string, read?: boolean) {
  if (!read) {
    if (type === "demand_approved" || type === "simulado_approved") return "bg-emerald-500/15 text-emerald-600";
    if (type === "demand_revision" || type === "simulado_revision") return "bg-amber-500/15 text-amber-600";
    if (type === "demand_submitted") return "bg-primary/15 text-primary";
    return "bg-primary/15 text-primary";
  }
  return "bg-muted text-muted-foreground";
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useSimuladoNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-xl transition-all duration-200",
            "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          )}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-1 shadow-sm animate-in zoom-in-50">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-80 p-0 rounded-xl shadow-xl border-border/60"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2" onClick={markAllRead}>
                <CheckCheck className="h-3.5 w-3.5" /> Marcar lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2 text-muted-foreground hover:text-destructive" onClick={clearAll}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Você será notificado sobre atualizações de provas e simulados
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center",
                    notificationIconBg(n.type, n.read)
                  )}>
                    <NotificationIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", !n.read && "font-medium text-foreground")}>
                      {n.message ? (
                        n.message
                      ) : (
                        <>
                          <span className="font-semibold">{n.teacherName}</span>{" "}
                          enviou as questões de{" "}
                          <span className="font-semibold">{n.subjectName}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(n.timestamp, { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="flex-shrink-0 mt-1.5">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
