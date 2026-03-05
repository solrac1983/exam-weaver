import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";
import { Demand } from "@/types";
import { statusLabels, examTypeLabels } from "./reportUtils";
import { ReportActions, EmptyReport } from "./ReportShared";

interface Props {
  demands: Demand[];
}

const statusProgress: Record<string, number> = {
  pending: 10, in_progress: 30, submitted: 50, review: 60,
  revision_requested: 45, approved: 90, final: 100,
};

export default function DemandsReport({ demands }: Props) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const contentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let r = [...demands];
    if (filterStatus !== "all") r = r.filter((d) => d.status === filterStatus);
    if (filterType !== "all") r = r.filter((d) => d.examType === filterType);
    return r;
  }, [demands, filterStatus, filterType]);

  if (demands.length === 0) return <EmptyReport message="Nenhuma avaliação encontrada." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Relatório de Avaliações</h2>
        <ReportActions title="Relatório de Avaliações" contentRef={contentRef} />
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(examTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterStatus !== "all" || filterType !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterType("all"); }} className="text-xs gap-1"><X className="h-3 w-3" />Limpar</Button>
          )}
          <p className="text-sm text-muted-foreground ml-auto">{filtered.length} resultado(s)</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Professor</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Disciplina</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Turmas</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Prazo</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground w-32">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const progress = statusProgress[d.status] || 0;
                const isOverdue = new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status);
                return (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{d.teacherName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.subjectName}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{examTypeLabels[d.examType] || d.examType}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{d.classGroups.join(", ")}</td>
                    <td className={`px-4 py-3 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {new Date(d.deadline).toLocaleDateString("pt-BR")}
                      {isOverdue && <span className="ml-1 text-[10px]">⚠</span>}
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">{statusLabels[d.status] || d.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Nenhuma avaliação encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div ref={contentRef} className="hidden">
        <p style={{ marginBottom: 12 }}><strong>{filtered.length}</strong> avaliação(ões) encontrada(s)</p>
        <table>
          <thead><tr><th>Professor</th><th>Disciplina</th><th>Tipo</th><th>Turmas</th><th>Prazo</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>{d.teacherName}</td><td>{d.subjectName}</td><td>{examTypeLabels[d.examType] || d.examType}</td>
                <td>{d.classGroups.join(", ")}</td><td>{new Date(d.deadline).toLocaleDateString("pt-BR")}</td><td>{statusLabels[d.status] || d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
