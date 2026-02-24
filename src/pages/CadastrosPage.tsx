import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, GraduationCap, Layers, Clock, ClipboardList } from "lucide-react";
import ClassGroupsTab from "@/components/cadastros/ClassGroupsTab";
import SubjectsTab from "@/components/cadastros/SubjectsTab";
import TeachersTab from "@/components/cadastros/TeachersTab";
import SimpleListTab from "@/components/cadastros/SimpleListTab";

const initialSeries = [
  { id: "ser-1", name: "1º ano" },
  { id: "ser-2", name: "2º ano" },
  { id: "ser-3", name: "3º ano" },
];

const initialSegments = [
  { id: "seg-1", name: "Educação Infantil" },
  { id: "seg-2", name: "Anos Iniciais" },
  { id: "seg-3", name: "Anos Finais" },
  { id: "seg-4", name: "Ensino Médio" },
  { id: "seg-5", name: "Integral" },
];

const initialShifts = [
  { id: "sh-1", name: "Manhã" },
  { id: "sh-2", name: "Tarde" },
  { id: "sh-3", name: "Integral" },
];

export default function CadastrosPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Cadastros
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie turmas, disciplinas, séries, segmentos, turnos e professores
        </p>
      </div>

      <Tabs defaultValue="turmas" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="turmas" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Turmas
          </TabsTrigger>
          <TabsTrigger value="disciplinas" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Disciplinas
          </TabsTrigger>
          <TabsTrigger value="series" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Séries
          </TabsTrigger>
          <TabsTrigger value="segmentos" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Segmentos
          </TabsTrigger>
          <TabsTrigger value="turnos" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Turnos
          </TabsTrigger>
          <TabsTrigger value="professores" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Professores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="turmas"><ClassGroupsTab /></TabsContent>
        <TabsContent value="disciplinas"><SubjectsTab /></TabsContent>
        <TabsContent value="series">
          <SimpleListTab label="Série" labelPlural="Série(s)" initialItems={initialSeries} />
        </TabsContent>
        <TabsContent value="segmentos">
          <SimpleListTab label="Segmento" labelPlural="Segmento(s)" initialItems={initialSegments} />
        </TabsContent>
        <TabsContent value="turnos">
          <SimpleListTab label="Turno" labelPlural="Turno(s)" initialItems={initialShifts} />
        </TabsContent>
        <TabsContent value="professores"><TeachersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
