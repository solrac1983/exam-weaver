import { useParams, useNavigate } from "react-router-dom";
import { statusLabels, examTypeLabels } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  BookOpen,
  GraduationCap,
  FileText,
  CheckCircle2,
  MessageSquare,
  Download,
  Loader2,
} from "lucide-react";
import { useCompanyDemands } from "@/hooks/useCompanyDemands";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function DemandDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { companyDemands, refetch } = useCompanyDemands();
  const { role } = useAuth();
  const [updating, setUpdating] = useState(false);
  const demand = companyDemands.find((d) => d.id === id);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("demands")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id!);
    setUpdating(false);
    if (error) {
      toast.error("Erro ao atualizar status.");
      return;
    }
    toast.success(`Status atualizado para "${statusLabels[newStatus] ?? newStatus}"`);
    refetch();
  };

  if (!demand) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Demanda não encontrada.</p>
        <Button variant="ghost" onClick={() => navigate("/demandas")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const isOverdue = new Date(demand.deadline) < new Date() && !["approved", "final"].includes(demand.status);
  const isCoordOrAdmin = role === "coordinator" || role === "admin" || role === "super_admin";
  const isProfessor = role === "professor";

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate("/demandas")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para demandas
      </button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground font-display">
              {demand.subjectName} — {examTypeLabels[demand.examType]}
            </h1>
            <StatusBadge status={demand.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Criada em {new Date(demand.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Professor actions */}
          {isProfessor && demand.status === "pending" && (
            <Button onClick={() => updateStatus("in_progress")} disabled={updating} className="gap-2">
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              Iniciar Elaboração
            </Button>
          )}
          {isProfessor && demand.status === "in_progress" && (
            <Button onClick={() => updateStatus("submitted")} disabled={updating} className="gap-2">
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar para Revisão
            </Button>
          )}
          {isProfessor && demand.status === "revision_requested" && (
            <Button onClick={() => updateStatus("submitted")} disabled={updating} className="gap-2">
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              Reenviar Prova
            </Button>
          )}

          {/* Coordinator actions */}
          {isCoordOrAdmin && demand.status === "submitted" && (
            <>
              <Button variant="outline" onClick={() => updateStatus("revision_requested")} disabled={updating} className="gap-2">
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                <MessageSquare className="h-4 w-4" />
                Solicitar Ajustes
              </Button>
              <Button onClick={() => updateStatus("approved")} disabled={updating} className="gap-2">
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCircle2 className="h-4 w-4" />
                Aprovar
              </Button>
            </>
          )}
          {isCoordOrAdmin && demand.status === "approved" && (
            <Button onClick={() => updateStatus("final")} disabled={updating} className="gap-2">
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              <Download className="h-4 w-4" />
              Finalizar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Detalhes da Demanda</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={User} label="Professor" value={demand.teacherName} />
              <InfoRow icon={BookOpen} label="Disciplina" value={demand.subjectName} />
              <InfoRow icon={GraduationCap} label="Turma(s)" value={demand.classGroups.join(", ")} />
              <InfoRow icon={FileText} label="Tipo" value={examTypeLabels[demand.examType]} />
              <InfoRow
                icon={Clock}
                label="Prazo"
                value={new Date(demand.deadline).toLocaleDateString("pt-BR")}
                warning={isOverdue}
              />
              {demand.applicationDate && (
                <InfoRow
                  icon={Calendar}
                  label="Data de aplicação"
                  value={new Date(demand.applicationDate).toLocaleDateString("pt-BR")}
                />
              )}
            </div>
          </div>

          {demand.notes && (
            <div className="glass-card rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">Observações</h2>
              <p className="text-sm text-muted-foreground">{demand.notes}</p>
            </div>
          )}
        </div>

        <div className="glass-card rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Histórico</h2>
          <div className="space-y-4">
            <TimelineItem date={demand.createdAt} label="Demanda criada" />
            {demand.status !== "pending" && (
              <TimelineItem date={demand.updatedAt} label="Professor iniciou" />
            )}
            {["submitted", "review", "revision_requested", "approved", "final"].includes(demand.status) && (
              <TimelineItem date={demand.updatedAt} label="Prova enviada para revisão" />
            )}
            {["approved", "final"].includes(demand.status) && (
              <TimelineItem date={demand.updatedAt} label="Prova aprovada" active />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, warning }: { icon: React.ElementType; label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className={`h-4 w-4 mt-0.5 ${warning ? "text-destructive" : "text-muted-foreground"}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${warning ? "text-destructive" : "text-foreground"}`}>{value}</p>
      </div>
    </div>
  );
}

function TimelineItem({ date, label, description, active }: { date: string; label: string; description?: string; active?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`h-2 w-2 rounded-full mt-1.5 ${active ? "bg-success" : "bg-muted-foreground/40"}`} />
        <div className="w-px flex-1 bg-border" />
      </div>
      <div className="pb-4">
        <p className="text-xs text-muted-foreground">{new Date(date).toLocaleDateString("pt-BR")}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
