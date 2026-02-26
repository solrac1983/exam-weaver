import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { useChatUnreadCount } from "@/hooks/useChatUnreadCount";
import {
  LayoutDashboard, FileText, ClipboardList, BookOpen, Users, GraduationCap,
  Library, BarChart3, FileCheck, ChevronLeft, ChevronRight, NotebookPen,
  MessageCircle, Crown, LogOut,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: AppRole[];
  badge?: "chat";
}

const navItems: NavItem[] = [
  { label: "Painel", href: "/", icon: LayoutDashboard, roles: ["super_admin", "coordinator", "professor"] },
  { label: "Super Admin", href: "/admin", icon: Crown, roles: ["super_admin"] },
  { label: "Demandas", href: "/demandas", icon: ClipboardList, roles: ["coordinator", "professor"] },
  { label: "Provas", href: "/provas", icon: FileText, roles: ["coordinator", "professor"] },
  { label: "Simulados", href: "/simulados", icon: NotebookPen, roles: ["coordinator"] },
  { label: "Banco de Questões", href: "/banco-questoes", icon: Library, roles: ["coordinator", "professor"] },
  { label: "Aprovações", href: "/aprovacoes", icon: FileCheck, roles: ["coordinator"] },
  { label: "Cadastros", href: "/cadastros", icon: Users, roles: ["coordinator", "super_admin"] },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3, roles: ["coordinator", "super_admin"] },
  { label: "Modelos", href: "/modelos", icon: BookOpen, roles: ["coordinator"] },
  { label: "Chat", href: "/chat", icon: MessageCircle, roles: ["coordinator", "professor"], badge: "chat" },
];

interface AppSidebarProps {
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

export function AppSidebar({ pinned, onPinnedChange }: AppSidebarProps) {
  const [hovered, setHovered] = useState(false);
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const chatUnread = useChatUnreadCount();

  const userRole = role || "professor";
  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));
  const expanded = pinned || hovered;

  const roleLabel: Record<AppRole, string> = {
    super_admin: "Super Admin",
    coordinator: "Coordenador(a)",
    professor: "Professor(a)",
  };

  const displayName = profile?.full_name || "Usuário";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <aside
      onMouseEnter={() => !pinned && setHovered(true)}
      onMouseLeave={() => !pinned && setHovered(false)}
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-gradient-to-b from-sidebar to-[hsl(220,30%,12%)] border-r border-sidebar-border/50",
        expanded ? "w-[248px] shadow-2xl shadow-black/20" : "w-[60px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3.5 h-16 flex-shrink-0">
        <div className={cn(
          "flex items-center justify-center rounded-xl flex-shrink-0 transition-all duration-300",
          expanded ? "h-9 w-9" : "h-8 w-8",
          "bg-gradient-to-br from-sidebar-primary to-[hsl(220,65%,45%)] shadow-lg shadow-sidebar-primary/30"
        )}>
          <GraduationCap className={cn("text-sidebar-primary-foreground transition-all", expanded ? "h-5 w-5" : "h-4 w-4")} />
        </div>
        <div className={cn(
          "transition-all duration-300 overflow-hidden",
          expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
        )}>
          <span className="text-base font-bold text-sidebar-foreground tracking-tight whitespace-nowrap">ProvaFácil</span>
          <p className="text-[10px] text-sidebar-muted leading-none mt-0.5">Sistema de Provas</p>
        </div>
      </div>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          const hasBadge = item.badge === "chat" && chatUnread > 0;

          const linkContent = (
            <NavLink
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 whitespace-nowrap overflow-hidden relative",
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary-foreground font-medium shadow-sm shadow-sidebar-primary/10"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary shadow-[0_0_8px_hsl(var(--sidebar-primary)/0.5)]" />
              )}
              <div className="relative flex-shrink-0">
                <item.icon className={cn(
                  "h-[18px] w-[18px] transition-all duration-200",
                  isActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground",
                )} />
                {hasBadge && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-1 shadow-sm animate-in zoom-in-50">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
              </div>
              <span className={cn(
                "truncate transition-all duration-300 overflow-hidden",
                expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
              )}>{item.label}</span>
              {hasBadge && expanded && (
                <span className="ml-auto flex items-center justify-center h-5 min-w-[20px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 shadow-sm">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </NavLink>
          );

          if (!expanded) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="text-xs font-medium shadow-lg">
                  <div className="flex items-center gap-2">
                    {item.label}
                    {hasBadge && (
                      <span className="flex items-center justify-center h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1">{chatUnread}</span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

      {/* Footer */}
      <div className="p-2.5 flex-shrink-0 space-y-1">
        <NavLink
          to="/perfil"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-200",
            "hover:bg-sidebar-accent/40",
            location.pathname === "/perfil" && "bg-sidebar-accent/60"
          )}
        >
          <div className={cn(
            "flex items-center justify-center h-9 w-9 rounded-xl flex-shrink-0 text-xs font-bold",
            "bg-gradient-to-br from-sidebar-accent to-sidebar-accent/60 text-sidebar-accent-foreground shadow-sm"
          )}>{initials}</div>
          <div className={cn(
            "flex-1 min-w-0 transition-all duration-300 overflow-hidden",
            expanded ? "opacity-100 max-w-[130px]" : "opacity-0 max-w-0"
          )}>
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-sidebar-muted capitalize leading-tight">{roleLabel[userRole]}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPinnedChange(!pinned); }}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-200 flex-shrink-0",
                  "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                  !expanded && "mx-auto"
                )}
              >
                {pinned ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium">
              {pinned ? "Recolher menu" : "Expandir menu"}
            </TooltipContent>
          </Tooltip>
        </NavLink>

        {/* Sign out button */}
        {expanded && (
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 w-full rounded-xl px-2.5 py-2 text-sm text-sidebar-muted hover:bg-destructive/15 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span>Sair</span>
          </button>
        )}
      </div>
    </aside>
  );
}
