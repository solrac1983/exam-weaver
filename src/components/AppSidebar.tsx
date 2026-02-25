import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { currentUser } from "@/data/mockData";
import { UserRole } from "@/types";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  BookOpen,
  Users,
  GraduationCap,
  Library,
  BarChart3,
  FileCheck,
  Pin,
  PinOff,
  NotebookPen,
  MessageCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: "Painel", href: "/", icon: LayoutDashboard, roles: ["coordinator", "professor", "director"] },
  { label: "Demandas", href: "/demandas", icon: ClipboardList, roles: ["coordinator", "professor"] },
  { label: "Provas", href: "/provas", icon: FileText, roles: ["coordinator", "professor"] },
  { label: "Simulados", href: "/simulados", icon: NotebookPen, roles: ["coordinator"] },
  { label: "Banco de Questões", href: "/banco-questoes", icon: Library, roles: ["coordinator", "professor"] },
  { label: "Aprovações", href: "/aprovacoes", icon: FileCheck, roles: ["coordinator", "director"] },
  { label: "Cadastros", href: "/cadastros", icon: Users, roles: ["coordinator", "director"] },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3, roles: ["coordinator", "director"] },
  { label: "Modelos", href: "/modelos", icon: BookOpen, roles: ["coordinator"] },
  { label: "Chat", href: "/chat", icon: MessageCircle, roles: ["coordinator", "professor", "director"] },
];

interface AppSidebarProps {
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

export function AppSidebar({ pinned, onPinnedChange }: AppSidebarProps) {
  const [hovered, setHovered] = useState(false);
  const location = useLocation();
  const userRole = currentUser.role;

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));
  const expanded = pinned || hovered;

  return (
    <aside
      onMouseEnter={() => !pinned && setHovered(true)}
      onMouseLeave={() => !pinned && setHovered(false)}
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        expanded ? "w-60 shadow-lg" : "w-[52px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 h-14 border-b border-sidebar-border">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-sidebar-primary flex-shrink-0">
          <GraduationCap className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span
          className={cn(
            "text-sm font-bold text-sidebar-foreground tracking-tight font-display whitespace-nowrap transition-all duration-300 overflow-hidden",
            expanded ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0"
          )}
        >
          ProvaFácil
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-1.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          const linkEl = (
            <NavLink
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap overflow-hidden",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span
                className={cn(
                  "truncate transition-all duration-300 overflow-hidden",
                  expanded ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0"
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );

          if (!expanded) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkEl}</div>;
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold flex-shrink-0">
            {currentUser.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div
            className={cn(
              "flex-1 min-w-0 transition-all duration-300 overflow-hidden",
              expanded ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0"
            )}
          >
            <p className="text-xs font-medium text-sidebar-foreground truncate">{currentUser.name}</p>
            <p className="text-[10px] text-sidebar-muted capitalize">
              {currentUser.role === "coordinator" ? "Coordenador(a)" : currentUser.role === "professor" ? "Professor(a)" : "Diretor(a)"}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onPinnedChange(!pinned)}
                className={cn(
                  "p-1.5 rounded-md transition-all duration-200 flex-shrink-0",
                  pinned
                    ? "text-primary bg-primary/10 hover:bg-primary/20"
                    : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {pinned ? "Desafixar menu" : "Fixar menu"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
