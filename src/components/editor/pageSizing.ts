/**
 * Pure helpers for A4 pagination math. Extracted so we can unit-test the
 * invariant "every page is exactly A4 tall" without spinning up a full
 * Tiptap editor + jsdom layout engine.
 */

export const CM_TO_PX = 37.7952755906
export const A4_HEIGHT_CM = 29.7
export const A4_WIDTH_CM = 21
export const A4_HEIGHT_PX = A4_HEIGHT_CM * CM_TO_PX
export const A4_WIDTH_PX = A4_WIDTH_CM * CM_TO_PX

export interface PageGeometry {
  pageHeightPx: number
  padTop: number
  padBottom: number
  reservedTop: number
  reservedBottom: number
}

/** Usable content area height inside one A4 page. */
export function computeContentHeight(g: PageGeometry): number {
  return Math.max(
    80,
    g.pageHeightPx - g.padTop - g.padBottom - g.reservedTop - g.reservedBottom,
  )
}

/**
 * Given how much vertical space content used on the last page, return the
 * trailing-spacer height needed so the page renders at exactly A4.
 * Returns 0 when the page is already full or empty.
 */
export function trailingSpacerHeight(
  usedHeight: number,
  contentHeightPx: number,
): number {
  if (usedHeight <= 0) return 0
  if (usedHeight >= contentHeightPx) return 0
  return contentHeightPx - usedHeight
}

/**
 * Total rendered height of one page = padding + reserved zones + content area
 * (content + trailing spacer). Used by tests to assert A4 invariant.
 */
export function renderedPageHeight(
  usedHeight: number,
  g: PageGeometry,
): number {
  const content = computeContentHeight(g)
  const filledContent = usedHeight > 0
    ? usedHeight + trailingSpacerHeight(usedHeight, content)
    : 0
  return g.padTop + g.reservedTop + filledContent + g.reservedBottom + g.padBottom
}

/**
 * Number of A4 pages required to fit `blockHeights` (in CSS px) given a
 * usable content area. Mirrors the greedy fit logic in PaginationExtension
 * (no widow/orphan handling — pure capacity check).
 */
export function countPages(
  blockHeights: number[],
  contentHeightPx: number,
): number {
  if (blockHeights.length === 0) return 0
  let pages = 1
  let used = 0
  for (const h of blockHeights) {
    if (h > contentHeightPx) {
      // Oversized block: occupies its own pages
      if (used > 0) {
        pages += 1
        used = 0
      }
      const fullPages = Math.floor(h / contentHeightPx)
      const remainder = h - fullPages * contentHeightPx
      pages += fullPages // additional pages beyond the first
      used = remainder
      if (used >= contentHeightPx) {
        pages += 1
        used = 0
      }
      continue
    }
    if (used > 0 && used + h > contentHeightPx) {
      pages += 1
      used = h
    } else {
      used += h
    }
  }
  return pages
}
