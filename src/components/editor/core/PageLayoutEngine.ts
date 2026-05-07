/**
 * PageLayoutEngine — single source of truth for page geometry.
 *
 * Replaces the duplicated math currently spread across:
 *   - PaginationExtension.ts
 *   - pageSizing.ts
 *   - pageBreakTextFlow.ts
 *   - usePageBreaks.ts
 *
 * Everything is mm-first; pixel conversions happen at the edge so screen,
 * print, PDF (Puppeteer at 96 DPI) and DOCX (DXA = mm × 56.6929) can all
 * derive their numbers from one place.
 */
import type { PageSetup } from "./DocumentModel";

export const MM_PER_INCH = 25.4;
export const PX_PER_INCH = 96;
export const PX_PER_MM = PX_PER_INCH / MM_PER_INCH; // ≈ 3.7795
export const DXA_PER_MM = 56.6929; // 1440 dxa per inch / 25.4

export const PAGE_DIMENSIONS_MM: Record<PageSetup["size"], { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
  Legal: { w: 215.9, h: 355.6 },
};

export interface PageGeometryMm {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentHeight: number;
  margins: { top: number; right: number; bottom: number; left: number };
}

export interface PageGeometryPx {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentHeight: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export class PageLayoutEngine {
  constructor(public readonly setup: PageSetup) {}

  geometryMm(): PageGeometryMm {
    const dims = PAGE_DIMENSIONS_MM[this.setup.size];
    const portrait = this.setup.orientation === "portrait";
    const pageWidth = portrait ? dims.w : dims.h;
    const pageHeight = portrait ? dims.h : dims.w;
    const m = this.setup.margins;
    return {
      pageWidth,
      pageHeight,
      contentWidth: Math.max(10, pageWidth - m.left - m.right),
      contentHeight: Math.max(10, pageHeight - m.top - m.bottom),
      margins: { ...m },
    };
  }

  geometryPx(): PageGeometryPx {
    const g = this.geometryMm();
    return {
      pageWidth: g.pageWidth * PX_PER_MM,
      pageHeight: g.pageHeight * PX_PER_MM,
      contentWidth: g.contentWidth * PX_PER_MM,
      contentHeight: g.contentHeight * PX_PER_MM,
      paddingTop: g.margins.top * PX_PER_MM,
      paddingRight: g.margins.right * PX_PER_MM,
      paddingBottom: g.margins.bottom * PX_PER_MM,
      paddingLeft: g.margins.left * PX_PER_MM,
    };
  }

  /** CSS variables consumed by `index.css` for screen / print parity. */
  toCSSVars(): Record<string, string> {
    const g = this.geometryMm();
    return {
      "--page-w": `${g.pageWidth}mm`,
      "--page-h": `${g.pageHeight}mm`,
      "--page-content-w": `${g.contentWidth}mm`,
      "--page-content-h": `${g.contentHeight}mm`,
      "--page-margin-top": `${g.margins.top}mm`,
      "--page-margin-right": `${g.margins.right}mm`,
      "--page-margin-bottom": `${g.margins.bottom}mm`,
      "--page-margin-left": `${g.margins.left}mm`,
      "--page-columns": String(this.setup.columns),
      "--page-column-gap": `${this.setup.columnGap}mm`,
    };
  }

  /** Puppeteer / `@page` print options. */
  toPrintOptions() {
    const g = this.geometryMm();
    return {
      format: this.setup.size,
      landscape: this.setup.orientation === "landscape",
      margin: {
        top: `${g.margins.top}mm`,
        right: `${g.margins.right}mm`,
        bottom: `${g.margins.bottom}mm`,
        left: `${g.margins.left}mm`,
      },
    };
  }

  /** docx-js section properties. */
  toDocxSection() {
    const g = this.geometryMm();
    return {
      page: {
        size: {
          width: Math.round(g.pageWidth * DXA_PER_MM),
          height: Math.round(g.pageHeight * DXA_PER_MM),
          orientation: this.setup.orientation,
        },
        margin: {
          top: Math.round(g.margins.top * DXA_PER_MM),
          right: Math.round(g.margins.right * DXA_PER_MM),
          bottom: Math.round(g.margins.bottom * DXA_PER_MM),
          left: Math.round(g.margins.left * DXA_PER_MM),
        },
      },
      column: this.setup.columns > 1
        ? { count: this.setup.columns, space: Math.round(this.setup.columnGap * DXA_PER_MM), equalWidth: true }
        : undefined,
    };
  }

  /**
   * Greedy capacity check: how many pages do `blockHeights` (px) need?
   * Mirrors PaginationExtension's logic — pure for testing.
   */
  countPages(blockHeights: number[]): number {
    if (blockHeights.length === 0) return 1;
    const cap = this.geometryPx().contentHeight;
    let pages = 1;
    let used = 0;
    for (const h of blockHeights) {
      if (h > cap) {
        if (used > 0) { pages += 1; used = 0; }
        const fullPages = Math.floor(h / cap);
        const remainder = h - fullPages * cap;
        pages += fullPages;
        used = remainder;
        if (used >= cap) { pages += 1; used = 0; }
        continue;
      }
      if (used > 0 && used + h > cap) {
        pages += 1;
        used = h;
      } else {
        used += h;
      }
    }
    return pages;
  }
}
