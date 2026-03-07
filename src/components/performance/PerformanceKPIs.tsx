import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, GraduationCap, AlertTriangle } from "lucide-react";

interface Props {
  globalAverage: number;
  classCount: number;
  totalStudents: number;
  riskStudents: number;
}

function KPICard({ label, value, subtitle, icon: Icon, iconClass, valueClass }: {
  label: string; value: number | string; subtitle?: string;
  icon: React.ElementType; iconClass: string; valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${valueClass || "text-foreground"}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceKPIs({ globalAverage, classCount, totalStudents, riskStudents }: Props) {
  const avgColor = globalAverage >= 70 ? "text-success" : globalAverage >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <KPICard label="Média Geral" value={`${globalAverage}%`} icon={Target} iconClass="bg-primary/10 text-primary" valueClass={avgColor} />
      <KPICard label="Turmas" value={classCount} icon={Users} iconClass="bg-info/10 text-info" />
      <KPICard label="Alunos" value={totalStudents} icon={GraduationCap} iconClass="bg-success/10 text-success" />
      <KPICard label="Em Risco" value={riskStudents} subtitle="média < 50%" icon={AlertTriangle} iconClass="bg-destructive/10 text-destructive" valueClass="text-destructive" />
    </div>
  );
}

export default memo(PerformanceKPIs);
