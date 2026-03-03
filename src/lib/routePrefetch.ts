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
};

const prefetched = new Set<string>();

export function prefetchRoute(href: string) {
  if (prefetched.has(href)) return;
  const loader = routeModules[href];
  if (loader) {
    prefetched.add(href);
    loader();
  }
}
