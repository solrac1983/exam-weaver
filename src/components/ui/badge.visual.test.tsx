/**
 * Visual regression tests for the Badge primitive.
 *
 * Locks the variant → class mapping so design-system changes are caught.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Badge } from "./badge";

afterEach(cleanup);

describe("Badge — visual regression", () => {
  it("renders default variant", () => {
    const { container } = render(<Badge>Default</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe("DIV");
    expect(el.className).toContain("bg-primary");
    expect(el.className).toContain("text-primary-foreground");
    expect(el.className).toContain("rounded-full");
    expect(el.className).toContain("text-xs");
  });

  it("renders secondary variant", () => {
    const { container } = render(<Badge variant="secondary">Sec</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-secondary");
    expect(el.className).toContain("text-secondary-foreground");
    expect(el.className).not.toContain("bg-primary ");
  });

  it("renders destructive variant", () => {
    const { container } = render(<Badge variant="destructive">!</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-destructive");
    expect(el.className).toContain("text-destructive-foreground");
  });

  it("renders outline variant without solid background", () => {
    const { container } = render(<Badge variant="outline">Out</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("text-foreground");
    expect(el.className).not.toContain("bg-primary");
    expect(el.className).not.toContain("bg-destructive");
  });

  it("preserves base layout classes across variants", () => {
    for (const v of ["default", "secondary", "destructive", "outline"] as const) {
      const { container } = render(<Badge variant={v}>x</Badge>);
      const el = container.firstChild as HTMLElement;
      expect(el.className).toContain("inline-flex");
      expect(el.className).toContain("items-center");
      expect(el.className).toContain("rounded-full");
      expect(el.className).toContain("px-2.5");
      expect(el.className).toContain("py-0.5");
      cleanup();
    }
  });
});
