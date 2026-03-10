/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import SimuladoCard from "./SimuladoCard";
import { Simulado, defaultFormat } from "@/hooks/useSimulados";

const noop = () => {};

const baseSim: Simulado = {
  id: "sim1",
  company_id: "c1",
  coordinator_id: "u1",
  title: "Simulado ENEM 2026",
  class_groups: ["3ºA", "3ºB"],
  application_date: "2026-05-10",
  deadline: "2026-05-01",
  status: "draft",
  announcement: "",
  format: { ...defaultFormat },
  created_at: "",
  updated_at: "",
  subjects: [
    {
      id: "s1", simulado_id: "sim1", subject_name: "Matemática",
      question_count: 10, type: "objetiva", teacher_id: null,
      sort_order: 0, status: "pending", content: "", answer_key: "",
      revision_notes: "", created_at: "", updated_at: "",
    },
    {
      id: "s2", simulado_id: "sim1", subject_name: "Português",
      question_count: 5, type: "objetiva", teacher_id: "t1", teacher_name: "João",
      sort_order: 1, status: "approved", content: "Q", answer_key: "1-A",
      revision_notes: "", created_at: "", updated_at: "",
    },
  ],
};

const defaultProps = {
  sim: baseSim,
  isExpanded: false,
  onToggle: noop,
  isCoordinator: true,
  isProfessor: false,
  onProfessorEdit: noop,
  onRevision: noop,
  onApprove: noop,
  onApproveAll: noop,
  onGenerateFile: noop,
  onGeneratePDF: noop,
  onGenerateAnswerKey: noop,
  onAnnouncement: noop,
  onAnswerSheet: noop,
  onAnswerKeyEditor: noop,
};

describe("SimuladoCard", () => {
  it("renders title and class groups", () => {
    const { getByText } = render(<SimuladoCard {...defaultProps} />);
    expect(getByText("Simulado ENEM 2026")).toBeInTheDocument();
    expect(getByText(/3ºA, 3ºB/)).toBeInTheDocument();
  });

  it("shows status badge", () => {
    const { getByText } = render(<SimuladoCard {...defaultProps} />);
    expect(getByText("Rascunho")).toBeInTheDocument();
  });

  it("shows submission count", () => {
    const { getByText } = render(<SimuladoCard {...defaultProps} />);
    expect(getByText("1/2 enviadas")).toBeInTheDocument();
  });

  it("does not show expanded content when collapsed", () => {
    const { queryByText } = render(<SimuladoCard {...defaultProps} isExpanded={false} />);
    expect(queryByText("Matemática")).toBeNull();
  });

  it("shows subject table when expanded", () => {
    const { getByText } = render(<SimuladoCard {...defaultProps} isExpanded={true} />);
    expect(getByText("Matemática")).toBeInTheDocument();
    expect(getByText("Português")).toBeInTheDocument();
    expect(getByText("João")).toBeInTheDocument();
  });

  it("shows approved badge for approved subjects when coordinator", () => {
    const { getByText } = render(<SimuladoCard {...defaultProps} isExpanded={true} />);
    expect(getByText("✓ Aprovada")).toBeInTheDocument();
  });

  it("shows footer actions when expanded as coordinator", () => {
    const { getByText } = render(<SimuladoCard {...defaultProps} isExpanded={true} />);
    expect(getByText("Gerar Arquivo")).toBeInTheDocument();
    expect(getByText("Folha de Respostas")).toBeInTheDocument();
  });

  it("shows professor announcement when expanded as professor", () => {
    const simWithAnnouncement = { ...baseSim, announcement: "Entreguem até sexta!" };
    const { getByText } = render(
      <SimuladoCard {...defaultProps} sim={simWithAnnouncement} isExpanded={true} isProfessor={true} isCoordinator={false} />
    );
    expect(getByText("Entreguem até sexta!")).toBeInTheDocument();
  });
});
