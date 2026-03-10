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
 * If the editor has wrapper divs (e.g. from imported content), we traverse
 * into them to find the actual block children (p, h1-h6, table, blockquote, li, hr, div).
 */
function collectBlockChildren(root: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  const blockTags = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "TABLE", "BLOCKQUOTE", "UL", "OL", "HR", "PRE"]);

  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.classList.contains("blank-page-spacer")) continue;

    // If it's a known block tag, use it directly
    if (blockTags.has(child.tagName)) {
      blocks.push(child);
    } else if (child.tagName === "DIV" && !child.hasAttribute("data-blank-page")) {
      // Wrapper div — traverse into its children
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

  const reflow = useCallback(() => {
    if (!editorEl) return;

    const pageH = pageHRef.current;
    const gap = gapRef.current;
    if (pageH <= 0) return;

    const cycle = pageH + gap;
    const pageContentHeight = pageH - marginTop - marginBottom;

    restoreMargins(editorEl);

    const children = collectBlockChildren(editorEl);

    for (let pass = 0; pass < 6; pass++) {
      let anyChange = false;

      for (const el of children) {
        if (el.offsetHeight <= 0) continue;

        const top = getTopRelativeToRoot(el, editorEl);
        const bottom = top + el.offsetHeight;

        // Bloco maior que área útil da página: não tentamos empurrar,
        // para evitar oscilações e cortes visuais.
        if (el.offsetHeight >= pageContentHeight - 2) {
          continue;
        }

        const pageIdx = Math.floor(top / cycle);
        const pageContentBottom = pageIdx * cycle + pageH - marginBottom;
        const gapTop = pageIdx * cycle + pageH;
        const gapBottom = (pageIdx + 1) * cycle;
        const nextPageContentTop = (pageIdx + 1) * cycle + marginTop;

        if (bottom > pageContentBottom && top < pageContentBottom) {
          const push = Math.round(nextPageContentTop - top);
          if (push > 0 && push < cycle) {
            applyAccumulatedShift(el, push);
            anyChange = true;
          }
        } else if (top >= gapTop && top < gapBottom) {
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
      rafRef.current = requestAnimationFrame(reflow);
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
      ro.disconnect();
      mo.disconnect();
      editorEl.removeEventListener("input", run);
      window.removeEventListener("resize", run);
      window.removeEventListener("editor-margins-change", run as EventListener);
      restoreMargins(editorEl);
    };
  }, [editorEl, reflow]);
}

