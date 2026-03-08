import type { ReactNode } from "react";

interface DiagnosticExportData {
  studentName: string;
  classGroup: string;
  rollNumber: string;
  summary: string;
  riskLevel: string;
  strengths: { subject: string; detail: string }[];
  weaknesses: { subject: string; detail: string; severity: string }[];
  projections: { subject: string; currentAvg: number; projectedFinal: number; trend: string }[];
  actionPlan: { action: string; priority: string; target: string }[];
  attendanceAlert: string;
  recommendations: string;
  attendanceSummary: { total: number; present: number; absent: number; justified: number; late: number; rate: number };
  personalizedSuggestions?: {
    weeklyRoutine: { day: string; subject: string; activity: string; duration: string }[];
    studyTips: { tip: string; category: string }[];
    practicalActivities: { subject: string; activity: string; objective: string; frequency: string }[];
    motivationalNote: string;
  };
}

const RISK_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  baixo: { label: "Risco Baixo", color: "#166534", bg: "#dcfce7" },
  moderado: { label: "Risco Moderado", color: "#854d0e", bg: "#fef9c3" },
  alto: { label: "Risco Alto", color: "#9a3412", bg: "#ffedd5" },
  critico: { label: "Risco Crítico", color: "#991b1b", bg: "#fee2e2" },
};

const TREND_ARROWS: Record<string, string> = {
  melhora: "↑",
  estavel: "→",
  piora: "↓",
};

const TIP_CATEGORIES: Record<string, string> = {
  organizacao: "Organização",
  tecnica: "Técnica",
  motivacao: "Motivação",
  recuperacao: "Recuperação",
};

const DAY_COLORS: Record<string, string> = {
  "Segunda": "#3b82f6",
  "Terça": "#10b981",
  "Quarta": "#8b5cf6",
  "Quinta": "#f59e0b",
  "Sexta": "#f43f5e",
  "Sábado": "#06b6d4",
  "Domingo": "#64748b",
};

export function exportDiagnosticPDF(data: DiagnosticExportData) {
  const risk = RISK_LABELS[data.riskLevel] || RISK_LABELS.moderado;
  const suggestions = data.personalizedSuggestions;
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Diagnóstico Pedagógico - ${data.studentName}</title>
<style>
  @page { size: A4; margin: 20mm 25mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; line-height: 1.5; font-size: 11px; }
  .page-break { break-before: page; }
  
  .header { text-align: center; border-bottom: 3px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 18px; color: #4338ca; margin-bottom: 2px; }
  .header .subtitle { font-size: 12px; color: #666; }
  .header .date { font-size: 10px; color: #999; margin-top: 4px; }
  
  .student-info { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
  .student-name { font-size: 16px; font-weight: 700; color: #1e293b; }
  .student-details { font-size: 11px; color: #64748b; }
  .risk-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  
  .section { margin-bottom: 16px; break-inside: avoid; }
  .section-title { font-size: 13px; font-weight: 700; color: #4338ca; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .section-title .icon { font-size: 14px; }
  
  .summary-box { background: #f8fafc; border-left: 4px solid #6366f1; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 12px; }
  .summary-box p { font-size: 11px; color: #374151; }
  
  .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin-top: 8px; }
  .alert-box p { color: #991b1b; font-size: 11px; }
  
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  
  .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
  .card-green { background: #f0fdf4; border-color: #bbf7d0; }
  .card-red { background: #fef2f2; border-color: #fecaca; }
  .card-item { padding: 6px 8px; border-radius: 4px; margin-bottom: 4px; }
  .card-item:last-child { margin-bottom: 0; }
  .card-item-green { background: #dcfce7; }
  .card-item-red { background: #fee2e2; }
  .card-item h4 { font-size: 11px; font-weight: 600; }
  .card-item p { font-size: 10px; color: #6b7280; margin-top: 1px; }
  .card-title { font-size: 12px; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
  .green { color: #166534; }
  .red { color: #991b1b; }
  
  .severity-badge { display: inline-block; font-size: 9px; padding: 1px 6px; border-radius: 10px; font-weight: 600; float: right; }
  .severity-grave { background: #fee2e2; color: #991b1b; }
  .severity-moderada { background: #fef3c7; color: #92400e; }
  .severity-leve { background: #e0e7ff; color: #3730a3; }
  
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 6px 10px; font-weight: 600; color: #475569; border-bottom: 2px solid #cbd5e1; }
  td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
  .trend-up { color: #166534; font-weight: 700; }
  .trend-down { color: #991b1b; font-weight: 700; }
  .trend-stable { color: #6b7280; }
  .score-danger { color: #dc2626; font-weight: 700; }
  .score-ok { color: #16a34a; font-weight: 700; }
  
  .action-item { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; align-items: flex-start; }
  .action-item:last-child { border-bottom: none; }
  .priority-badge { display: inline-block; font-size: 9px; padding: 2px 8px; border-radius: 10px; font-weight: 600; white-space: nowrap; margin-top: 1px; }
  .priority-alta { background: #fee2e2; color: #991b1b; }
  .priority-media { background: #fef3c7; color: #92400e; }
  .priority-baixa { background: #e0e7ff; color: #3730a3; }
  .action-text { font-size: 11px; }
  .action-target { font-size: 10px; color: #6b7280; margin-top: 1px; }
  
  .motivational { background: linear-gradient(135deg, #ede9fe, #e0e7ff); border: 1px solid #c7d2fe; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; text-align: center; }
  .motivational .star { font-size: 16px; color: #7c3aed; margin-bottom: 4px; }
  .motivational .label { font-size: 11px; font-weight: 600; color: #4c1d95; margin-bottom: 4px; }
  .motivational .quote { font-size: 12px; color: #5b21b6; font-style: italic; }
  
  .routine-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
  .routine-item:last-child { border-bottom: none; }
  .day-dot { width: 8px; height: 28px; border-radius: 4px; flex-shrink: 0; }
  .routine-day { font-size: 11px; font-weight: 600; width: 60px; }
  .routine-subject { display: inline-block; font-size: 9px; padding: 1px 6px; background: #f1f5f9; border-radius: 8px; color: #475569; font-weight: 500; }
  .routine-activity { font-size: 10px; color: #6b7280; flex: 1; margin-left: 4px; }
  .routine-duration { font-size: 10px; color: #64748b; font-weight: 500; white-space: nowrap; }
  
  .tips-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .tip-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }
  .tip-category { display: inline-block; font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; margin-bottom: 4px; }
  .tip-text { font-size: 10px; color: #4b5563; }
  
  .activity-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; }
  .activity-card:last-child { margin-bottom: 0; }
  .activity-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
  .activity-subject { font-size: 11px; font-weight: 600; color: #1e293b; }
  .activity-freq { font-size: 9px; padding: 1px 6px; background: #f1f5f9; border-radius: 8px; color: #475569; }
  .activity-desc { font-size: 10px; color: #374151; }
  .activity-obj { font-size: 10px; color: #6b7280; margin-top: 2px; }
  
  .recommendations-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px 14px; white-space: pre-line; font-size: 11px; color: #0c4a6e; }
  
  .attendance-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
  .att-card { text-align: center; padding: 8px; border-radius: 6px; }
  .att-card .number { font-size: 18px; font-weight: 700; }
  .att-card .label { font-size: 9px; color: #6b7280; }
  .att-green { background: #f0fdf4; }
  .att-green .number { color: #166534; }
  .att-red { background: #fef2f2; }
  .att-red .number { color: #991b1b; }
  .att-yellow { background: #fffbeb; }
  .att-yellow .number { color: #92400e; }
  .att-orange { background: #fff7ed; }
  .att-orange .number { color: #9a3412; }
  
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #9ca3af; }
  
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section { break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>📋 Diagnóstico Pedagógico com IA</h1>
  <div class="subtitle">Relatório Individual de Desempenho e Sugestões Personalizadas</div>
  <div class="date">Gerado em ${today}</div>
</div>

<div class="student-info">
  <div>
    <div class="student-name">${data.studentName}</div>
    <div class="student-details">Turma: ${data.classGroup} • Matrícula: ${data.rollNumber || "—"}</div>
  </div>
  <span class="risk-badge" style="background:${risk.bg};color:${risk.color};">${risk.label}</span>
</div>

<div class="section">
  <div class="summary-box">
    <p>${data.summary}</p>
  </div>
  ${data.attendanceAlert ? `<div class="alert-box"><p>⚠️ ${data.attendanceAlert}</p></div>` : ""}
</div>

<div class="section">
  <div class="section-title"><span class="icon">📊</span> Frequência Escolar</div>
  <div class="attendance-grid">
    <div class="att-card att-green"><div class="number">${data.attendanceSummary.present}</div><div class="label">Presenças</div></div>
    <div class="att-card att-red"><div class="number">${data.attendanceSummary.absent}</div><div class="label">Faltas</div></div>
    <div class="att-card att-yellow"><div class="number">${data.attendanceSummary.justified}</div><div class="label">Justificadas</div></div>
    <div class="att-card att-orange"><div class="number">${data.attendanceSummary.late}</div><div class="label">Atrasos</div></div>
  </div>
</div>

<div class="section">
  <div class="grid-2">
    <div class="card card-green">
      <div class="card-title green">✅ Pontos Fortes</div>
      ${data.strengths.length > 0 ? data.strengths.map(s => `
        <div class="card-item card-item-green">
          <h4 style="color:#166534">${s.subject}</h4>
          <p>${s.detail}</p>
        </div>
      `).join("") : '<p style="font-size:10px;color:#6b7280;">Nenhum identificado</p>'}
    </div>
    <div class="card card-red">
      <div class="card-title red">❌ Pontos Fracos</div>
      ${data.weaknesses.length > 0 ? data.weaknesses.map(w => `
        <div class="card-item card-item-red">
          <h4 style="color:#991b1b">${w.subject} <span class="severity-badge severity-${w.severity}">${w.severity}</span></h4>
          <p>${w.detail}</p>
        </div>
      `).join("") : '<p style="font-size:10px;color:#6b7280;">Nenhum identificado</p>'}
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title"><span class="icon">🎯</span> Projeções de Notas Finais</div>
  <table>
    <thead><tr><th>Disciplina</th><th>Média Atual</th><th>Projeção Final</th><th>Tendência</th></tr></thead>
    <tbody>
      ${data.projections.map(p => `
        <tr>
          <td>${p.subject}</td>
          <td>${p.currentAvg.toFixed(1)}</td>
          <td class="${p.projectedFinal < 6 ? 'score-danger' : 'score-ok'}">${p.projectedFinal.toFixed(1)}</td>
          <td class="${p.trend === 'melhora' ? 'trend-up' : p.trend === 'piora' ? 'trend-down' : 'trend-stable'}">${TREND_ARROWS[p.trend] || "→"} ${p.trend}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</div>

<div class="section">
  <div class="section-title"><span class="icon">⚡</span> Plano de Ação</div>
  ${data.actionPlan.map(a => `
    <div class="action-item">
      <span class="priority-badge priority-${a.priority}">${a.priority}</span>
      <div>
        <div class="action-text">${a.action}</div>
        <div class="action-target">👤 ${a.target}</div>
      </div>
    </div>
  `).join("")}
</div>

${suggestions ? `
<div class="page-break"></div>

<div class="header">
  <h1>💡 Sugestões Personalizadas</h1>
  <div class="subtitle">Rotina de Estudos e Atividades para ${data.studentName}</div>
</div>

${suggestions.motivationalNote ? `
<div class="motivational">
  <div class="star">⭐</div>
  <div class="label">Mensagem para ${data.studentName}</div>
  <div class="quote">"${suggestions.motivationalNote}"</div>
</div>
` : ""}

${suggestions.weeklyRoutine && suggestions.weeklyRoutine.length > 0 ? `
<div class="section">
  <div class="section-title"><span class="icon">📅</span> Rotina Semanal de Estudos</div>
  ${suggestions.weeklyRoutine.map(r => `
    <div class="routine-item">
      <div class="day-dot" style="background:${DAY_COLORS[r.day] || '#6366f1'}"></div>
      <div class="routine-day">${r.day}</div>
      <span class="routine-subject">${r.subject}</span>
      <div class="routine-activity">${r.activity}</div>
      <div class="routine-duration">🕐 ${r.duration}</div>
    </div>
  `).join("")}
</div>
` : ""}

${suggestions.studyTips && suggestions.studyTips.length > 0 ? `
<div class="section">
  <div class="section-title"><span class="icon">💡</span> Dicas de Estudo</div>
  <div class="tips-grid">
    ${suggestions.studyTips.map(t => `
      <div class="tip-card">
        <span class="tip-category" style="background:#e0e7ff;color:#3730a3;">${TIP_CATEGORIES[t.category] || t.category}</span>
        <div class="tip-text">${t.tip}</div>
      </div>
    `).join("")}
  </div>
</div>
` : ""}

${suggestions.practicalActivities && suggestions.practicalActivities.length > 0 ? `
<div class="section">
  <div class="section-title"><span class="icon">📚</span> Atividades Práticas por Disciplina</div>
  ${suggestions.practicalActivities.map(a => `
    <div class="activity-card">
      <div class="activity-header">
        <span class="activity-subject">${a.subject}</span>
        <span class="activity-freq">${a.frequency}</span>
      </div>
      <div class="activity-desc">${a.activity}</div>
      <div class="activity-obj">🎯 ${a.objective}</div>
    </div>
  `).join("")}
</div>
` : ""}
` : ""}

${data.recommendations ? `
<div class="section">
  <div class="section-title"><span class="icon">👨‍👩‍👧</span> Recomendações para Pais e Professores</div>
  <div class="recommendations-box">${data.recommendations}</div>
</div>
` : ""}

<div class="footer">
  Documento gerado automaticamente pelo sistema de diagnóstico pedagógico com inteligência artificial.<br/>
  Este relatório é uma ferramenta de apoio e não substitui a avaliação profissional do corpo docente.
</div>

</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 400);
}