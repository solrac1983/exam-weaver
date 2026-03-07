import { toast } from "sonner";
import type { ClassMetrics, SubjectMetrics } from "@/lib/performanceMetrics";

export function handlePerformanceExport(
  type: "print" | "pdf",
  opts: {
    bimesterFilter: string;
    globalAverage: number;
    classMetrics: ClassMetrics[];
    totalStudents: number;
    riskStudents: number;
    subjectMetrics: SubjectMetrics[];
  }
) {
  const { bimesterFilter, globalAverage, classMetrics, totalStudents, riskStudents, subjectMetrics } = opts;
  const colorClass = (v: number) => v >= 70 ? "good" : v >= 50 ? "warn" : "bad";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Painel de Desempenho</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 15mm; }
    @media print { body { margin: 0; } }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1a1a1a; max-width: 297mm; margin: 0 auto; padding: 8mm 0; }
    h1 { font-size: 16pt; color: #2c3e50; border-bottom: 2px solid #3b82f6; padding-bottom: 3mm; margin-bottom: 4mm; }
    .subtitle { font-size: 9pt; color: #6b7280; margin-bottom: 6mm; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-bottom: 6mm; }
    .kpi { border: 1px solid #e5e7eb; border-radius: 2mm; padding: 3mm 4mm; }
    .kpi-label { font-size: 8pt; color: #6b7280; text-transform: uppercase; font-weight: 600; }
    .kpi-value { font-size: 18pt; font-weight: 700; margin-top: 1mm; }
    .section { margin-bottom: 5mm; break-inside: avoid; }
    .section-title { font-size: 11pt; font-weight: 700; color: #2c3e50; margin-bottom: 2mm; border-bottom: 1px solid #e5e7eb; padding-bottom: 1mm; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 4mm; }
    th { background: #2c3e50; color: #fff; padding: 2mm 3mm; text-align: left; font-weight: 600; }
    td { border-bottom: 1px solid #e5e7eb; padding: 1.5mm 3mm; }
    tr:nth-child(even) td { background: #f9fafb; }
    .good { color: #059669; font-weight: 700; }
    .warn { color: #d97706; font-weight: 700; }
    .bad { color: #dc2626; font-weight: 700; }
    .footer { text-align: center; font-size: 7.5pt; color: #9ca3af; margin-top: 6mm; border-top: 1px solid #e5e7eb; padding-top: 2mm; }
  </style>
</head>
<body>
  <h1>📊 Painel de Desempenho</h1>
  <div class="subtitle">${bimesterFilter === "all" ? "Todos os bimestres" : bimesterFilter + "º Bimestre"} • Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Média Geral</div><div class="kpi-value ${colorClass(globalAverage)}">${globalAverage}%</div></div>
    <div class="kpi"><div class="kpi-label">Turmas</div><div class="kpi-value">${classMetrics.length}</div></div>
    <div class="kpi"><div class="kpi-label">Alunos</div><div class="kpi-value">${totalStudents}</div></div>
    <div class="kpi"><div class="kpi-label">Em Risco (&lt;50%)</div><div class="kpi-value bad">${riskStudents}</div></div>
  </div>
  <div class="section">
    <div class="section-title">🏆 Ranking de Turmas</div>
    <table>
      <thead><tr><th>#</th><th>Turma</th><th>Média</th><th>Alunos</th><th>Notas</th><th>&lt;60%</th><th>&gt;80%</th></tr></thead>
      <tbody>${classMetrics.map((cm, i) => `<tr><td>${i < 3 ? ["🥇","🥈","🥉"][i] : (i+1)+"º"}</td><td>${cm.name}</td><td class="${colorClass(cm.average)}">${cm.average}%</td><td>${cm.studentsCount}</td><td>${cm.totalGrades}</td><td>${cm.below60Pct}%</td><td>${cm.above80Pct}%</td></tr>`).join("")}</tbody>
    </table>
  </div>
  <div class="section">
    <div class="section-title">📚 Disciplinas — Detalhamento por Turma</div>
    <table>
      <thead><tr><th>Disciplina</th><th>Média</th><th>Notas</th><th>Turmas</th></tr></thead>
      <tbody>${subjectMetrics.map(sm => `<tr><td>${sm.name}</td><td class="${colorClass(sm.average)}">${sm.average}%</td><td>${sm.totalGrades}</td><td>${sm.classBreakdown.map(cb => cb.className + ": " + cb.average + "%").join(", ")}</td></tr>`).join("")}</tbody>
    </table>
  </div>
  <div class="footer">Documento gerado por SmartTest • ${new Date().toLocaleDateString("pt-BR")}</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { toast.error("Permita pop-ups para exportar."); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); };
  if (type === "pdf") toast.info("Use 'Salvar como PDF' na janela de impressão.");
}
