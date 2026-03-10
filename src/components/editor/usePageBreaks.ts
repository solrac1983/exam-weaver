import { useEffect, useRef, useCallback } from "react";


const ORIGINAL_MARGIN_ATTR = "data-pb-orig-mt";
const SHIFT_ATTR = "data-page-break-shift";

function getPageHeightPx(): number {
  const tmp = document.createElement("div");
  tmp.style.cssText = "position:absolute;visibility:hidden;width:0;height:297mm;pointer-events:none;";
  document.body.appendChild(tmp);
  const h = tmp.offsetHeight;
  document.body.removeChild(tmp);
  return h;
}

function measureCSSLength(value: string): number {
  const tmp = document.createElement("div");
  tmp.style.cssText = `position:absolute;visibility:hidden;width:0;height:${value};pointer-events:none;`;
  document.body.appendChild(tmp);
  const h = tmp.offsetHeight;
  document.body.removeChild(tmp);
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
 * Traverses wrapper divs to find actual block children.
 */
function collectBlockChildren(root: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  const blockTags = new Set([
    "P", "H1", "H2", "H3", "H4", "H5", "H6",
    "BLOCKQUOTE", "HR", "PRE", "LI",
  ]);
  // Tags whose children should be traversed to find individual blocks
  const containerTags = new Set(["UL", "OL", "DIV", "TBODY", "THEAD", "TFOOT"]);

  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.classList.contains("blank-page-spacer")) continue;

    if (blockTags.has(child.tagName)) {
      blocks.push(child);
    } else if (child.tagName === "TABLE") {
      // Traverse into table to find individual rows
      const nested = collectBlockChildren(child);
      if (nested.length > 0) {
        blocks.push(...nested);
      } else {
        blocks.push(child);
      }
    } else if (child.tagName === "TR") {
      // Table rows are the breakable unit inside tables
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

  const reflow = useCallback(() => {
    if (!editorEl) return;

    const pageH = pageHRef.current;
    const gap = gapRef.current;
    if (pageH <= 0) return;

    const cycle = pageH + gap;
    const pageContentHeight = pageH - marginTop - marginBottom;

    restoreMargins(editorEl);

    const children = collectBlockChildren(editorEl);

    // offsetTop / getTopRelativeToRoot return border-box coordinates.
    // The CSS background repeats every `cycle` pixels:
    //   Page N white area : N*cycle  →  N*cycle + pageH
    //   Gap               : N*cycle + pageH  →  (N+1)*cycle
    //
    // Content must stay within per-page margins:
    //   Top of content    : N*cycle + marginTop
    //   Bottom of content : N*cycle + pageH - marginBottom

    for (let pass = 0; pass < 8; pass++) {
      let anyChange = false;

      for (const el of children) {
        if (el.offsetHeight <= 0) continue;

        const top = getTopRelativeToRoot(el, editorEl);
        const bottom = top + el.offsetHeight;

        // Skip blocks larger than a full page content area
        if (el.offsetHeight >= pageContentHeight - 2) {
          continue;
        }

        const pageIdx = Math.floor(top / cycle);
        // Bottom boundary of the content zone on this page
        const pageContentBottom = pageIdx * cycle + pageH - marginBottom;
        // Top boundary of the content zone on the NEXT page
        const nextPageContentTop = (pageIdx + 1) * cycle + marginTop;

        // Element crosses the bottom margin — push to next page content zone
        if (bottom > pageContentBottom && top < pageContentBottom) {
          const push = Math.round(nextPageContentTop - top);
          if (push > 0 && push < cycle) {
            applyAccumulatedShift(el, push);
            anyChange = true;
          }
        }
        // Element starts in the gap or bottom/top margin area — push to next page
        else if (top >= pageContentBottom && top < nextPageContentTop) {
          const push = Math.round(nextPageContentTop - top);
          if (push > 0 && push < cycle) {
            applyAccumulatedShift(el, push);
            anyChange = true;
          }
        }
      }

      if (!anyChange) break;
    }
  }, [editorEl, marginTop, marginBottom]);

  useEffect(() => {
    pageHRef.current = getPageHeightPx();
    gapRef.current = measureCSSLength("28px");
  }, []);

  useEffect(() => {
    if (!editorEl) return;

    const run = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        reflow();
        // Second pass after layout settles to catch cascading shifts
        clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(reflow, 50);
      });
    };

    run();

    const ro = new ResizeObserver(run);
    ro.observe(editorEl);

    const mo = new MutationObserver(run);
    mo.observe(editorEl, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false,
    });

    editorEl.addEventListener("input", run);
    window.addEventListener("resize", run);
    window.addEventListener("editor-margins-change", run as EventListener);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(debounceRef.current);
      ro.disconnect();
      mo.disconnect();
      editorEl.removeEventListener("input", run);
      window.removeEventListener("resize", run);
      window.removeEventListener("editor-margins-change", run as EventListener);
      restoreMargins(editorEl);
    };
  }, [editorEl, reflow]);
}

