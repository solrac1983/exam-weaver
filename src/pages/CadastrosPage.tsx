import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, GraduationCap, Layers, Clock, ClipboardList, Building2, UserCheck, Shield } from "lucide-react";
import ClassGroupsTab from "@/components/cadastros/ClassGroupsTab";
import SubjectsTab from "@/components/cadastros/SubjectsTab";
import TeachersTab from "@/components/cadastros/TeachersTab";
import SimpleListTab from "@/components/cadastros/SimpleListTab";
import StudentsTab from "@/components/cadastros/StudentsTab";
import PermissionsTab from "@/components/cadastros/PermissionsTab";
import { useCadastroCompany } from "@/hooks/useCadastroCompany";

export default function CadastrosPage() {
  const { companies, selectedCompanyId, setSelectedCompanyId, loading, isSuperAdmin } = useCadastroCompany();

  const noCompany = !selectedCompanyId;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Cadastros
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie turmas, disciplinas, séries, segmentos, turnos e professores
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCompanyId || "none"} onValueChange={(v) => setSelectedCompanyId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione uma empresa</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {noCompany ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Selecione uma empresa</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Para gerenciar os cadastros, selecione uma empresa no seletor acima.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="turmas" className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="turmas" className="gap-1.5"><Users className="h-3.5 w-3.5" />Turmas</TabsTrigger>
            <TabsTrigger value="disciplinas" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Disciplinas</TabsTrigger>
            <TabsTrigger value="series" className="gap-1.5"><GraduationCap className="h-3.5 w-3.5" />Séries</TabsTrigger>
            <TabsTrigger value="segmentos" className="gap-1.5"><Layers className="h-3.5 w-3.5" />Segmentos</TabsTrigger>
            <TabsTrigger value="turnos" className="gap-1.5"><Clock className="h-3.5 w-3.5" />Turnos</TabsTrigger>
            <TabsTrigger value="professores" className="gap-1.5"><Users className="h-3.5 w-3.5" />Professores</TabsTrigger>
            <TabsTrigger value="alunos" className="gap-1.5"><UserCheck className="h-3.5 w-3.5" />Alunos</TabsTrigger>
            <TabsTrigger value="permissoes" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Permissões</TabsTrigger>
          </TabsList>

          <TabsContent value="turmas"><ClassGroupsTab companyId={selectedCompanyId} /></TabsContent>
          <TabsContent value="disciplinas"><SubjectsTab companyId={selectedCompanyId} /></TabsContent>
          <TabsContent value="series">
            <SimpleListTab label="Série" labelPlural="Série(s)" tableName="series" companyId={selectedCompanyId} />
          </TabsContent>
          <TabsContent value="segmentos">
            <SimpleListTab label="Segmento" labelPlural="Segmento(s)" tableName="segments" companyId={selectedCompanyId} />
          </TabsContent>
          <TabsContent value="turnos">
            <SimpleListTab label="Turno" labelPlural="Turno(s)" tableName="shifts" companyId={selectedCompanyId} />
          </TabsContent>
          <TabsContent value="professores"><TeachersTab companyId={selectedCompanyId} /></TabsContent>
          <TabsContent value="alunos"><StudentsTab companyId={selectedCompanyId} /></TabsContent>
          <TabsContent value="permissoes"><PermissionsTab companyId={selectedCompanyId} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
