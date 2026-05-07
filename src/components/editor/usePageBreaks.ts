import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useCallback } from "react";
import {
  isTextFlowElement,
  estimateLineCount,
  linesInHeight,
  MIN_ORPHAN_LINES,
  MIN_WIDOW_LINES,
} from "./pageBreakTextFlow";

const ORIG_MT_ATTR = "data-pb-orig-mt";
const SHIFT_ATTR = "data-page-break-shift";

/** Rigidity presets: { bleed, reservedLines, keepWithNextThreshold } */
const RIGIDITY_PRESETS = {
  soft:     { bleed: 4,  reservedLines: 0, keepWithNext: 8 },
  balanced: { bleed: 16, reservedLines: 2, keepWithNext: 24 },
  strict:   { bleed: 56, reservedLines: 8, keepWithNext: 80 },
} as const;

type RigidityLevel = keyof typeof RIGIDITY_PRESETS;

const MIN_CONTENT_HEIGHT_PX = 48;

/** Gap between pages — read dynamically from CSS variable --page-gap so it
 * always matches the rendered layout (defined in index.css / PageSettingsPanel). */
const DEFAULT_GAP_CSS = "20px";

function readPageGapCss(ctx: HTMLElement): string {
  let el: HTMLElement | null = ctx;
  while (el) {
    const v = getComputedStyle(el).getPropertyValue("--page-gap").trim();
    if (v) return v;
    el = el.parentElement;
  }
  return DEFAULT_GAP_CSS;
}

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

function getReservedBottomSpace(root: HTMLElement, reservedLines: number): number {
  return Math.ceil(getRootLineHeight(root) * reservedLines);
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

/** Check if element should be kept together with the next element (keep-with-next) */
function shouldKeepWithNext(el: HTMLElement): boolean {
  // Headings always keep with next content
  if (isHeading(el)) return true;
  // Short elements (like labels, captions) keep with next
  if (el.tagName === "P" && el.textContent && el.textContent.trim().length < 40) {
    const style = window.getComputedStyle(el);
    if (style.fontWeight >= "600" || style.fontWeight === "bold") return true;
  }
  return false;
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

  return 0;
}

/**
 * Check widow/orphan constraints for a text element that crosses a page boundary.
 * Returns true if the element should be pushed entirely to the next page
 * (because splitting would create a widow or orphan).
 */

export function usePageBreaks(
  editor: Editor | null,
  editorEl: HTMLElement | null,
  marginTop: number,
  marginBottom: number,
) {
  const rafRef = useRef(0);
  const timerRef = useRef(0);
  const isRunning = useRef(false);
  const suppressObservers = useRef(false);
  const pageH = useRef(0);
  const gap = useRef(0);
  const rigidity = useRef<RigidityLevel>("balanced");

  const measure = useCallback(() => {
    if (!editorEl) return;
    pageH.current = measureInContext("297mm", editorEl);
    gap.current = measureInContext(readPageGapCss(editorEl), editorEl);
  }, [editorEl]);

  const reflow = useCallback(() => {
    if (!editorEl || isRunning.current) return;
    if (pageH.current <= 0) {
      measure();
      if (pageH.current <= 0) return;
    }

    isRunning.current = true;
    suppressObservers.current = true;

    try {
      const pH = pageH.current;
      const g = gap.current;
      const cycle = pH + g;

      const preset = RIGIDITY_PRESETS[rigidity.current];
      const BLEED_PX = preset.bleed;
      const keepWithNextThreshold = preset.keepWithNext;

      const rawReservedBottom = getReservedBottomSpace(editorEl, preset.reservedLines);
      const safeTop = measureInContext(`${marginTop + BLEED_PX}px`, editorEl);
      const safeBot = measureInContext(
        `${marginBottom + BLEED_PX + rawReservedBottom}px`,
        editorEl,
      );
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
          if (!el.isConnected) continue;

          const metrics = getBlockMetrics(el, editorEl);
          const h = metrics.outerHeight;
          if (h <= 0) continue;

          const top = metrics.outerTop;
          const bottom = metrics.outerBottom;

          if (bottom <= 0) continue;

          const pageIdx = Math.floor(Math.max(top, 0) / cycle);
          const pageSafeBot = pageIdx * cycle + pH - safeBot;
          const nextSafeTop = (pageIdx + 1) * cycle + safeTop;

          // ── Text flow (widow/orphan aware) ──
          // Allow natural cross-page flow when both sides keep at least
          // MIN_ORPHAN_LINES/MIN_WIDOW_LINES.
          if (isTextFlowElement(el) && top < pageSafeBot && bottom > pageSafeBot) {
            const totalLines = estimateLineCount(el);
            const spaceUntilBreak = Math.max(0, pageSafeBot - top);
            const linesBeforeBreak = Math.max(
              0,
              Math.min(totalLines, linesInHeight(el, spaceUntilBreak)),
            );
            const linesAfterBreak = Math.max(0, totalLines - linesBeforeBreak);

            const violatesOrphanWidow =
              linesBeforeBreak < MIN_ORPHAN_LINES ||
              linesAfterBreak < MIN_WIDOW_LINES;
            const tooShortToSplit = totalLines <= MIN_ORPHAN_LINES + MIN_WIDOW_LINES;

            if (violatesOrphanWidow || tooShortToSplit) {
              const pushAmount = Math.ceil(nextSafeTop - top);
              if (pushAmount > 0 && pushAmount < cycle && !pushed.has(el)) {
                applyShift(el, pushAmount);
                pushed.add(el);
                changed = true;
              }
            }

            // Text blocks that can split safely should stay as-is.
            continue;
          }

          // ── Oversized elements (taller than full page) ──
          if (h >= pH) {
            if (pushed.has(el)) continue;
            const pageSafeTop = pageIdx * cycle + safeTop;
            const nextPageStart = (pageIdx + 1) * cycle;
            const localNextSafeTop = nextPageStart + safeTop;
            const localPageSafeBot = pageIdx * cycle + pH - safeBot;

            if (pageIdx > 0 && top < pageSafeTop) {
              const pushAmount = Math.ceil(pageSafeTop - top);
              if (pushAmount > 0 && pushAmount < cycle) {
                applyShift(el, pushAmount);
                pushed.add(el);
                changed = true;
              }
            } else if (top >= localPageSafeBot && top < localNextSafeTop) {
              const pushAmount = Math.ceil(localNextSafeTop - top);
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

          // ── Keep-with-next: headings and short bold labels ──
          // If this element fits but should stay with the next element,
          // and the next element would overflow, push both together
          if (push <= 0 && shouldKeepWithNext(el) && i + 1 < children.length) {
            const nextEl = children[i + 1];
            if (nextEl.isConnected) {
              const nextMetrics = getBlockMetrics(nextEl, editorEl);
              const nextBottom = nextMetrics.outerBottom;
              const localPageSafeBot = pageIdx * cycle + pH - safeBot;

              // Next element overflows OR current is very close to the bottom
              if (nextBottom > localPageSafeBot || bottom > localPageSafeBot - keepWithNextThreshold) {
                // Only push if next element actually crosses the boundary
                if (nextBottom > localPageSafeBot) {
                  push = Math.ceil(nextSafeTop - top);
                }
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
      requestAnimationFrame(() => {
        suppressObservers.current = false;
      });
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

    if (pageH.current <= 0) measure();

    const scheduleReflow = () => {
      if (isRunning.current || suppressObservers.current) return;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        rafRef.current = requestAnimationFrame(reflow);
      }, 60);
    };

    const initTimer1 = setTimeout(scheduleReflow, 10);
    const initTimer2 = setTimeout(scheduleReflow, 100);
    const initTimer3 = setTimeout(scheduleReflow, 400);
    const initTimer4 = setTimeout(scheduleReflow, 1000);

    let moConnected = false;
    const mo = new MutationObserver((mutations) => {
      if (isRunning.current || suppressObservers.current) return;
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

    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => {
        if (suppressObservers.current || isRunning.current) return;
        scheduleReflow();
      });
      ro.observe(editorEl);
    } catch {
      // ResizeObserver not supported
    }

    editorEl.addEventListener("input", scheduleReflow);
    window.addEventListener("editor-margins-change", scheduleReflow);

    const onRigidityChange = (e: Event) => {
      const level = (e as CustomEvent).detail?.level as RigidityLevel;
      if (level && RIGIDITY_PRESETS[level]) {
        rigidity.current = level;
        scheduleReflow();
      }
    };
    window.addEventListener("editor-pagination-rigidity", onRigidityChange);

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
      window.removeEventListener("editor-pagination-rigidity", onRigidityChange);
      restoreMargins(editorEl);
    };
  }, [editorEl, reflow, measure]);
}
