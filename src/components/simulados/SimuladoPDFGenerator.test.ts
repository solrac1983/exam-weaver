import { describe, it, expect, vi } from "vitest";
import { generateConsolidatedPDF, generateAnswerKeyPDF } from "./SimuladoPDFGenerator";
import { Simulado, defaultFormat } from "@/hooks/useSimulados";

const makeSimulado = (overrides: Partial<Simulado> = {}): Simulado => ({
  id: "sim1",
  company_id: "c1",
  coordinator_id: "u1",
  title: "Simulado Teste",
  class_groups: ["3ºA"],
  application_date: "2026-03-01",
  deadline: "2026-02-28",
  status: "draft",
  announcement: "",
  format: { ...defaultFormat },
  created_at: "",
  updated_at: "",
  subjects: [],
  ...overrides,
});

describe("SimuladoPDFGenerator", () => {
  describe("generateConsolidatedPDF", () => {
    it("returns false when no approved subjects", () => {
      const sim = makeSimulado({
        subjects: [{
          id: "s1", simulado_id: "sim1", subject_name: "Matemática",
          question_count: 10, type: "objetiva", teacher_id: null,
          sort_order: 0, status: "pending", content: "", answer_key: "",
          revision_notes: "", created_at: "", updated_at: "",
        }],
      });
      expect(generateConsolidatedPDF(sim)).toBe(false);
    });

    it("returns false when subjects is empty", () => {
      expect(generateConsolidatedPDF(makeSimulado())).toBe(false);
    });

    it("opens print window for approved subjects", () => {
      const mockWrite = vi.fn();
      const mockClose = vi.fn();
      const mockWindow = { document: { write: mockWrite, close: mockClose }, onload: null } as any;
      vi.spyOn(window, "open").mockReturnValue(mockWindow);

      const sim = makeSimulado({
        subjects: [{
          id: "s1", simulado_id: "sim1", subject_name: "Matemática",
          question_count: 10, type: "objetiva", teacher_id: null,
          sort_order: 0, status: "approved", content: "<p>Q1</p>", answer_key: "1-A",
          revision_notes: "", created_at: "", updated_at: "",
        }],
      });

      const result = generateConsolidatedPDF(sim);
      expect(result).toBe(true);
      expect(mockWrite).toHaveBeenCalledOnce();
      expect(mockClose).toHaveBeenCalledOnce();
      expect(mockWrite.mock.calls[0][0]).toContain("Simulado Teste");
      expect(mockWrite.mock.calls[0][0]).toContain("Matemática");

      vi.restoreAllMocks();
    });

    it("returns false when popup is blocked", () => {
      vi.spyOn(window, "open").mockReturnValue(null);

      const sim = makeSimulado({
        subjects: [{
          id: "s1", simulado_id: "sim1", subject_name: "Matemática",
          question_count: 5, type: "objetiva", teacher_id: null,
          sort_order: 0, status: "approved", content: "Q", answer_key: "",
          revision_notes: "", created_at: "", updated_at: "",
        }],
      });

      expect(generateConsolidatedPDF(sim)).toBe(false);
      vi.restoreAllMocks();
    });
  });

  describe("generateAnswerKeyPDF", () => {
    it("returns false when no approved subjects", () => {
      expect(generateAnswerKeyPDF(makeSimulado())).toBe(false);
    });

    it("generates answer key HTML for approved subjects", () => {
      const mockWrite = vi.fn();
      const mockClose = vi.fn();
      vi.spyOn(window, "open").mockReturnValue({
        document: { write: mockWrite, close: mockClose }, onload: null,
      } as any);

      const sim = makeSimulado({
        subjects: [{
          id: "s1", simulado_id: "sim1", subject_name: "Física",
          question_count: 5, type: "objetiva", teacher_id: null,
          sort_order: 0, status: "approved", content: "", answer_key: "1-B, 2-C",
          revision_notes: "", created_at: "", updated_at: "",
        }],
      });

      expect(generateAnswerKeyPDF(sim)).toBe(true);
      expect(mockWrite.mock.calls[0][0]).toContain("Gabarito");
      expect(mockWrite.mock.calls[0][0]).toContain("Física");
      expect(mockWrite.mock.calls[0][0]).toContain("1-B, 2-C");

      vi.restoreAllMocks();
    });
  });
});
