import { useEffect, useRef, useCallback } from "react";

const ORIGINAL_MARGIN_EMPTY = "__EMPTY__";

/**
 * Measures 297mm in pixels (one A4 page height).
 */
function getPageHeightPx(): number {
  const tmp = document.createElement("div");
  tmp.style.cssText = "position:absolute;visibility:hidden;width:0;height:297mm;";
  document.body.appendChild(tmp);
  const h = tmp.offsetHeight;
  document.body.removeChild(tmp);
  return h;
}

function getRelativeTop(el: HTMLElement, root: HTMLElement): number {
  let top = 0;
  let current: HTMLElement | null = el;

  while (current && current !== root) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  if (current === root) return top;

  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return elRect.top - rootRect.top;
}

function restoreMargins(root: HTMLElement) {
  const adjusted = root.querySelectorAll<HTMLElement>("[data-page-break-margin]");
  adjusted.forEach((el) => {
    const original = el.dataset.pageBreakOriginalMarginTop;
    if (original !== undefined) {
      el.style.marginTop = original === ORIGINAL_MARGIN_EMPTY ? "" : original;
    }
    delete el.dataset.pageBreakMargin;
    delete el.dataset.pageBreakOriginalMarginTop;
  });
}

function isCandidate(el: HTMLElement): boolean {
  if (el.classList.contains("blank-page-spacer")) return false;
  if (el.closest("[data-page-break-ignore='true']")) return false;

  const tag = el.tagName;

  if (el.closest("table") && tag !== "TABLE") return false;
  if (el.closest("li") && tag !== "LI") return false;
  if (el.closest("blockquote") && tag !== "BLOCKQUOTE") return false;

  return true;
}

/**
 * Enforces visual pagination in the editor by pushing blocks that would cross
 * page boundaries to the next page content area.
 */
export function usePageBreaks(editorEl: HTMLElement | null, marginTop: number, marginBottom: number) {
  const rafRef = useRef(0);
  const pageHeightRef = useRef(0);

  const reflow = useCallback(() => {
    if (!editorEl) return;

    const computed = getComputedStyle(editorEl);
    const pageGap = Number.parseFloat(computed.getPropertyValue("--page-gap")) || 28;
    const pageH = pageHeightRef.current || getPageHeightPx();
    if (pageH <= 0) return;

    const cycle = pageH + pageGap;

    restoreMargins(editorEl);

    const candidates = Array.from(
      editorEl.querySelectorAll<HTMLElement>(
        "p, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, table, pre, hr, figure"
      )
    ).filter(isCandidate);

    const maxPasses = 3;

    for (let pass = 0; pass < maxPasses; pass += 1) {
      let changed = false;

      for (const el of candidates) {
        const top = getRelativeTop(el, editorEl);
        const height = el.offsetHeight;
        if (height <= 0) continue;

        const pageIndex = Math.floor(top / cycle);
        const pageStart = pageIndex * cycle;
        const contentTop = pageStart + marginTop;
        const contentBottom = pageStart + pageH - marginBottom;
        const gapStart = pageStart + pageH;
        const gapEnd = gapStart + pageGap;
        const nextContentTop = pageStart + cycle + marginTop;

        let push = 0;

        // If block starts inside the inter-page gap, move it to next page.
        if (top >= gapStart && top < gapEnd) {
          push = nextContentTop - top;
        }
        // If block starts above current page content area, move it down.
        else if (top < contentTop) {
          push = contentTop - top;
        }
        // If block crosses bottom content boundary, move whole block to next page.
        else if (top < contentBottom && top + height > contentBottom) {
          const availableHeight = contentBottom - contentTop;
          const canMoveWholeBlock = height <= Math.max(80, availableHeight - 16);
          if (canMoveWholeBlock) {
            push = nextContentTop - top;
          }
        }

        const roundedPush = Math.round(push);
        if (roundedPush > 0 && roundedPush < cycle) {
          const original = el.dataset.pageBreakOriginalMarginTop ?? (el.style.marginTop || ORIGINAL_MARGIN_EMPTY);
          const baseMargin = original === ORIGINAL_MARGIN_EMPTY ? "0px" : original;

          el.dataset.pageBreakOriginalMarginTop = original;
          el.dataset.pageBreakMargin = String(roundedPush);
          el.style.marginTop = `calc(${baseMargin} + ${roundedPush}px)`;

          changed = true;
        }
      }

      if (!changed) break;
    }
  }, [editorEl, marginTop, marginBottom]);

  useEffect(() => {
    pageHeightRef.current = getPageHeightPx();
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
    if (editorEl.parentElement) ro.observe(editorEl.parentElement);

    const mo = new MutationObserver(run);
    mo.observe(editorEl, { childList: true, subtree: true, characterData: true });

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
