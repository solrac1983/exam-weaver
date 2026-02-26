import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useState } from "react";

const WIDE_ROUTES = ["/provas/editor"];

export function AppLayout() {
  const [pinned, setPinned] = useState(true);
  const location = useLocation();
  const isWide = WIDE_ROUTES.some((r) => location.pathname.startsWith(r));

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
