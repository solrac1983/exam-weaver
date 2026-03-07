// Single-pass aggregation engine for performance dashboard metrics

export interface GradeRow {
  score: number;
  max_score: number;
  class_group: string;
  bimester: string;
  subject_id: string | null;
  student_id: string;
  subjects?: { name: string } | null;
}

export interface ClassMetrics {
  name: string;
  average: number;
  totalGrades: number;
  studentsCount: number;
  below60Pct: number;
  above80Pct: number;
}

export interface SubjectMetrics {
  id: string;
  name: string;
  average: number;
  totalGrades: number;
  classBreakdown: { className: string; average: number }[];
}

export interface AggregatedData {
  globalAverage: number;
  totalStudents: number;
  riskStudents: number;
  classMetrics: ClassMetrics[];
  subjectMetrics: SubjectMetrics[];
  subjectOptions: [string, string][];
  classGroups: string[];
  bimesters: string[];
}

/** Single-pass aggregation — iterates grades once for all metrics */
export function aggregateGrades(grades: GradeRow[], bimesterFilter: string, subjectFilter: string, classFilter: string): AggregatedData {
  // Accumulators
  const classBuckets: Record<string, { sum: number; count: number; students: Set<string>; below60: number; above80: number }> = {};
  const subjectBuckets: Record<string, { name: string; sum: number; count: number; byClass: Record<string, { sum: number; count: number }> }> = {};
  const studentScores: Record<string, { sum: number; count: number }> = {};
  const subjectMap = new Map<string, string>();
  const classGroupSet = new Set<string>();
  const bimesterSet = new Set<string>();

  let totalSum = 0;
  let totalCount = 0;

  for (let i = 0; i < grades.length; i++) {
    const g = grades[i];
    const pct = (g.score / g.max_score) * 100;
    const sid = g.subject_id || "geral";
    const sname = (g.subjects as any)?.name || "Geral";

    // Collect unique values (unfiltered)
    if (!subjectMap.has(sid)) subjectMap.set(sid, sname);
    if (g.class_group) classGroupSet.add(g.class_group);
    if (g.bimester) bimesterSet.add(g.bimester);

    // Apply filters
    if (bimesterFilter !== "all" && g.bimester !== bimesterFilter) continue;
    if (subjectFilter !== "all" && sid !== subjectFilter) continue;
    if (classFilter !== "all" && g.class_group !== classFilter) continue;

    // Global
    totalSum += pct;
    totalCount++;

    // Per student
    if (!studentScores[g.student_id]) studentScores[g.student_id] = { sum: 0, count: 0 };
    studentScores[g.student_id].sum += pct;
    studentScores[g.student_id].count++;

    // Per class
    if (g.class_group) {
      if (!classBuckets[g.class_group]) {
        classBuckets[g.class_group] = { sum: 0, count: 0, students: new Set(), below60: 0, above80: 0 };
      }
      const b = classBuckets[g.class_group];
      b.sum += pct;
      b.count++;
      b.students.add(g.student_id);
      if (pct < 60) b.below60++;
      if (pct > 80) b.above80++;
    }

    // Per subject
    if (!subjectBuckets[sid]) {
      subjectBuckets[sid] = { name: sname, sum: 0, count: 0, byClass: {} };
    }
    const sb = subjectBuckets[sid];
    sb.sum += pct;
    sb.count++;
    if (g.class_group) {
      if (!sb.byClass[g.class_group]) sb.byClass[g.class_group] = { sum: 0, count: 0 };
      sb.byClass[g.class_group].sum += pct;
      sb.byClass[g.class_group].count++;
    }
  }

  const round1 = (v: number) => Math.round(v * 10) / 10;

  const classMetrics: ClassMetrics[] = Object.entries(classBuckets)
    .map(([name, d]) => ({
      name,
      average: round1(d.sum / d.count),
      totalGrades: d.count,
      studentsCount: d.students.size,
      below60Pct: Math.round((d.below60 / d.count) * 100),
      above80Pct: Math.round((d.above80 / d.count) * 100),
    }))
    .sort((a, b) => b.average - a.average);

  const subjectMetrics: SubjectMetrics[] = Object.entries(subjectBuckets)
    .map(([id, d]) => ({
      id,
      name: d.name,
      average: round1(d.sum / d.count),
      totalGrades: d.count,
      classBreakdown: Object.entries(d.byClass)
        .map(([cn, s]) => ({ className: cn, average: round1(s.sum / s.count) }))
        .sort((a, b) => b.average - a.average),
    }))
    .sort((a, b) => a.average - b.average);

  let riskStudents = 0;
  const studentIds = new Set<string>();
  for (const [id, s] of Object.entries(studentScores)) {
    studentIds.add(id);
    if (s.sum / s.count < 50) riskStudents++;
  }

  return {
    globalAverage: totalCount > 0 ? round1(totalSum / totalCount) : 0,
    totalStudents: studentIds.size,
    riskStudents,
    classMetrics,
    subjectMetrics,
    subjectOptions: [...subjectMap.entries()].sort((a, b) => a[1].localeCompare(b[1])),
    classGroups: [...classGroupSet].sort(),
    bimesters: [...bimesterSet].sort(),
  };
}

/** Build temporal evolution data — single pass */
export function buildTemporalData(grades: GradeRow[], bimesters: string[]) {
  if (bimesters.length < 2) return { data: [], lines: [] };

  const classNames = new Set<string>();
  // bucket: bimester -> (class|"Geral") -> { sum, count }
  const buckets: Record<string, Record<string, { sum: number; count: number }>> = {};

  for (const bim of bimesters) {
    buckets[bim] = { Geral: { sum: 0, count: 0 } };
  }

  for (const g of grades) {
    const bim = g.bimester;
    if (!buckets[bim]) continue;
    const pct = (g.score / g.max_score) * 100;

    buckets[bim].Geral.sum += pct;
    buckets[bim].Geral.count++;

    if (g.class_group) {
      classNames.add(g.class_group);
      if (!buckets[bim][g.class_group]) buckets[bim][g.class_group] = { sum: 0, count: 0 };
      buckets[bim][g.class_group].sum += pct;
      buckets[bim][g.class_group].count++;
    }
  }

  const round1 = (v: number) => Math.round(v * 10) / 10;
  const sortedClasses = [...classNames].sort();
  const lines = ["Geral", ...sortedClasses];

  const data = bimesters.map(bim => {
    const row: Record<string, any> = { bimester: `${bim}º Bim` };
    for (const key of lines) {
      const b = buckets[bim]?.[key];
      if (b && b.count > 0) row[key] = round1(b.sum / b.count);
    }
    return row;
  });

  return { data, lines };
}
