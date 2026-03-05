import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, Users, BookOpen, ClipboardList, Activity,
  PieChart as PieChartIcon, Loader2,
} from "lucide-react";
import { useCompanyDemands } from "@/hooks/useCompanyDemands";
import { computeStats } from "@/components/reports/reportUtils";
import OverviewReport from "@/components/reports/OverviewReport";
import DemandsReport from "@/components/reports/DemandsReport";
import TeachersReport from "@/components/reports/TeachersReport";
import SubjectsReport from "@/components/reports/SubjectsReport";
import TimelineReport from "@/components/reports/TimelineReport";

export default function ReportsPage() {
  const { companyDemands, loading } = useCompanyDemands();
  const stats = useMemo(() => computeStats(companyDemands), [companyDemands]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Relatórios & Análises
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Painel completo de métricas, gráficos interativos e análise de desempenho
        </p>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral" className="gap-1.5"><PieChartIcon className="h-3.5 w-3.5" />Visão Geral</TabsTrigger>
          <TabsTrigger value="avaliacoes" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Avaliações</TabsTrigger>
          <TabsTrigger value="professores" className="gap-1.5"><Users className="h-3.5 w-3.5" />Professores</TabsTrigger>
          <TabsTrigger value="disciplinas" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Disciplinas</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral"><OverviewReport stats={stats} demands={companyDemands} /></TabsContent>
        <TabsContent value="avaliacoes"><DemandsReport demands={companyDemands} /></TabsContent>
        <TabsContent value="professores"><TeachersReport demands={companyDemands} /></TabsContent>
        <TabsContent value="disciplinas"><SubjectsReport stats={stats} demands={companyDemands} /></TabsContent>
        <TabsContent value="timeline"><TimelineReport demands={companyDemands} /></TabsContent>
      </Tabs>
    </div>
  );
}
