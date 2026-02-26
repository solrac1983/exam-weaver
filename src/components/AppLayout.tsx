import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardSkeleton } from "./DashboardSkeleton";

const WIDE_ROUTES = ["/provas/editor"];

export function AppLayout() {
  const [pinned, setPinned] = useState(true);
  const location = useLocation();
  const { user, loading } = useAuth();
  const isWide = WIDE_ROUTES.some((r) => location.pathname.startsWith(r));

  if (loading) return <DashboardSkeleton />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar pinned={pinned} onPinnedChange={setPinned} />
      <main
        className="min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: pinned ? "248px" : "60px" }}
      >
        <div className={isWide ? "p-6" : "p-6 max-w-6xl"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
