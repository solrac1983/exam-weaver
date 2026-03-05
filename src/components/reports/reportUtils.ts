import { Demand } from "@/types";
import { statusLabels, examTypeLabels } from "@/data/mockData";

export { statusLabels, examTypeLabels };

export const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "hsl(270, 55%, 55%)",
  "hsl(30, 80%, 55%)",
];

export const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--warning))",
  in_progress: "hsl(var(--info))",
  submitted: "hsl(270, 55%, 55%)",
  review: "hsl(30, 80%, 55%)",
  revision_requested: "hsl(var(--destructive))",
  approved: "hsl(var(--success))",
  final: "hsl(var(--primary))",
};

export interface DemandStats {
  total: number;
  overdue: number;
  approved: number;
  pending: number;
  inReview: number;
  completionRate: number;
  byStatus: { name: string; value: number; key: string }[];
  bySubject: { name: string; value: number }[];
  byType: { name: string; value: number }[];
  byTeacher: { name: string; value: number }[];
  byMonth: { name: string; value: number }[];
  byClassGroup: { name: string; value: number }[];
}

export function computeStats(demands: Demand[]): DemandStats {
  const total = demands.length;
  const byStatus: Record<string, number> = {};
  const bySubject: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byTeacher: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  const byClassGroup: Record<string, number> = {};

  demands.forEach((d) => {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    bySubject[d.subjectName] = (bySubject[d.subjectName] || 0) + 1;
    byType[d.examType] = (byType[d.examType] || 0) + 1;
    byTeacher[d.teacherName] = (byTeacher[d.teacherName] || 0) + 1;
    const month = d.createdAt.substring(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
    d.classGroups.forEach((cg) => {
      byClassGroup[cg] = (byClassGroup[cg] || 0) + 1;
    });
  });

  const overdue = demands.filter(
    (d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status)
  ).length;
  const approved = demands.filter((d) => ["approved", "final"].includes(d.status)).length;
  const pending = demands.filter((d) => ["pending", "in_progress"].includes(d.status)).length;
  const inReview = demands.filter((d) => ["submitted", "review", "revision_requested"].includes(d.status)).length;
  const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return {
    total, overdue, approved, pending, inReview, completionRate,
    byStatus: Object.entries(byStatus).map(([k, v]) => ({ name: statusLabels[k] || k, value: v, key: k })),
    bySubject: Object.entries(bySubject).map(([k, v]) => ({ name: k, value: v })),
    byType: Object.entries(byType).map(([k, v]) => ({ name: examTypeLabels[k] || k, value: v })),
    byTeacher: Object.entries(byTeacher).map(([k, v]) => ({ name: k, value: v })),
    byMonth: Object.entries(byMonth).sort().map(([k, v]) => ({ name: k, value: v })),
    byClassGroup: Object.entries(byClassGroup).sort().map(([k, v]) => ({ name: k, value: v })),
  };
}

export interface TeacherRanking {
  name: string;
  totalDemands: number;
  delivered: number;
  pending: number;
  approved: number;
  overdue: number;
  avgDeliveryDays: number;
  score: number;
}

export function computeTeacherRanking(demands: Demand[]): TeacherRanking[] {
  const teacherMap = new Map<string, Demand[]>();
  demands.forEach((d) => {
    const list = teacherMap.get(d.teacherName) || [];
    list.push(d);
    teacherMap.set(d.teacherName, list);
  });

  const rankings: TeacherRanking[] = [];

  teacherMap.forEach((tDemands, name) => {
    const delivered = tDemands.filter((d) => ["submitted", "review", "revision_requested", "approved", "final"].includes(d.status));
    const approvedList = tDemands.filter((d) => ["approved", "final"].includes(d.status));
    const pendingList = tDemands.filter((d) => ["pending", "in_progress"].includes(d.status));
    const overdueList = tDemands.filter((d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status));

    const deliveryDays = delivered.map((d) => {
      const created = new Date(d.createdAt).getTime();
      const updated = new Date(d.updatedAt).getTime();
      return Math.max(1, Math.round((updated - created) / (1000 * 60 * 60 * 24)));
    });

    const avgDays = deliveryDays.length > 0 ? Math.round(deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length) : 0;
    const speedScore = avgDays > 0 ? Math.max(0, 100 - avgDays * 5) : 0;
    const volumeScore = (delivered.length / Math.max(tDemands.length, 1)) * 100;
    const penaltyScore = overdueList.length * 15;
    const score = Math.round(Math.max(0, (speedScore * 0.5 + volumeScore * 0.5) - penaltyScore));

    rankings.push({
      name, totalDemands: tDemands.length, delivered: delivered.length,
      pending: pendingList.length, approved: approvedList.length, overdue: overdueList.length,
      avgDeliveryDays: avgDays, score,
    });
  });

  rankings.sort((a, b) => b.score - a.score);
  return rankings;
}

// Print helpers
export function buildPrintHTML(title: string, contentEl: HTMLElement) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 32px; color: #1a1a2e; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #666; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
  th { background: #f4f4f5; font-weight: 600; }
  .stat-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .stat-box { flex: 1; min-width: 120px; border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
  .stat-box .label { font-size: 11px; color: #666; }
  .stat-box .value { font-size: 22px; font-weight: 700; }
  @media print { body { padding: 16px; } }
</style>
</head><body>
<h1>${title}</h1>
<p class="subtitle">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
${contentEl.innerHTML}
</body></html>`;
}
