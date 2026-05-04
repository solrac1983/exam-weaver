/**
 * Visual regression tests for StatusBadge.
 *
 * These use inline DOM snapshots to lock down the rendered HTML structure,
 * Tailwind class set, and label text for every supported status. Any
 * accidental change to layout, color tokens, or the status→class map will
 * fail the test until the snapshot is intentionally updated.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

afterEach(cleanup);

describe("StatusBadge — visual regression", () => {
  it("renders pending status with status-draft styles", () => {
    const { container } = render(<StatusBadge status="pending" />);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium status-draft"
      >
        Pendente
      </span>
    `);
  });

  it("renders in_progress with status-sent styles", () => {
    const { container } = render(<StatusBadge status="in_progress" />);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium status-sent"
      >
        Em andamento
      </span>
    `);
  });

  it("renders review with status-review styles", () => {
    const { container } = render(<StatusBadge status="review" />);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium status-review"
      >
        Em revisão
      </span>
    `);
  });

  it("renders revision_requested with status-overdue styles", () => {
    const { container } = render(<StatusBadge status="revision_requested" />);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium status-overdue"
      >
        Ajustes solicitados
      </span>
    `);
  });

  it("renders approved with status-approved styles", () => {
    const { container } = render(<StatusBadge status="approved" />);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium status-approved"
      >
        Aprovada
      </span>
    `);
  });

  it("falls back to status-draft styling for unknown status", () => {
    const { container } = render(<StatusBadge status="unknown_status" />);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium status-draft"
      >
        unknown_status
      </span>
    `);
  });

  it("merges custom className without dropping base classes", () => {
    const { container } = render(
      <StatusBadge status="approved" className="ml-2 shadow" />,
    );
    const el = container.firstChild as HTMLElement;
    // Base structural classes preserved
    expect(el.className).toContain("inline-flex");
    expect(el.className).toContain("rounded-full");
    expect(el.className).toContain("status-approved");
    // Custom classes appended
    expect(el.className).toContain("ml-2");
    expect(el.className).toContain("shadow");
  });
});
