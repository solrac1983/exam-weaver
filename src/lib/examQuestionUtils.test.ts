import { describe, expect, it } from "vitest";
import { extractAnswersFromContent } from "./examQuestionUtils";

describe("extractAnswersFromContent", () => {
  it("combina formatos sequenciais de múltiplas disciplinas", () => {
    const html = `
      <h2>Inglês</h2>
      <p>Letra A. Pág 10</p>
      <p>Letra B. Pág 11</p>
      <h2>Gramática</h2>
      <p>Gabarito: C</p>
      <p>Resposta: D</p>
      <h2>História</h2>
      <p>Gabarito: E, A, B</p>
    `;

    expect(extractAnswersFromContent(html)).toEqual([
      { questionNum: 1, answer: "A" },
      { questionNum: 2, answer: "B" },
      { questionNum: 3, answer: "C" },
      { questionNum: 4, answer: "D" },
      { questionNum: 5, answer: "E" },
      { questionNum: 6, answer: "A" },
      { questionNum: 7, answer: "B" },
    ]);
  });
});