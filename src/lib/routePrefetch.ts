// Route-to-module mapping for prefetch on hover
const routeModules: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Dashboard"),
  "/admin": () => import("@/pages/SuperAdminPage"),
  "/financeiro": () => import("@/pages/FinanceiroPage"),
  "/demandas": () => import("@/pages/DemandsPage"),
  "/simulados": () => import("@/pages/SimuladosPage"),
  "/banco-questoes": () => import("@/pages/QuestionBankPage"),
  "/aprovacoes": () => import("@/pages/ApprovalsPage"),
  "/cadastros": () => import("@/pages/CadastrosPage"),
  "/relatorios": () => import("@/pages/ReportsPage"),
  "/modelos": () => import("@/pages/TemplatesPage"),
  "/chat": () => import("@/pages/ChatPage"),
  "/perfil": () => import("@/pages/ProfilePage"),
  "/minhas-turmas": () => import("@/pages/MinhasTurmasPage"),
  "/modelos-professor": () => import("@/pages/ProfessorTemplatesPage"),
  "/ai-questoes": () => import("@/pages/AIQuestionGeneratorPage"),
  "/notas": () => import("@/pages/GradesPage"),
  "/frequencia": () => import("@/pages/AttendancePage"),
  "/desempenho": () => import("@/pages/PerformanceDashboardPage"),
  "/ajuda": () => import("@/pages/HelpPage"),
};

const prefetched = new Set<string>();

/** Prefetch a single route module (idempotent) */
export function prefetchRoute(href: string) {
  if (prefetched.has(href)) return;
  const loader = routeModules[href];
  if (loader) {
    prefetched.add(href);
    loader();
  }
}

/** Prefetch multiple routes at once during idle time */
export function prefetchRoutes(hrefs: string[]) {
  hrefs.forEach(prefetchRoute);
}

/** Preload commonly-visited routes after initial render using requestIdleCallback */
export function prefetchCriticalRoutes(role?: string | null) {
  const schedule = typeof requestIdleCallback !== "undefined" ? requestIdleCallback : (cb: () => void) => setTimeout(cb, 200);
  
  // Always preload dashboard
  schedule(() => prefetchRoute("/"));
  
  // Role-based preloading of likely next pages
  schedule(() => {
    if (role === "super_admin") {
      prefetchRoutes(["/admin", "/financeiro", "/cadastros"]);
    } else if (role === "admin") {
      prefetchRoutes(["/demandas", "/simulados", "/cadastros", "/relatorios"]);
    } else if (role === "professor") {
      prefetchRoutes(["/demandas", "/simulados", "/minhas-turmas", "/banco-questoes"]);
    }
  });
}
