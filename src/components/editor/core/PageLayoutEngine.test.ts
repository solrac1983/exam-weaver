import { describe, it, expect } from "vitest";
import { PageLayoutEngine, PX_PER_MM } from "./PageLayoutEngine";
import { defaultPageSetup } from "./DocumentModel";

describe("PageLayoutEngine", () => {
  it("computes A4 portrait geometry in mm", () => {
    const engine = new PageLayoutEngine(defaultPageSetup);
    const g = engine.geometryMm();
    expect(g.pageWidth).toBe(210);
    expect(g.pageHeight).toBe(297);
    expect(g.contentWidth).toBe(210 - 20 - 20);
    expect(g.contentHeight).toBe(297 - 25 - 25);
  });

  it("swaps width/height in landscape", () => {
    const engine = new PageLayoutEngine({ ...defaultPageSetup, orientation: "landscape" });
    const g = engine.geometryMm();
    expect(g.pageWidth).toBe(297);
    expect(g.pageHeight).toBe(210);
  });

  it("emits CSS variables in mm", () => {
    const vars = new PageLayoutEngine(defaultPageSetup).toCSSVars();
    expect(vars["--page-w"]).toBe("210mm");
    expect(vars["--page-h"]).toBe("297mm");
    expect(vars["--page-margin-top"]).toBe("25mm");
  });

  it("converts to docx section in DXA", () => {
    const section = new PageLayoutEngine(defaultPageSetup).toDocxSection();
    // 210mm × 56.6929 ≈ 11906
    expect(section.page.size.width).toBe(11906);
    expect(section.page.size.height).toBe(16838);
  });

  it("counts pages for empty content as 1", () => {
    const engine = new PageLayoutEngine(defaultPageSetup);
    expect(engine.countPages([])).toBe(1);
  });

  it("packs blocks greedily into pages", () => {
    const engine = new PageLayoutEngine(defaultPageSetup);
    const cap = engine.geometryPx().contentHeight;
    expect(engine.countPages([cap * 0.5, cap * 0.4])).toBe(1);
    expect(engine.countPages([cap * 0.7, cap * 0.7])).toBe(2);
    // Oversized block spans multiple pages
    expect(engine.countPages([cap * 2.5])).toBeGreaterThanOrEqual(3);
  });

  it("PX_PER_MM matches CSS 96 DPI assumption", () => {
    expect(PX_PER_MM).toBeCloseTo(3.7795, 3);
  });
});
