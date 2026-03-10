import { useEffect, useRef, useCallback } from "react";

const ORIGINAL_MARGIN_ATTR = "data-pb-orig-mt";
const MARKER_ATTR = "data-page-break-margin";

/**
 * Measures 297mm in pixels (one A4 page height).
 */
function getPageHeightPx(): number {
  const tmp = document.createElement("div");
  tmp.style.cssText = "position:absolute;visibility:hidden;width:0;height:297mm;pointer-events:none;";
  document.body.appendChild(tmp);
  const h = tmp.offsetHeight;
  document.body.removeChild(tmp);
  return h;
}

/**
 * Measures a CSS length (e.g. "28px") in pixels.
 */
function measureCSSLength(value: string): number {
  const tmp = document.createElement("div");
  tmp.style.cssText = `position:absolute;visibility:hidden;width:0;height:${value};pointer-events:none;`;
  document.body.appendChild(tmp);
  const h = tmp.offsetHeight;
  document.body.removeChild(tmp);
  return h;
}

function restoreMargins(root: HTMLElement) {
  const adjusted = root.querySelectorAll<HTMLElement>(`[${MARKER_ATTR}]`);
  adjusted.forEach((el) => {
    const original = el.getAttribute(ORIGINAL_MARGIN_ATTR);
    if (original !== null) {
      el.style.marginTop = original;
    } else {
      el.style.marginTop = "";
    }
    el.removeAttribute(MARKER_ATTR);
    el.removeAttribute(ORIGINAL_MARGIN_ATTR);
  });
}

function getTopRelativeTo(el: HTMLElement, root: HTMLElement): number {
  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return elRect.top - rootRect.top + root.scrollTop;
}

/**
 * Enforces visual pagination in the tiptap editor by pushing blocks
 * that would cross page boundaries to the next page content area.
 *
 * The CSS background already draws repeating white "pages" of height
 * `--page-h` (297mm) separated by `--page-gap` (28px) of desk-color.
 * This hook ensures content does not sit inside the gap or cross the
 * bottom margin zone.
 */
export function usePageBreaks(
  editorEl: HTMLElement | null,
  marginTop: number,
  marginBottom: number
) {
  const rafRef = useRef(0);
  const pageHRef = useRef(0);
  const gapRef = useRef(28); // default 28px

  const reflow = useCallback(() => {
    if (!editorEl) return;

    const pageH = pageHRef.current;
    const gap = gapRef.current;
    if (pageH <= 0) return;

    const cycle = pageH + gap;

    // First restore all previously applied margins
    restoreMargins(editorEl);

    // Gather direct block-level children of the tiptap editor
    const children = Array.from(editorEl.children) as HTMLElement[];

    for (let pass = 0; pass < 4; pass++) {
      let anyChange = false;

      for (const el of children) {
        if (!(el instanceof HTMLElement)) continue;
        if (el.classList.contains("blank-page-spacer")) continue;
        if (el.offsetHeight <= 0) continue;

        const top = getTopRelativeTo(el, editorEl);
        const bottom = top + el.offsetHeight;

        // Which page is the top of this element on?
        const pageIdx = Math.floor(top / cycle);
        const pageContentBottom = pageIdx * cycle + pageH - marginBottom;
        const nextPageContentTop = (pageIdx + 1) * cycle + marginTop;

        // Does this block cross the bottom margin / gap?
        if (bottom > pageContentBottom && top < pageContentBottom) {
          // Push to next page
          const push = Math.round(nextPageContentTop - top);
          if (push > 0 && push < cycle) {
            if (!el.hasAttribute(ORIGINAL_MARGIN_ATTR)) {
              el.setAttribute(ORIGINAL_MARGIN_ATTR, el.style.marginTop || "");
            }
            const origMargin = el.getAttribute(ORIGINAL_MARGIN_ATTR) || "0px";
            el.style.marginTop = origMargin ? `calc(${origMargin || "0px"} + ${push}px)` : `${push}px`;
            el.setAttribute(MARKER_ATTR, String(push));
            anyChange = true;
          }
        }
        // Element starts inside the gap between pages
        else if (top >= pageIdx * cycle + pageH && top < (pageIdx + 1) * cycle) {
          const push = Math.round(nextPageContentTop - top);
          if (push > 0 && push < cycle) {
            if (!el.hasAttribute(ORIGINAL_MARGIN_ATTR)) {
              el.setAttribute(ORIGINAL_MARGIN_ATTR, el.style.marginTop || "");
            }
            const origMargin = el.getAttribute(ORIGINAL_MARGIN_ATTR) || "0px";
            el.style.marginTop = origMargin ? `calc(${origMargin || "0px"} + ${push}px)` : `${push}px`;
            el.setAttribute(MARKER_ATTR, String(push));
            anyChange = true;
          }
        }
      }

      if (!anyChange) break;
    }
  }, [editorEl, marginTop, marginBottom]);

  // Measure page height and gap once
  useEffect(() => {
    pageHRef.current = getPageHeightPx();
    gapRef.current = measureCSSLength("28px"); // matches --page-gap in CSS
  }, []);

  useEffect(() => {
    if (!editorEl) return;

    const run = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(reflow);
    };

    // Initial run
    run();

    // Observe changes
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
