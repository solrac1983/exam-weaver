import { useEffect, useRef, useCallback } from "react";

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

/**
 * Hook that enforces page boundaries by adding top-margin to block elements
 * that would cross a page break. This simulates real pagination.
 */
export function usePageBreaks(editorEl: HTMLElement | null, marginTop: number, marginBottom: number) {
  const rafRef = useRef(0);
  const pageHeightRef = useRef(0);
  const PAGE_GAP = 28; // px gap between pages (matches CSS --page-gap)

  const reflow = useCallback(() => {
    if (!editorEl) return;

    const pageH = pageHeightRef.current;
    if (pageH <= 0) return;

    // Content area per page (page height minus top and bottom padding/margins)
    const contentAreaH = pageH; // The full page including padding
    const cycle = pageH + PAGE_GAP;

    // Get all direct block children of the editor
    const children = editorEl.querySelectorAll(
      ":scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > ul, :scope > ol, :scope > blockquote, :scope > table, :scope > div, :scope > hr, :scope > pre"
    );

    // First pass: reset all previously added page-break margins
    children.forEach((child) => {
      const el = child as HTMLElement;
      if (el.dataset.pageBreakMargin) {
        el.style.marginTop = "";
        delete el.dataset.pageBreakMargin;
      }
    });

    // Second pass: for each element, check if it crosses a page boundary
    // We need to recalculate after each adjustment since positions shift
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      const editorRect = editorEl.getBoundingClientRect();

      // Element position relative to editor top
      const elTop = rect.top - editorRect.top + editorEl.scrollTop;
      const elBottom = elTop + rect.height;

      // Which page does the top of this element fall on?
      const pageIndex = Math.floor(elTop / cycle);
      // The bottom boundary of that page (where content should stop)
      const pageBottom = pageIndex * cycle + pageH - marginBottom;
      // The top of the next page content area
      const nextPageTop = (pageIndex + 1) * cycle + marginTop;

      // If element starts within the page gap zone, push it to next page
      const pageGapStart = pageIndex * cycle + pageH;
      const pageGapEnd = pageGapStart + PAGE_GAP;
      if (elTop >= pageGapStart && elTop < pageGapEnd) {
        const push = nextPageTop - elTop;
        if (push > 0) {
          el.style.marginTop = `${push}px`;
          el.dataset.pageBreakMargin = "true";
        }
        continue;
      }

      // If element crosses the page bottom boundary, push it to the next page
      if (elTop < pageBottom && elBottom > pageBottom && rect.height < contentAreaH * 0.8) {
        const push = nextPageTop - elTop;
        if (push > 0 && push < pageH) {
          el.style.marginTop = `${push}px`;
          el.dataset.pageBreakMargin = "true";
        }
      }
    }
  }, [editorEl, marginTop, marginBottom]);

  // Measure page height once
  useEffect(() => {
    pageHeightRef.current = getPageHeightPx();
  }, []);

  // Observe changes and reflow
  useEffect(() => {
    if (!editorEl) return;

    const run = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(reflow);
    };

    // Run on initial mount
    run();

    // ResizeObserver for size changes
    const ro = new ResizeObserver(run);
    ro.observe(editorEl);

    // MutationObserver for content changes
    const mo = new MutationObserver(run);
    mo.observe(editorEl, { childList: true, subtree: true, characterData: true, attributes: true });

    // Also run on input events
    editorEl.addEventListener("input", run);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      mo.disconnect();
      editorEl.removeEventListener("input", run);
    };
  }, [editorEl, reflow]);
}
