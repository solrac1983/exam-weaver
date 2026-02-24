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
  Settings,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Library,
  BarChart3,
  FileCheck,
} from "lucide-react";

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
  { label: "Banco de Questões", href: "/banco-questoes", icon: Library, roles: ["coordinator", "professor"] },
  { label: "Aprovações", href: "/aprovacoes", icon: FileCheck, roles: ["coordinator", "director"] },
  { label: "Cadastros", href: "/cadastros", icon: Users, roles: ["coordinator", "director"] },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3, roles: ["coordinator", "director"] },
  { label: "Modelos", href: "/modelos", icon: BookOpen, roles: ["coordinator"] },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const userRole = currentUser.role;

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-sidebar-primary">
          <GraduationCap className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-sidebar-foreground tracking-tight font-display">
            ProvaFácil
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold flex-shrink-0">
            {currentUser.name.split(" ").map((n) => n[0]).join("")}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{currentUser.name}</p>
              <p className="text-[10px] text-sidebar-muted capitalize">{currentUser.role === "coordinator" ? "Coordenador(a)" : currentUser.role === "professor" ? "Professor(a)" : "Diretor(a)"}</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-sidebar-muted hover:text-sidebar-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
