import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Suspense, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { BillingBlockedBanner, useBillingBlocked } from "./BillingBlockedBanner";
import { SimuladoNotificationsProvider } from "@/hooks/useSimuladoNotifications";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Skeleton } from "@/components/ui/skeleton";

const WIDE_ROUTES = ["/provas/editor"];

function PageTransitionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl mt-4" />
    </div>
  );
}

export function AppLayout() {
  const isMobile = useIsMobile();
  const [pinned, setPinned] = useState(!isMobile);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, loading } = useAuth();
  const blocked = useBillingBlocked();
  const isWide = WIDE_ROUTES.some((r) => location.pathname.startsWith(r));

  if (loading) return <DashboardSkeleton />;
  if (!user) return <Navigate to="/landing" replace />;

  return (
    <SimuladoNotificationsProvider>
      {/* Skip to main content link for keyboard/screen-reader users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-primary focus:text-primary-foreground focus:rounded">
        Pular para o conteúdo principal
      </a>
      <div className="min-h-screen bg-background">
        {/* Mobile overlay */}
        {isMobile && mobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <header className="fixed top-0 left-0 right-0 z-10 flex items-center h-14 px-4 bg-background/95 backdrop-blur border-b border-border">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <img src="/logo.png" alt="ProvaFácil" className="ml-2 h-5 w-5 object-contain" />
            <span className="ml-1 text-sm font-semibold text-foreground">ProvaFácil</span>
          </header>
        )}

        <AppSidebar
          pinned={isMobile ? false : pinned}
          onPinnedChange={setPinned}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main
          role="main"
          id="main-content"
          aria-label="Conteúdo principal"
          className="min-h-screen transition-all duration-300 ease-in-out"
          style={{
            marginLeft: isMobile ? 0 : pinned ? "248px" : "60px",
            paddingTop: isMobile ? "56px" : 0,
          }}
        >
          <div className={isWide ? "p-4 md:p-6" : "p-4 md:p-6 max-w-6xl"}>
            <BillingBlockedBanner />
            <Suspense fallback={<PageTransitionSkeleton />}>
              {blocked ? (
                <div className="pointer-events-none opacity-60 select-none">
                  <Outlet />
                </div>
              ) : (
                <Outlet />
              )}
            </Suspense>
          </div>
        </main>
      </div>
    </SimuladoNotificationsProvider>
  );
}
