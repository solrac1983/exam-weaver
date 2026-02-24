// Simple in-memory store for exam content (shared across pages)
const examContents: Record<string, string> = {};

export const defaultExamContent = `
<h1 style="text-align: center">AVALIAÇÃO BIMESTRAL</h1>
<p style="text-align: center"><strong>Disciplina:</strong> _________________ &nbsp;&nbsp; <strong>Professor(a):</strong> _________________</p>
<p style="text-align: center"><strong>Aluno(a):</strong> _________________________________ &nbsp;&nbsp; <strong>Turma:</strong> _______ &nbsp;&nbsp; <strong>Data:</strong> ___/___/______</p>
<hr>
<h2>Instruções</h2>
<ul>
<li>Leia atentamente cada questão antes de responder.</li>
<li>Utilize caneta azul ou preta para as respostas.</li>
<li>Não é permitido o uso de corretivo.</li>
</ul>
<hr>
<h2>Questões Objetivas</h2>
<p><strong>1)</strong> Escreva aqui o enunciado da primeira questão...</p>
<p>a) Alternativa A</p>
<p>b) Alternativa B</p>
<p>c) Alternativa C</p>
<p>d) Alternativa D</p>
<p></p>
<h2>Questões Discursivas</h2>
<p><strong>1)</strong> Escreva aqui o enunciado da questão discursiva...</p>
<p></p>
`;

export function saveExamContent(demandId: string, html: string) {
  examContents[demandId] = html;
}

export function getExamContent(demandId: string): string {
  return examContents[demandId] || defaultExamContent;
}
