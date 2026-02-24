import { mockDemands, examTypeLabels } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ExamsPage() {
  const navigate = useNavigate();

  // Show demands that have exams (submitted+)
  const examDemands = mockDemands.filter((d) =>
    ["submitted", "review", "revision_requested", "approved", "final", "in_progress"].includes(d.status)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Provas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie e edite provas</p>
        </div>
      </div>

      <div className="space-y-3">
        {examDemands.map((d) => (
          <div key={d.id} className="glass-card rounded-lg p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {d.subjectName} — {examTypeLabels[d.examType]}
                  </h3>
                  <StatusBadge status={d.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {d.teacherName} • {d.classGroups.join(", ")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate(`/provas/editor/${d.id}`)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
