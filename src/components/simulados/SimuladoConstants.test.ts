import { describe, it, expect } from "vitest";
import {
  buildRanges, totalQuestions, statusLabels, subjectStatusLabels,
  availableSubjects, statusColors, subjectStatusColors,
} from "./SimuladoConstants";
import { SimuladoSubject } from "@/hooks/useSimulados";

const makeSubject = (overrides: Partial<SimuladoSubject> = {}): SimuladoSubject => ({
  id: "s1",
  simulado_id: "sim1",
  subject_name: "Matemática",
  question_count: 10,
  type: "objetiva",
  teacher_id: null,
  sort_order: 0,
  status: "pending",
  content: "",
  answer_key: "",
  revision_notes: "",
  created_at: "",
  updated_at: "",
  ...overrides,
});

describe("SimuladoConstants", () => {
  describe("buildRanges", () => {
    it("assigns sequential ranges for objetiva subjects", () => {
      const subjects = [
        makeSubject({ id: "s1", question_count: 10 }),
        makeSubject({ id: "s2", subject_name: "Física", question_count: 5 }),
      ];
      const ranged = buildRanges(subjects);
      expect(ranged[0].rangeLabel).toBe("1 a 10");
      expect(ranged[1].rangeLabel).toBe("11 a 15");
    });

    it("marks discursiva as 'Discursiva'", () => {
      const subjects = [
        makeSubject({ id: "s1", type: "discursiva", question_count: 1 }),
      ];
      const ranged = buildRanges(subjects);
      expect(ranged[0].rangeLabel).toBe("Discursiva");
    });

    it("skips discursiva in range counting", () => {
      const subjects = [
        makeSubject({ id: "s1", question_count: 5 }),
        makeSubject({ id: "s2", type: "discursiva", question_count: 1 }),
        makeSubject({ id: "s3", subject_name: "Química", question_count: 3 }),
      ];
      const ranged = buildRanges(subjects);
      expect(ranged[0].rangeLabel).toBe("1 a 5");
      expect(ranged[1].rangeLabel).toBe("Discursiva");
      expect(ranged[2].rangeLabel).toBe("6 a 8");
    });

    it("handles empty array", () => {
      expect(buildRanges([])).toEqual([]);
    });
  });

  describe("totalQuestions", () => {
    it("sums only objetiva question counts", () => {
      const subjects = [
        makeSubject({ question_count: 10 }),
        makeSubject({ type: "discursiva", question_count: 1 }),
        makeSubject({ question_count: 5 }),
      ];
      expect(totalQuestions(subjects)).toBe(15);
    });

    it("returns 0 for empty array", () => {
      expect(totalQuestions([])).toBe(0);
    });

    it("returns 0 when all are discursiva", () => {
      const subjects = [
        makeSubject({ type: "discursiva", question_count: 1 }),
        makeSubject({ type: "discursiva", question_count: 2 }),
      ];
      expect(totalQuestions(subjects)).toBe(0);
    });
  });

  describe("labels and colors", () => {
    it("has labels for all statuses", () => {
      expect(statusLabels.draft).toBe("Rascunho");
      expect(statusLabels.complete).toBe("Completo");
    });

    it("has labels for all subject statuses", () => {
      expect(subjectStatusLabels.pending).toBe("Pendente");
      expect(subjectStatusLabels.approved).toBe("Aprovada");
      expect(subjectStatusLabels.revision_requested).toBe("Revisão solicitada");
    });

    it("has colors for all statuses", () => {
      expect(statusColors.draft).toBeDefined();
      expect(statusColors.sent).toBeDefined();
      expect(statusColors.in_progress).toBeDefined();
      expect(statusColors.complete).toBeDefined();
    });

    it("has colors for all subject statuses", () => {
      expect(subjectStatusColors.pending).toBeDefined();
      expect(subjectStatusColors.approved).toBeDefined();
    });
  });

  describe("availableSubjects", () => {
    it("contains expected subjects", () => {
      expect(availableSubjects).toContain("Matemática");
      expect(availableSubjects).toContain("Português");
      expect(availableSubjects).toContain("Inglês");
    });

    it("has no duplicates", () => {
      const unique = new Set(availableSubjects);
      expect(unique.size).toBe(availableSubjects.length);
    });
  });
});
