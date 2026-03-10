import { useEffect, useRef, useCallback } from "react";

const ORIG_MT_ATTR = "data-pb-orig-mt";
const SHIFT_ATTR = "data-page-break-shift";

/** Safety bleed so content never touches the page edge */
const BLEED_PX = 6;

/** Gap between pages in CSS px — must match --page-gap in index.css */
const GAP_CSS = "40px";

/**
 * Measure a CSS length in px inside a given element so the result
 * respects ancestor CSS zoom.
 */
function measureInContext(cssHeight: string, ctx: HTMLElement): number {
  const d = document.createElement("div");
  d.style.cssText = `position:absolute;visibility:hidden;width:0;height:${cssHeight};pointer-events:none;`;
  ctx.appendChild(d);
  const h = d.getBoundingClientRect().height;
  ctx.removeChild(d);
  return h;
}

/** Get element top relative to root using getBoundingClientRect (zoom-safe) */
function relativeTop(el: HTMLElement, root: HTMLElement): number {
  return el.getBoundingClientRect().top - root.getBoundingClientRect().top;
}

/** Get element height via getBoundingClientRect (zoom-safe) */
function elHeight(el: HTMLElement): number {
  return el.getBoundingClientRect().height;
}

function restoreMargins(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(`[${SHIFT_ATTR}]`).forEach((el) => {
    const orig = el.getAttribute(ORIG_MT_ATTR);
    el.style.marginTop = orig !== null ? orig : "";
    el.removeAttribute(SHIFT_ATTR);
    el.removeAttribute(ORIG_MT_ATTR);
  });
}

function applyShift(el: HTMLElement, push: number) {
  if (push <= 0) return;

  if (!el.hasAttribute(ORIG_MT_ATTR)) {
    el.setAttribute(ORIG_MT_ATTR, el.style.marginTop || "");
  }

  const prev = Number(el.getAttribute(SHIFT_ATTR) || "0");
  const next = prev + push;
  const orig = el.getAttribute(ORIG_MT_ATTR) ?? "";

  el.style.marginTop =
    !orig || orig === "0px" ? `${next}px` : `calc(${orig} + ${next}px)`;
  el.setAttribute(SHIFT_ATTR, String(next));
}

/**
 * Collect leaf block elements for page-break checking.
 */
function collectBlocks(root: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  const leafTags = new Set([
    "P", "H1", "H2", "H3", "H4", "H5", "H6",
    "BLOCKQUOTE", "HR", "PRE", "LI", "TR",
  ]);
  const wrapTags = new Set([
    "UL", "OL", "DIV", "TABLE", "TBODY", "THEAD", "TFOOT",
  ]);

  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.classList.contains("blank-page-spacer")) continue;
    if (child.classList.contains("page-header-overlay")) continue;
    if (child.classList.contains("page-footer-overlay")) continue;

    if (leafTags.has(child.tagName)) {
      blocks.push(child);
    } else if (
      wrapTags.has(child.tagName) &&
      !child.hasAttribute("data-blank-page")
    ) {
      const nested = collectBlocks(child);
      blocks.push(...(nested.length > 0 ? nested : [child]));
    } else {
      blocks.push(child);
    }
  }
  return blocks;
}

export function usePageBreaks(
  editorEl: HTMLElement | null,
  marginTop: number,
  marginBottom: number,
) {
  const rafRef = useRef(0);
  const timerRef = useRef(0);
  const isRunning = useRef(false);
  const pageH = useRef(0);
  const gap = useRef(0);

  const measure = useCallback(() => {
    if (!editorEl) return;
    pageH.current = measureInContext("297mm", editorEl);
    gap.current = measureInContext(GAP_CSS, editorEl);
  }, [editorEl]);

  const reflow = useCallback(() => {
    if (!editorEl || isRunning.current) return;
    if (pageH.current <= 0) {
      measure();
      if (pageH.current <= 0) return;
    }

    isRunning.current = true;

    const pH = pageH.current;
    const g = gap.current;
    const cycle = pH + g;
    const safeTop = marginTop + BLEED_PX;
    const safeBot = marginBottom + BLEED_PX;
    const maxContent = pH - safeTop - safeBot;

    // Restore all previous shifts so we measure from clean state
    restoreMargins(editorEl);

    const children = collectBlocks(editorEl);

    // Run up to 20 stabilisation passes
    for (let pass = 0; pass < 20; pass++) {
      let changed = false;

      for (const el of children) {
        const h = elHeight(el);
        if (h <= 0) continue;
        // Skip elements taller than the content area (can't fit anyway)
        if (h >= maxContent - 2) continue;

        const top = relativeTop(el, editorEl);
        const bottom = top + h;

        const pageIdx = Math.floor(top / cycle);
        const pageSafeTop = pageIdx * cycle + safeTop;
        const pageSafeBot = pageIdx * cycle + pH - safeBot;
        const nextSafeTop = (pageIdx + 1) * cycle + safeTop;

        let push = 0;

        if (pageIdx > 0 && top < pageSafeTop) {
          // Element is inside the top margin of a page (pushed into gap area)
          push = Math.ceil(pageSafeTop - top);
        } else if (bottom > pageSafeBot && top < pageSafeBot) {
          // Element straddles the bottom margin – push to next page
          push = Math.ceil(nextSafeTop - top);
        } else if (top >= pageSafeBot && top < nextSafeTop) {
          // Element starts in the gap between pages
          push = Math.ceil(nextSafeTop - top);
        }

        if (push > 0 && push < cycle) {
          applyShift(el, push);
          changed = true;
        }
      }

      if (!changed) break;
    }

    isRunning.current = false;
  }, [editorEl, marginTop, marginBottom, measure]);

  // Measure on mount & resize
  useEffect(() => {
    measure();
    const onResize = () => {
      measure();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(reflow);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure, reflow]);

  useEffect(() => {
    if (!editorEl) return;

    // Ensure measurements
    if (pageH.current <= 0) measure();

    const scheduleReflow = () => {
      if (isRunning.current) return;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        rafRef.current = requestAnimationFrame(reflow);
      }, 80);
    };

    // Initial reflow — run quickly then again after delays for fonts/images
    const initTimer1 = setTimeout(scheduleReflow, 30);
    const initTimer2 = setTimeout(scheduleReflow, 200);
    const initTimer3 = setTimeout(scheduleReflow, 600);

    // Observe content mutations (not our own attribute changes)
    let moConnected = false;
    const mo = new MutationObserver((mutations) => {
      if (isRunning.current) return;
      const isOurChange = mutations.every(
        (m) =>
          m.type === "attributes" &&
          (m.attributeName === SHIFT_ATTR || m.attributeName === ORIG_MT_ATTR),
      );
      if (isOurChange) return;
      scheduleReflow();
    });

    // Delay MO slightly to avoid catching our own initial reflow
    const moTimer = setTimeout(() => {
      if (!editorEl) return;
      mo.observe(editorEl, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["style", "class", "src"],
      });
      moConnected = true;
    }, 100);

    // Also observe ResizeObserver on the editor element itself
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => {
        scheduleReflow();
      });
      ro.observe(editorEl);
    } catch {
      // ResizeObserver not supported
    }

    editorEl.addEventListener("input", scheduleReflow);
    window.addEventListener("editor-margins-change", scheduleReflow);

    return () => {
      clearTimeout(initTimer1);
      clearTimeout(initTimer2);
      clearTimeout(initTimer3);
      clearTimeout(moTimer);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
      if (moConnected) mo.disconnect();
      if (ro) ro.disconnect();
      editorEl.removeEventListener("input", scheduleReflow);
      window.removeEventListener("editor-margins-change", scheduleReflow);
      restoreMargins(editorEl);
    };
  }, [editorEl, reflow, measure]);
}
