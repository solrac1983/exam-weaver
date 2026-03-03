import { lazy, ComponentType } from "react";

export function lazyWithRetry(factory: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() =>
    factory().catch((err) => {
      // If chunk fetch fails (stale deploy), reload once
      const key = "chunk-retry-reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise(() => {}); // never resolves, page reloads
      }
      sessionStorage.removeItem(key);
      throw err;
    })
  );
}
