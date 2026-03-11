import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useCallback } from "react";
import {
  findTextSplitCandidate,
  isTextFlowElement,
  splitTextElementAtDomPosition,
} from "./pageBreakTextFlow";

const ORIG_MT_ATTR = "data-pb-orig-mt";
const SHIFT_ATTR = "data-page-break-shift";

/** Safety bleed so content never touches the page edge */
const BLEED_PX = 20;
const RESERVED_LINE_COUNT = 5;
const MIN_CONTENT_HEIGHT_PX = 48;

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

/** Include vertical margins so page-break logic respects the full block footprint */
function getBlockMetrics(el: HTMLElement, root: HTMLElement) {
  const style = window.getComputedStyle(el);
  const marginTop = Number.parseFloat(style.marginTop || "0") || 0;
  const marginBottom = Number.parseFloat(style.marginBottom || "0") || 0;
  const top = relativeTop(el, root);
  const height = elHeight(el);

  return {
    top,
    bottom: top + height,
    height,
    marginTop,
    marginBottom,
    outerTop: top - marginTop,
    outerBottom: top + height + marginBottom,
    outerHeight: height + marginTop + marginBottom,
  };
}

function getRootLineHeight(root: HTMLElement): number {
  const style = window.getComputedStyle(root);
  const fontSize = Number.parseFloat(style.fontSize || "16") || 16;
  const lineHeight = Number.parseFloat(style.lineHeight || "");

  return Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.5;
}

function getReservedBottomSpace(root: HTMLElement): number {
  return Math.ceil(getRootLineHeight(root) * RESERVED_LINE_COUNT);
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
  const skip = new Set(["page-header-overlay", "page-footer-overlay", "blank-page-spacer"]);

  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.classList && Array.from(child.classList).some(c => skip.has(c))) continue;
    if (child.hasAttribute("data-blank-page")) continue;

    // If it has block children, recurse; otherwise treat as leaf
    const hasBlockChildren = child.children.length > 0 &&
      !["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TR", "HR", "PRE", "BLOCKQUOTE"].includes(child.tagName);

    if (hasBlockChildren) {
      const nested = collectBlocks(child);
      blocks.push(...(nested.length > 0 ? nested : [child]));
    } else {
      blocks.push(child);
    }
  }
  return blocks;
}

/** Check if element is a heading */
function isHeading(el: HTMLElement): boolean {
  return /^H[1-6]$/.test(el.tagName);
}

/**
 * Determine the push needed for an element at a page boundary.
 * Returns 0 if no push needed.
 */
function computePush(
  top: number,
  bottom: number,
  pageIdx: number,
  cycle: number,
  pH: number,
  safeTop: number,
  safeBot: number,
): number {
  const pageSafeTop = pageIdx * cycle + safeTop;
  const pageSafeBot = pageIdx * cycle + pH - safeBot;
  const nextSafeTop = (pageIdx + 1) * cycle + safeTop;

  // Case 1: Element is inside the top margin of a page (in gap/margin area)
  if (pageIdx > 0 && top < pageSafeTop) {
    return Math.ceil(pageSafeTop - top);
  }

  // Case 2: Element's bottom extends past the safe bottom — push entire element to next page
  if (bottom > pageSafeBot && top < pageSafeBot) {
    return Math.ceil(nextSafeTop - top);
  }

  // Case 3: Element starts in the gap/margin area between pages
  if (top >= pageSafeBot && top < nextSafeTop) {
    return Math.ceil(nextSafeTop - top);
  }

  // Case 4: Element fits but its bottom is dangerously close to the page edge
  // (within BLEED_PX of the safe bottom) — preventively push to avoid visual clipping
  if (bottom > pageSafeBot - BLEED_PX && bottom <= pageSafeBot && top < pageSafeBot) {
    return Math.ceil(nextSafeTop - top);
  }

  return 0;
}

export function usePageBreaks(
  editor: Editor | null,
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

    try {
      const pH = pageH.current;
      const g = gap.current;
      const cycle = pH + g;

      // Convert CSS-pixel margins to zoom-aware pixels so they match
      // getBoundingClientRect-based positions (which are post-zoom).
      const rawLineH = getRootLineHeight(editorEl);
      const rawReservedBottom = rawLineH * RESERVED_LINE_COUNT;
      const safeTop = measureInContext(`${marginTop + BLEED_PX}px`, editorEl);
      const safeBot = measureInContext(`${marginBottom + BLEED_PX + rawReservedBottom}px`, editorEl);
      const maxContent = Math.max(MIN_CONTENT_HEIGHT_PX, pH - safeTop - safeBot);

      // Restore all previous shifts so we measure from clean state
      restoreMargins(editorEl);

      const children = collectBlocks(editorEl);
      if (children.length === 0) return;

      // Track elements already pushed to avoid infinite loops with oversized items
      const pushed = new Set<HTMLElement>();

      // Run up to 25 stabilisation passes
      for (let pass = 0; pass < 25; pass++) {
        let changed = false;

        for (let i = 0; i < children.length; i++) {
          const el = children[i];
          // Safety: element may have been removed from DOM between passes
          if (!el.isConnected) continue;

          const metrics = getBlockMetrics(el, editorEl);
          const h = metrics.outerHeight;
          if (h <= 0) continue;

          const top = metrics.outerTop;
          const bottom = metrics.outerBottom;

          // Skip elements that are fully above the editor viewport origin
          if (bottom <= 0) continue;

          const pageIdx = Math.floor(Math.max(top, 0) / cycle);
          const pageSafeBot = pageIdx * cycle + pH - safeBot;

          if (isTextFlowElement(el) && top < pageSafeBot && bottom > pageSafeBot) {
            const splitCandidate = findTextSplitCandidate(el, editorEl, pageSafeBot - 6);

            if (splitTextElementAtDomPosition(editor, splitCandidate)) {
              restoreMargins(editorEl);
              rafRef.current = requestAnimationFrame(reflow);
              return;
            }
          }

          // For truly oversized elements (taller than the full page height),
          // only push if they start inside the gap/margin area, and only once
          if (h >= pH) {
            if (pushed.has(el)) continue;
            const pageSafeTop = pageIdx * cycle + safeTop;
            const nextPageStart = (pageIdx + 1) * cycle;
            const nextSafeTop = nextPageStart + safeTop;
            const pageSafeBot = pageIdx * cycle + pH - safeBot;

            if (pageIdx > 0 && top < pageSafeTop) {
              const pushAmount = Math.ceil(pageSafeTop - top);
              if (pushAmount > 0 && pushAmount < cycle) {
                applyShift(el, pushAmount);
                pushed.add(el);
                changed = true;
              }
            } else if (top >= pageSafeBot && top < nextSafeTop) {
              const pushAmount = Math.ceil(nextSafeTop - top);
              if (pushAmount > 0 && pushAmount < cycle) {
                applyShift(el, pushAmount);
                pushed.add(el);
                changed = true;
              }
            }
            continue;
          }

          // For elements taller than content area but shorter than full page,
          // push them but only once to avoid infinite cascading
          if (h >= maxContent - 2 && pushed.has(el)) continue;

          let push = computePush(top, bottom, pageIdx, cycle, pH, safeTop, safeBot);

          // Mark oversized elements after first push to prevent infinite loops
          if (push > 0 && h >= maxContent - 2) {
            pushed.add(el);
          }

          // Orphan/widow prevention: if this is a heading near the bottom of a page,
          // and the next element would be on the next page, push the heading too
          if (push <= 0 && isHeading(el) && i + 1 < children.length) {
            const nextEl = children[i + 1];
            if (nextEl.isConnected) {
              const nextMetrics = getBlockMetrics(nextEl, editorEl);
              const nextBottom = nextMetrics.outerBottom;
              const pageSafeBot = pageIdx * cycle + pH - safeBot;
              if (nextBottom > pageSafeBot && bottom > pageSafeBot - 60) {
                const nextSafeTop = (pageIdx + 1) * cycle + safeTop;
                push = Math.ceil(nextSafeTop - top);
              }
            }
          }

          if (push > 0 && push < cycle) {
            applyShift(el, push);
            changed = true;
          }
        }

        if (!changed) break;
      }

      // After all shifts, update min-height so the overlay covers all pages
      let contentBottom = 0;
      for (const child of children) {
        if (!child.isConnected) continue;
        const metrics = getBlockMetrics(child, editorEl);
        contentBottom = Math.max(contentBottom, metrics.outerBottom);
      }

      if (contentBottom > 0) {
        // Determine how many pages the content actually occupies.
        // Use a tolerance so content ending very close to or within the bottom
        // margin of the last page doesn't create an extra blank page.
        const tolerance = safeBot + BLEED_PX + 4;
        const rawPages = contentBottom / cycle;
        const totalPages = Math.max(1,
          (contentBottom % cycle) < (pH - tolerance)
            ? Math.ceil(rawPages)
            : Math.round(rawPages) || 1
        );
        const requiredHeight = totalPages * cycle - g;
        editorEl.style.minHeight = `${requiredHeight}px`;
      }
    } catch (err) {
      console.warn("[usePageBreaks] reflow error:", err);
    } finally {
      isRunning.current = false;
    }
  }, [editor, editorEl, marginTop, marginBottom, measure]);

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
      }, 40);
    };

    // Initial reflow — multiple timings to catch fonts/images loading
    const initTimer1 = setTimeout(scheduleReflow, 10);
    const initTimer2 = setTimeout(scheduleReflow, 100);
    const initTimer3 = setTimeout(scheduleReflow, 400);
    const initTimer4 = setTimeout(scheduleReflow, 1000);

    // Observe content mutations (not our own attribute changes)
    let moConnected = false;
    const mo = new MutationObserver((mutations) => {
      if (isRunning.current) return;
      const isOurChange = mutations.every(
        (m) =>
          m.type === "attributes" &&
          (m.attributeName === SHIFT_ATTR ||
           m.attributeName === ORIG_MT_ATTR ||
           m.attributeName === "style"),
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
        attributeFilter: ["class", "src", "data-blank-page"],
      });
      moConnected = true;
    }, 60);

    // ResizeObserver on the editor element
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
      clearTimeout(initTimer4);
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
