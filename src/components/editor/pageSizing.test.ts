import { describe, it, expect } from "vitest"
import {
  A4_HEIGHT_PX,
  CM_TO_PX,
  computeContentHeight,
  countPages,
  renderedPageHeight,
  trailingSpacerHeight,
  type PageGeometry,
} from "./pageSizing"

const defaultGeometry: PageGeometry = {
  pageHeightPx: A4_HEIGHT_PX,
  padTop: 1 * CM_TO_PX,
  padBottom: 1 * CM_TO_PX,
  reservedTop: 0,
  reservedBottom: 0,
}

const withHeader: PageGeometry = {
  ...defaultGeometry,
  reservedTop: 1.2 * CM_TO_PX,
  reservedBottom: 1.2 * CM_TO_PX,
}

describe("A4 page sizing — regression tests", () => {
  describe("computeContentHeight", () => {
    it("subtracts paddings and reserved zones from A4 height", () => {
      const content = computeContentHeight(defaultGeometry)
      expect(content).toBeCloseTo(A4_HEIGHT_PX - 2 * CM_TO_PX, 5)
    })

    it("respects header/footer reservations", () => {
      const plain = computeContentHeight(defaultGeometry)
      const withOverlay = computeContentHeight(withHeader)
      expect(withOverlay).toBeLessThan(plain)
      expect(plain - withOverlay).toBeCloseTo(2.4 * CM_TO_PX, 5)
    })

    it("never returns less than the 80px floor", () => {
      const tiny: PageGeometry = {
        pageHeightPx: 100,
        padTop: 200,
        padBottom: 200,
        reservedTop: 0,
        reservedBottom: 0,
      }
      expect(computeContentHeight(tiny)).toBe(80)
    })
  })

  describe("trailingSpacerHeight", () => {
    it("returns 0 when the page has no content (avoids extra blank page)", () => {
      expect(trailingSpacerHeight(0, 1000)).toBe(0)
    })

    it("returns 0 when content already fills the page", () => {
      expect(trailingSpacerHeight(1000, 1000)).toBe(0)
      expect(trailingSpacerHeight(1200, 1000)).toBe(0)
    })

    it("fills the gap so used + spacer === content area", () => {
      const content = 1000
      const used = 350
      const spacer = trailingSpacerHeight(used, content)
      expect(used + spacer).toBe(content)
    })
  })

  describe("renderedPageHeight — A4 invariant", () => {
    it("does not render a full A4 for an empty document (no extra blank page)", () => {
      // When usedHeight is 0, the previous page break already closed the page;
      // we must not pad to A4 (which would create a phantom blank page).
      expect(renderedPageHeight(0, defaultGeometry)).toBeLessThan(A4_HEIGHT_PX)
    })

    it.each([
      ["short content (100px)", 100],
      ["half-full content", computeContentHeight(defaultGeometry) / 2],
      ["nearly full content", computeContentHeight(defaultGeometry) - 1],
      ["exactly full content", computeContentHeight(defaultGeometry)],
    ])("renders exactly A4 (%s)", (_label, used) => {
      const total = renderedPageHeight(used, defaultGeometry)
      expect(total).toBeCloseTo(A4_HEIGHT_PX, 3)
    })

    it("renders exactly A4 with header/footer overlays", () => {
      const used = computeContentHeight(withHeader) / 3
      const total = renderedPageHeight(used, withHeader)
      expect(total).toBeCloseTo(A4_HEIGHT_PX, 3)
    })
  })

  describe("countPages — content length regression", () => {
    const content = computeContentHeight(defaultGeometry)

    it("returns 0 pages for an empty document", () => {
      expect(countPages([], content)).toBe(0)
    })

    it("fits a single small block on one page", () => {
      expect(countPages([200], content)).toBe(1)
    })

    it("fits multiple blocks summing under one page on one page", () => {
      expect(countPages([200, 200, 200], content)).toBe(1)
    })

    it("breaks into 2 pages when blocks exceed one page", () => {
      const half = content / 2
      expect(countPages([half, half, half], content)).toBe(2)
    })

    it("places exactly content-sized block on a single page", () => {
      expect(countPages([content], content)).toBe(1)
    })

    it("paginates a long document into the expected page count", () => {
      const block = content / 4 // 4 blocks per page
      const blocks = Array(20).fill(block) // 20 blocks → 5 pages
      expect(countPages(blocks, content)).toBe(5)
    })

    it("handles oversized blocks (paragraph taller than one page)", () => {
      // 2.5x the content area should require 3 pages
      expect(countPages([content * 2.5], content)).toBe(3)
    })

    it("every page in a multi-page document is A4 (rendered height)", () => {
      const block = content / 3
      const blocks = Array(10).fill(block)
      const pages = countPages(blocks, content)
      expect(pages).toBe(Math.ceil(10 / 3))
      // Each page (full or partial) must render at A4
      for (let p = 0; p < pages; p++) {
        const usedOnPage = p === pages - 1
          ? (10 % 3 || 3) * block
          : 3 * block
        expect(renderedPageHeight(usedOnPage, defaultGeometry)).toBeCloseTo(
          A4_HEIGHT_PX,
          3,
        )
      }
    })
  })
})
