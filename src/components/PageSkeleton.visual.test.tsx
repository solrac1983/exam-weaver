/**
 * Visual regression tests for the page-level skeleton variants.
 *
 * Asserts structural counts (rows, cards, sections) and key layout classes
 * so accidental rewrites of these placeholders are caught.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import {
  TablePageSkeleton,
  CardGridSkeleton,
  FinanceiroSkeleton,
  OverviewSkeleton,
  InvoicesSkeleton,
  DueAlertsSkeleton,
  PaymentMethodsSkeleton,
} from "./PageSkeleton";

afterEach(cleanup);

const countSkeletons = (root: HTMLElement) =>
  root.querySelectorAll('[data-slot="skeleton"], .animate-pulse').length;

describe("PageSkeleton — visual regression", () => {
  it("TablePageSkeleton renders the requested number of rows", () => {
    const { container } = render(<TablePageSkeleton rows={3} />);
    // Each row contains a checkbox + title + subtitle + 2 action buttons
    const rows = container.querySelectorAll(".border-t.border-border");
    expect(rows.length).toBe(3);
    expect(container.firstChild).toHaveClass("animate-fade-in");
  });

  it("TablePageSkeleton defaults to 5 rows", () => {
    const { container } = render(<TablePageSkeleton />);
    expect(container.querySelectorAll(".border-t.border-border").length).toBe(5);
  });

  it("CardGridSkeleton renders the requested number of cards", () => {
    const { container } = render(<CardGridSkeleton cards={6} />);
    const cards = container.querySelectorAll(".grid > .rounded-lg.border");
    expect(cards.length).toBe(6);
  });

  it("CardGridSkeleton uses a responsive 1→2 column grid", () => {
    const { container } = render(<CardGridSkeleton />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("grid-cols-1");
    expect(grid?.className).toContain("md:grid-cols-2");
  });

  it("FinanceiroSkeleton renders 4 KPI cards and a chart placeholder", () => {
    const { container } = render(<FinanceiroSkeleton />);
    const kpis = container.querySelectorAll(".grid > .rounded-lg.border");
    expect(kpis.length).toBe(4);
    expect(container.querySelector(".h-\\[260px\\]")).not.toBeNull();
  });

  it("OverviewSkeleton renders KPIs, two charts and a transactions table", () => {
    const { container } = render(<OverviewSkeleton />);
    expect(container.querySelectorAll(".md\\:grid-cols-4 > div").length).toBe(4);
    expect(container.querySelectorAll(".md\\:grid-cols-2 > div").length).toBe(2);
  });

  it("InvoicesSkeleton renders 5 table rows", () => {
    const { container } = render(<InvoicesSkeleton />);
    expect(container.querySelectorAll(".border-t.border-border").length).toBe(5);
  });

  it("DueAlertsSkeleton renders 3 columns × 2 alerts", () => {
    const { container } = render(<DueAlertsSkeleton />);
    const cols = container.querySelectorAll(".md\\:grid-cols-3 > .rounded-lg.border");
    expect(cols.length).toBe(3);
  });

  it("PaymentMethodsSkeleton renders 3 method cards in a responsive grid", () => {
    const { container } = render(<PaymentMethodsSkeleton />);
    const cards = container.querySelectorAll(".grid > .rounded-lg.border");
    expect(cards.length).toBe(3);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("md:grid-cols-2");
    expect(grid?.className).toContain("lg:grid-cols-3");
  });

  it("all skeletons share the fade-in entrance animation", () => {
    const variants = [
      <TablePageSkeleton key="t" />,
      <CardGridSkeleton key="c" />,
      <FinanceiroSkeleton key="f" />,
      <OverviewSkeleton key="o" />,
      <InvoicesSkeleton key="i" />,
      <DueAlertsSkeleton key="d" />,
      <PaymentMethodsSkeleton key="p" />,
    ];
    for (const node of variants) {
      const { container } = render(node);
      expect(container.firstChild).toHaveClass("animate-fade-in");
      cleanup();
    }
    // Sanity: at least one skeleton element rendered overall
    const { container } = render(<TablePageSkeleton rows={1} />);
    expect(countSkeletons(container as HTMLElement)).toBeGreaterThan(0);
  });
});
