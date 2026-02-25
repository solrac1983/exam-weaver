import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useState } from "react";

export function AppLayout() {
  const [pinned, setPinned] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar pinned={pinned} onPinnedChange={setPinned} />
      <main
        className="min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: pinned ? "248px" : "60px" }}
      >
        <div className="p-6 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
