import { useState, useCallback, useEffect, useTransition } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { useChatUnreadCount } from "@/hooks/useChatUnreadCount";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, FileText, ClipboardList, BookOpen, Users, GraduationCap,
  Library, BarChart3, FileCheck, ChevronLeft, ChevronRight, NotebookPen,
  MessageCircle, Crown, LogOut, DollarSign, X, School, CalendarCheck, Award,
  TrendingUp, HelpCircle, Moon, Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { prefetchRoute } from "@/lib/routePrefetch";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: AppRole[];
  badge?: "chat";
}

const navItems: NavItem[] = [
  { label: "Painel", href: "/", icon: LayoutDashboard, roles: ["super_admin", "admin", "coordinator", "professor"] },
  { label: "Super Admin", href: "/admin", icon: Crown, roles: ["super_admin"] },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign, roles: ["super_admin"] },
  { label: "Avaliações", href: "/demandas", icon: ClipboardList, roles: ["admin", "coordinator", "professor"] },
  { label: "Simulados", href: "/simulados", icon: NotebookPen, roles: ["admin", "coordinator", "professor"] },
  { label: "Minhas Turmas", href: "/minhas-turmas", icon: GraduationCap, roles: ["professor"] },
  { label: "Modelos", href: "/modelos-professor", icon: BookOpen, roles: ["professor"] },
  { label: "Banco de Questões", href: "/banco-questoes", icon: Library, roles: ["admin", "coordinator", "professor"] },
  { label: "Arquivadas", href: "/aprovacoes", icon: FileCheck, roles: ["admin", "coordinator"] },
  { label: "Notas", href: "/notas", icon: Award, roles: ["admin", "coordinator", "super_admin", "professor"] },
  { label: "Frequência", href: "/frequencia", icon: CalendarCheck, roles: ["admin", "coordinator", "super_admin", "professor"] },
  { label: "Cadastros", href: "/cadastros", icon: Users, roles: ["admin", "coordinator", "super_admin"] },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3, roles: ["admin", "coordinator", "super_admin"] },
  { label: "Desempenho", href: "/desempenho", icon: TrendingUp, roles: ["admin", "coordinator", "super_admin"] },
  { label: "Modelos", href: "/modelos", icon: BookOpen, roles: ["admin", "coordinator"] },
  { label: "Chat", href: "/chat", icon: MessageCircle, roles: ["admin", "coordinator", "professor"], badge: "chat" },
  { label: "Ajuda", href: "/ajuda", icon: HelpCircle, roles: ["super_admin", "admin", "coordinator", "professor"] },
];

interface AppSidebarProps {
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ pinned, onPinnedChange, mobileOpen, onMobileClose }: AppSidebarProps) {
  const [hovered, setHovered] = useState(false);
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const chatUnread = useChatUnreadCount();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.company_id) return;
    supabase.from("companies").select("name").eq("id", profile.company_id).single()
      .then(({ data }) => { if (data) setCompanyName(data.name); });
  }, [profile?.company_id]);
  const userRole = role || "professor";
  const isCoordinator = userRole === "admin" || userRole === "super_admin";
  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));

  // On mobile, sidebar is always expanded when open
  const expanded = isMobile ? true : pinned || hovered;
  const visible = isMobile ? mobileOpen : true;

  const roleLabel: Record<AppRole, string> = {
    super_admin: "Super Admin",
    admin: "Administrador(a)",
    professor: "Professor(a)",
  };

  const displayName = profile?.full_name || "Usuário";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2);

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (isMobile && onMobileClose) onMobileClose();
    startTransition(() => {
      navigate(href);
    });
  }, [isMobile, onMobileClose, navigate]);

  if (!visible) return null;

  return (
    <aside
      onMouseEnter={() => !pinned && !isMobile && setHovered(true)}
      onMouseLeave={() => !pinned && !isMobile && setHovered(false)}
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-gradient-to-b from-sidebar to-[hsl(220,30%,12%)] border-r border-sidebar-border/50",
        isMobile ? "w-[280px] shadow-2xl" : expanded ? "w-[248px] shadow-2xl shadow-black/20" : "w-[60px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3.5 h-16 flex-shrink-0">
        <div className={cn(
          "flex items-center justify-center rounded-xl flex-shrink-0 transition-all duration-300 overflow-hidden",
          expanded ? "h-9 w-9" : "h-8 w-8",
          "bg-white shadow-lg shadow-sidebar-primary/30"
        )}>
          <img src="/logo.png" alt="SmartTest" className={cn("transition-all object-contain", expanded ? "h-7 w-7" : "h-6 w-6")} />
        </div>
        {(isCoordinator || userRole === "professor") && (
          <div className={cn(
            "flex-shrink-0 transition-all duration-300",
            expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
          )}>
            <NotificationBell />
          </div>
        )}
        <div className={cn(
          "transition-all duration-300 overflow-hidden flex-1",
          expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
        )}>
          <span className="text-base font-bold text-sidebar-foreground tracking-tight whitespace-nowrap">SmartTest</span>
          <p className="text-[10px] text-sidebar-muted leading-none mt-0.5">Sistema de Provas</p>
        </div>
        {isMobile && (
          <button onClick={onMobileClose} className="p-1.5 rounded-lg text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors ml-auto">
            <X className="h-5 w-5" />
          </button>
        )}
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
              onClick={(e) => handleNavClick(e, item.href)}
              onMouseEnter={() => prefetchRoute(item.href)}
              onFocus={() => prefetchRoute(item.href)}
              onTouchStart={() => prefetchRoute(item.href)}
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

      {/* Company name & Dark mode */}
      {expanded && (
        <div className="px-3 py-2 flex-shrink-0 space-y-1.5">
          {companyName && (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-sidebar-accent/30">
              <School className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
              <span className="text-[11px] text-sidebar-muted truncate">{companyName}</span>
            </div>
          )}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-2.5 w-full rounded-xl px-2.5 py-2 text-sm text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-all duration-200"
          >
            {isDark ? <Sun className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
            <span>{isDark ? "Modo Claro" : "Modo Escuro"}</span>
          </button>
        </div>
      )}
      {!expanded && (
        <div className="px-2 py-1 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex items-center justify-center w-full rounded-xl p-2.5 text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-all duration-200"
              >
                {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium">
              {isDark ? "Modo Claro" : "Modo Escuro"}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Footer */}
      <div className="p-2.5 flex-shrink-0 space-y-1">
        <NavLink
          to="/perfil"
          onClick={(e) => handleNavClick(e, "/perfil")}
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
          {!isMobile && (
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
          )}
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
