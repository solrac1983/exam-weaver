import { useEffect, useRef, useCallback } from "react";

const ORIGINAL_MARGIN_ATTR = "data-pb-orig-mt";
const SHIFT_ATTR = "data-page-break-shift";

/** Extra safety bleed (px) so content never touches the page edge */
const BLEED_PX = 6;

/**
 * Measure a CSS length in px **inside** a given element so the result
 * lives in the same coordinate space (respects ancestor CSS zoom).
 */
function measureInContext(cssHeight: string, context: HTMLElement): number {
  const tmp = document.createElement("div");
  tmp.style.cssText = `position:absolute;visibility:hidden;width:0;height:${cssHeight};pointer-events:none;`;
  context.appendChild(tmp);
  const h = tmp.offsetHeight;
  context.removeChild(tmp);
  return h;
}

function restoreMargins(root: HTMLElement) {
  const adjusted = root.querySelectorAll<HTMLElement>(`[${SHIFT_ATTR}]`);
  adjusted.forEach((el) => {
    const original = el.getAttribute(ORIGINAL_MARGIN_ATTR);
    if (original !== null) {
      el.style.marginTop = original;
    } else {
      el.style.marginTop = "";
    }
    el.removeAttribute(SHIFT_ATTR);
    el.removeAttribute(ORIGINAL_MARGIN_ATTR);
  });
}

function getTopRelativeToRoot(el: HTMLElement, root: HTMLElement): number {
  let top = 0;
  let current: HTMLElement | null = el;
  while (current && current !== root) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return top;
}

function applyAccumulatedShift(el: HTMLElement, shiftDelta: number) {
  if (shiftDelta <= 0) return;

  if (!el.hasAttribute(ORIGINAL_MARGIN_ATTR)) {
    el.setAttribute(ORIGINAL_MARGIN_ATTR, el.style.marginTop || "");
  }

  const originalMargin = el.getAttribute(ORIGINAL_MARGIN_ATTR) ?? "";
  const currentShift = Number(el.getAttribute(SHIFT_ATTR) || "0");
  const nextShift = currentShift + shiftDelta;

  if (!originalMargin || originalMargin === "0px") {
    el.style.marginTop = `${nextShift}px`;
  } else {
    el.style.marginTop = `calc(${originalMargin} + ${nextShift}px)`;
  }

  el.setAttribute(SHIFT_ATTR, String(nextShift));
}

/**
 * Collect all block-level elements that should be checked for page breaks.
 * Traverses wrapper divs, lists and tables to find leaf block children.
 */
function collectBlockChildren(root: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  const blockTags = new Set([
    "P", "H1", "H2", "H3", "H4", "H5", "H6",
    "BLOCKQUOTE", "HR", "PRE", "LI",
  ]);
  const containerTags = new Set(["UL", "OL", "DIV", "TABLE", "TBODY", "THEAD", "TFOOT"]);

  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.classList.contains("blank-page-spacer")) continue;

    if (child.tagName === "TR") {
      blocks.push(child);
    } else if (blockTags.has(child.tagName)) {
      blocks.push(child);
    } else if (containerTags.has(child.tagName) && !child.hasAttribute("data-blank-page")) {
      const nested = collectBlockChildren(child);
      if (nested.length > 0) {
        blocks.push(...nested);
      } else {
        blocks.push(child);
      }
    } else {
      blocks.push(child);
    }
  }

  return blocks;
}

export function usePageBreaks(
  editorEl: HTMLElement | null,
  marginTop: number,
  marginBottom: number
) {
  const rafRef = useRef(0);
  const pageHRef = useRef(0);
  const gapRef = useRef(28);
  const debounceRef = useRef(0);
  const isReflowingRef = useRef(false);

  /** Re-measure page height inside the editor context (handles CSS zoom) */
  const measurePage = useCallback(() => {
    if (!editorEl) return;
    pageHRef.current = measureInContext("297mm", editorEl);
    gapRef.current = measureInContext("28px", editorEl);
  }, [editorEl]);

  const reflow = useCallback(() => {
    if (!editorEl || isReflowingRef.current) return;

    const pageH = pageHRef.current;
    const gap = gapRef.current;
    if (pageH <= 0) return;

    isReflowingRef.current = true;

    const cycle = pageH + gap;
    const safeTop = marginTop + BLEED_PX;
    const safeBottom = marginBottom + BLEED_PX;
    const pageContentHeight = pageH - safeTop - safeBottom;

    restoreMargins(editorEl);

    const children = collectBlockChildren(editorEl);

    for (let pass = 0; pass < 16; pass++) {
      let anyChange = false;

      for (const el of children) {
        if (el.offsetHeight <= 0) continue;

        const top = getTopRelativeToRoot(el, editorEl);
        const bottom = top + el.offsetHeight;

        if (el.offsetHeight >= pageContentHeight - 2) continue;

        const pageIdx = Math.floor(top / cycle);
        const pageSafeTop = pageIdx * cycle + safeTop;
        const pageSafeBottom = pageIdx * cycle + pageH - safeBottom;
        const nextPageSafeTop = (pageIdx + 1) * cycle + safeTop;

        if (pageIdx > 0 && top < pageSafeTop) {
          const push = Math.round(pageSafeTop - top);
          if (push > 0 && push < cycle) {
            applyAccumulatedShift(el, push);
            anyChange = true;
          }
        } else if (bottom > pageSafeBottom && top < pageSafeBottom) {
          const push = Math.round(nextPageSafeTop - top);
          if (push > 0 && push < cycle) {
            applyAccumulatedShift(el, push);
            anyChange = true;
          }
        } else if (top >= pageSafeBottom && top < nextPageSafeTop) {
          const push = Math.round(nextPageSafeTop - top);
          if (push > 0 && push < cycle) {
            applyAccumulatedShift(el, push);
            anyChange = true;
          }
        }
      }

      if (!anyChange) break;
    }

    isReflowingRef.current = false;
  }, [editorEl, marginTop, marginBottom]);

  // Measure on mount, whenever editorEl changes, and on window resize
  useEffect(() => {
    measurePage();
    const onResize = () => measurePage();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measurePage]);

  useEffect(() => {
    if (!editorEl) return;

    // Ensure measurements are ready before first reflow
    if (pageHRef.current <= 0) {
      pageHRef.current = measureInContext("297mm", editorEl);
      gapRef.current = measureInContext("28px", editorEl);
    }

    let moConnected = false;

    const run = () => {
      if (isReflowingRef.current) return;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(debounceRef.current);
      rafRef.current = requestAnimationFrame(() => {
        reflow();
        // Schedule one stabilization pass after layout settles
        debounceRef.current = window.setTimeout(reflow, 120);
      });
    };

    // Initial reflow
    run();

    // Only observe user-driven content changes (NOT ResizeObserver to avoid loops)
    const mo = new MutationObserver(() => {
      if (isReflowingRef.current) return;
      run();
    });
    // Delay MO connection to avoid catching our own initial reflow DOM changes
    requestAnimationFrame(() => {
      if (!editorEl) return;
      mo.observe(editorEl, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false,
      });
      moConnected = true;
    });

    editorEl.addEventListener("input", run);
    window.addEventListener("resize", run);
    window.addEventListener("editor-margins-change", run as EventListener);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(debounceRef.current);
      if (moConnected) mo.disconnect();
      editorEl.removeEventListener("input", run);
      window.removeEventListener("resize", run);
      window.removeEventListener("editor-margins-change", run as EventListener);
      restoreMargins(editorEl);
    };
  }, [editorEl, reflow]);
}
