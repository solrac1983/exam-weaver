import { toast } from "sonner";
import type { StudentMetrics } from "@/lib/performanceMetrics";

const statusLabels: Record<string, string> = {
  satisfatorio: "Satisfatório",
  atencao: "Atenção",
  risco: "Risco",
  evolucao: "Em Evolução",
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  satisfatorio: { bg: "#d1fae5", text: "#065f46", border: "#059669" },
  atencao: { bg: "#fef3c7", text: "#92400e", border: "#d97706" },
  risco: { bg: "#fee2e2", text: "#991b1b", border: "#dc2626" },
  evolucao: { bg: "#dbeafe", text: "#1e40af", border: "#3b82f6" },
};

/** Generate SVG radar chart for subject scores */
function buildRadarSVG(subjects: { name: string; average: number }[]): string {
  if (subjects.length < 3) return "";
  const cx = 120, cy = 120, r = 90;
  const n = subjects.length;
  const angleStep = (2 * Math.PI) / n;

  // Grid circles
  const circles = [0.25, 0.5, 0.75, 1].map(pct => {
    const cr = r * pct;
    return `<circle cx="${cx}" cy="${cy}" r="${cr}" fill="none" stroke="#e5e7eb" stroke-width="0.8"/>`;
  }).join("");

  // Axis lines + labels
  const axes = subjects.map((sub, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const lx = cx + (r + 14) * Math.cos(angle);
    const ly = cy + (r + 14) * Math.sin(angle);
    const name = sub.name.length > 8 ? sub.name.slice(0, 7) + "…" : sub.name;
    return `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#d1d5db" stroke-width="0.6"/>
      <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="7" fill="#6b7280">${name}</text>`;
  }).join("");

  // Data polygon
  const points = subjects.map((sub, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const val = Math.min(sub.average, 100) / 100;
    const x = cx + r * val * Math.cos(angle);
    const y = cy + r * val * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");

  // Data dots
  const dots = subjects.map((sub, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const val = Math.min(sub.average, 100) / 100;
    const x = cx + r * val * Math.cos(angle);
    const y = cy + r * val * Math.sin(angle);
    return `<circle cx="${x}" cy="${y}" r="3" fill="#3b82f6"/>`;
  }).join("");

  return `<svg viewBox="0 0 240 240" width="220" height="220" xmlns="http://www.w3.org/2000/svg">
    ${circles}${axes}
    <polygon points="${points}" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="1.5"/>
    ${dots}
  </svg>`;
}

/** Generate SVG line chart for bimester evolution */
function buildEvolutionSVG(bimScores: { bimester: string; average: number }[]): string {
  if (bimScores.length < 2) return "";
  const w = 300, h = 160, padL = 35, padR = 15, padT = 15, padB = 30;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const maxVal = Math.max(...bimScores.map(b => b.average), 100);
  const minVal = Math.min(...bimScores.map(b => b.average), 0);
  const range = maxVal - minVal || 1;

  const xStep = chartW / (bimScores.length - 1);

  // Y grid lines
  const yLines = [0, 25, 50, 75, 100].map(v => {
    const y = padT + chartH - ((v - minVal) / range) * chartH;
    return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#f1f5f9" stroke-width="0.8"/>
      <text x="${padL - 4}" y="${y + 3}" text-anchor="end" font-size="7" fill="#9ca3af">${v}</text>`;
  }).join("");

  // Goal line at 60%
  const goalY = padT + chartH - ((60 - minVal) / range) * chartH;
  const goalLine = `<line x1="${padL}" y1="${goalY}" x2="${w - padR}" y2="${goalY}" stroke="#dc2626" stroke-width="0.8" stroke-dasharray="4,3"/>
    <text x="${w - padR + 2}" y="${goalY + 3}" font-size="6" fill="#dc2626">Meta</text>`;

  // Data points + line
  const pts = bimScores.map((b, i) => {
    const x = padL + i * xStep;
    const y = padT + chartH - ((b.average - minVal) / range) * chartH;
    return { x, y, label: `${b.bimester}º Bim`, val: b.average };
  });

  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#2563eb" stroke="#fff" stroke-width="1.5"/>
    <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="7.5" fill="#1e40af" font-weight="600">${p.val}%</text>`).join("");
  const labels = pts.map(p => `<text x="${p.x}" y="${h - 5}" text-anchor="middle" font-size="7" fill="#6b7280">${p.label}</text>`).join("");

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    ${yLines}${goalLine}
    <polyline points="${polyline}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg>`;
}

function buildStudentCard(s: StudentMetrics, index: number): string {
  const sc = statusColors[s.status] || statusColors.atencao;
  const avgColor = s.average >= 70 ? "#059669" : s.average >= 50 ? "#d97706" : "#dc2626";

  const subjectRows = s.subjectScores
    .sort((a, b) => b.average - a.average)
    .map(sub => {
      const color = sub.average >= 70 ? "#059669" : sub.average >= 50 ? "#d97706" : "#dc2626";
      return `<tr><td>${sub.name}</td><td style="color:${color};font-weight:700;text-align:center">${sub.average}%</td></tr>`;
    })
    .join("");

  const bimesterHeaders = s.bimesterScores.map(b => `<th>${b.bimester}º Bim</th>`).join("");
  const bimesterCells = s.bimesterScores.map(b => {
    const color = b.average >= 70 ? "#059669" : b.average >= 50 ? "#d97706" : "#dc2626";
    return `<td style="color:${color};font-weight:600;text-align:center">${b.average}%</td>`;
  }).join("");

  const strengths = s.subjectScores.filter(sub => sub.average >= 70).sort((a, b) => b.average - a.average);
  const weaknesses = s.subjectScores.filter(sub => sub.average < 70).sort((a, b) => a.average - b.average);

  const strengthsHTML = strengths.length > 0
    ? strengths.map(sub => `<div class="strength-item"><span>${sub.name}</span><span class="good">${sub.average}%</span></div>`).join("")
    : `<p class="empty-note">Nenhuma disciplina acima de 70%</p>`;

  const weaknessesHTML = weaknesses.length > 0
    ? weaknesses.map(sub => `<div class="weakness-item"><span>${sub.name}</span><span class="bad">${sub.average}%</span></div>`).join("")
    : `<p class="empty-note">Nenhuma disciplina abaixo de 70% 🎉</p>`;

  let comment = "";
  if (s.status === "satisfatorio") {
    comment = `${s.name} apresenta desempenho satisfatório com média geral de ${s.average}%. `;
    if (s.evolution > 0) comment += `Demonstra evolução positiva de +${s.evolution} pontos ao longo dos bimestres. `;
    comment += `Frequência de ${s.frequency}%. ${s.recommendation}`;
  } else if (s.status === "evolucao") {
    comment = `${s.name} está em evolução positiva com melhora de +${s.evolution} pontos. Média atual de ${s.average}%. `;
    comment += `Frequência de ${s.frequency}%. ${s.recommendation}`;
  } else if (s.status === "atencao") {
    comment = `${s.name} requer atenção com média de ${s.average}%. `;
    if (weaknesses.length > 0) comment += `Disciplinas que necessitam reforço: ${weaknesses.map(w => w.name).join(", ")}. `;
    comment += `Frequência de ${s.frequency}%. ${s.recommendation}`;
  } else {
    comment = `${s.name} está em situação de risco acadêmico com média de ${s.average}%. `;
    if (weaknesses.length > 0) comment += `Necessita intervenção urgente em: ${weaknesses.map(w => w.name).join(", ")}. `;
    comment += `Frequência de ${s.frequency}%. ${s.recommendation}`;
  }

  const radarSVG = buildRadarSVG(s.subjectScores);
  const evolutionSVG = buildEvolutionSVG(s.bimesterScores);

  const chartsSection = (radarSVG || evolutionSVG) ? `
    <div class="charts-row">
      ${radarSVG ? `<div class="chart-block">
        <h3>🎯 Perfil por Disciplina</h3>
        <div class="chart-center">${radarSVG}</div>
      </div>` : ""}
      ${evolutionSVG ? `<div class="chart-block">
        <h3>📈 Evolução por Bimestre</h3>
        <div class="chart-center">${evolutionSVG}</div>
      </div>` : ""}
    </div>` : "";

  return `
    <div class="student-card${index > 0 ? " page-break" : ""}">
      <div class="card-header">
        <div class="student-info">
          <div class="avatar">${s.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}</div>
          <div>
            <h2 class="student-name">${s.name}</h2>
            <span class="student-class">${s.classGroup || "—"}</span>
          </div>
        </div>
        <div class="avg-badge">
          <span class="avg-value" style="color:${avgColor}">${s.average}%</span>
          <span class="status-badge" style="background:${sc.bg};color:${sc.text};border:1px solid ${sc.border}">${statusLabels[s.status] || s.status}</span>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi"><div class="kpi-label">📊 Média Geral</div><div class="kpi-val" style="color:${avgColor}">${s.average}%</div></div>
        <div class="kpi"><div class="kpi-label">📈 Evolução</div><div class="kpi-val" style="color:${s.evolution >= 0 ? "#059669" : "#dc2626"}">${s.evolution >= 0 ? "+" : ""}${s.evolution} pts</div></div>
        <div class="kpi"><div class="kpi-label">📅 Frequência</div><div class="kpi-val" style="color:${s.frequency >= 75 ? "#059669" : "#dc2626"}">${s.frequency}%</div></div>
        <div class="kpi"><div class="kpi-label">📝 Avaliações</div><div class="kpi-val">${s.totalGrades}</div></div>
      </div>

      <div class="comment-box">
        <h3>📋 Resumo do Desempenho</h3>
        <p>${comment}</p>
      </div>

      <div class="two-cols">
        <div class="col">
          <h3>✅ Pontos Fortes</h3>
          ${strengthsHTML}
        </div>
        <div class="col">
          <h3>⚠️ Áreas de Melhoria</h3>
          ${weaknessesHTML}
        </div>
      </div>

      ${chartsSection}

      ${s.bimesterScores.length > 0 ? `
      <div class="section">
        <h3>📊 Notas por Bimestre</h3>
        <table class="bim-table">
          <thead><tr>${bimesterHeaders}<th>Média</th></tr></thead>
          <tbody><tr>${bimesterCells}<td style="font-weight:700;text-align:center;color:${avgColor}">${s.average}%</td></tr></tbody>
        </table>
      </div>` : ""}

      ${subjectRows ? `
      <div class="section">
        <h3>📚 Notas por Disciplina</h3>
        <table class="subject-table">
          <thead><tr><th>Disciplina</th><th style="text-align:center">Média</th></tr></thead>
          <tbody>${subjectRows}</tbody>
        </table>
      </div>` : ""}

      <div class="action-box">
        <h3>💡 Plano de Ação</h3>
        <p>${s.recommendation}</p>
      </div>
    </div>
  `;
}

export function exportStudentReports(students: StudentMetrics[]) {
  if (students.length === 0) {
    toast.error("Nenhum aluno para gerar relatório.");
    return;
  }

  const cards = students
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s, i) => buildStudentCard(s, i))
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Boletim Individual de Desempenho</title>
  <style>
    @page { size: A4; margin: 12mm 18mm; }
    @media print { body { margin: 0; } .student-card.page-break { break-before: page; page-break-before: always; } }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 6mm 0; }

    .student-card { padding: 4mm 0; }
    .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2c3e50; padding-bottom: 3mm; margin-bottom: 4mm; }
    .student-info { display: flex; align-items: center; gap: 3mm; }
    .avatar { width: 12mm; height: 12mm; border-radius: 50%; background: #e0e7ff; color: #3730a3; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11pt; }
    .student-name { font-size: 14pt; font-weight: 700; color: #1e293b; margin: 0; }
    .student-class { font-size: 9pt; color: #6b7280; }
    .avg-badge { text-align: right; }
    .avg-value { font-size: 22pt; font-weight: 800; display: block; }
    .status-badge { font-size: 8pt; padding: 1mm 3mm; border-radius: 2mm; font-weight: 600; display: inline-block; margin-top: 1mm; }

    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin-bottom: 4mm; }
    .kpi { border: 1px solid #e5e7eb; border-radius: 2mm; padding: 2.5mm 3mm; text-align: center; }
    .kpi-label { font-size: 7.5pt; color: #6b7280; font-weight: 600; }
    .kpi-val { font-size: 14pt; font-weight: 700; margin-top: 0.5mm; }

    .comment-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 2mm; padding: 3mm 4mm; margin-bottom: 4mm; }
    .comment-box h3 { font-size: 10pt; font-weight: 700; color: #334155; margin: 0 0 1.5mm 0; }
    .comment-box p { font-size: 9.5pt; line-height: 1.6; color: #475569; margin: 0; }

    .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-bottom: 4mm; }
    .col { border: 1px solid #e5e7eb; border-radius: 2mm; padding: 3mm 4mm; }
    .col h3 { font-size: 10pt; font-weight: 700; color: #334155; margin: 0 0 2mm 0; }
    .strength-item, .weakness-item { display: flex; justify-content: space-between; padding: 1mm 0; font-size: 9.5pt; border-bottom: 1px solid #f1f5f9; }
    .strength-item:last-child, .weakness-item:last-child { border-bottom: none; }
    .good { color: #059669; font-weight: 700; }
    .bad { color: #dc2626; font-weight: 700; }
    .empty-note { font-size: 9pt; color: #9ca3af; font-style: italic; margin: 0; }

    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-bottom: 4mm; }
    .chart-block { border: 1px solid #e5e7eb; border-radius: 2mm; padding: 3mm 4mm; }
    .chart-block h3 { font-size: 10pt; font-weight: 700; color: #334155; margin: 0 0 2mm 0; }
    .chart-center { display: flex; justify-content: center; align-items: center; }

    .section { margin-bottom: 4mm; break-inside: avoid; page-break-inside: avoid; }
    .section h3 { font-size: 10pt; font-weight: 700; color: #334155; margin: 0 0 2mm 0; }

    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th { background: #2c3e50; color: #fff; padding: 2mm 3mm; text-align: left; font-weight: 600; font-size: 8.5pt; }
    td { border-bottom: 1px solid #e5e7eb; padding: 1.5mm 3mm; }
    tr:nth-child(even) td { background: #f9fafb; }
    .bim-table { margin-bottom: 2mm; }

    .action-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 2mm; padding: 3mm 4mm; }
    .action-box h3 { font-size: 10pt; font-weight: 700; color: #92400e; margin: 0 0 1.5mm 0; }
    .action-box p { font-size: 9.5pt; color: #78350f; margin: 0; line-height: 1.6; }

    .doc-footer { text-align: center; font-size: 7.5pt; color: #9ca3af; margin-top: 6mm; border-top: 1px solid #e5e7eb; padding-top: 2mm; }
  </style>
</head>
<body>
  ${cards}
  <div class="doc-footer">Boletim gerado por SmartTest • ${new Date().toLocaleDateString("pt-BR")}</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { toast.error("Permita pop-ups para exportar."); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); };
  toast.info("Use 'Salvar como PDF' na janela de impressão para exportar.");
}
