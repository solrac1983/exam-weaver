import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSimulados, Simulado, SimuladoSubject } from "@/hooks/useSimulados";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, BookOpen, ClipboardList, Trophy } from "lucide-react";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import AnswerSheetGenerator from "@/components/simulados/AnswerSheetGenerator";
import AnswerKeyEditor from "@/components/simulados/AnswerKeyEditor";
import CorrectionsTab from "@/components/simulados/CorrectionsTab";
import SimuladoCreateForm from "@/components/simulados/SimuladoCreateForm";
import SimuladoCard from "@/components/simulados/SimuladoCard";
import { ProfessorEditDialog, RevisionDialog, AnnouncementDialog } from "@/components/simulados/SimuladoDialogs";
import SimuladoEditDialog from "@/components/simulados/SimuladoEditDialog";
import { generateEditableFile, generateConsolidatedPDF, generateAnswerKeyPDF } from "@/components/simulados/SimuladoPDFGenerator";

export default function SimuladosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAuth();
  const {
    simulados, teachers, classGroups, loading, hasMore, loadMore, createSimulado,
    updateSubjectStatus, submitSubject, updateSubjectContent,
    updateAnnouncement, updateSimuladoStatus, deleteSimulado, updateSimulado,
  } = useSimulados();

  const isCoordinator = role === "admin" || role === "super_admin";
  const isProfessor = role === "professor";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Dialog states
  const [editingSubject, setEditingSubject] = useState<SimuladoSubject | null>(null);
  const [revisionSubject, setRevisionSubject] = useState<SimuladoSubject | null>(null);
  const [announcementSimId, setAnnouncementSimId] = useState<string | null>(null);
  const [announcementInitialText, setAnnouncementInitialText] = useState("");
  const [answerSheetSim, setAnswerSheetSim] = useState<Simulado | null>(null);
  const [answerKeySim, setAnswerKeySim] = useState<Simulado | null>(null);
  const [editingSim, setEditingSim] = useState<Simulado | null>(null);

  if (loading) return <DashboardSkeleton />;

  /* ---- Handlers ---- */
  const handleSaveDraft = async (id: string, content: string, answerKey: string) => {
    await updateSubjectContent(id, content, answerKey);
    await updateSubjectStatus(id, "in_progress");
    toast({ title: "Rascunho salvo!" });
  };

  const handleSubmitToReview = async (id: string, content: string, answerKey: string) => {
    await submitSubject(id, content, answerKey);
    toast({ title: "Questões enviadas para revisão!" });
  };

  const handleApprove = async (subjectId: string) => {
    await updateSubjectStatus(subjectId, "approved");
    toast({ title: "Disciplina aprovada!" });
  };

  const handleRequestRevision = async (subjectId: string, notes: string) => {
    await updateSubjectStatus(subjectId, "revision_requested", notes);
    toast({ title: "Revisão solicitada ao professor." });
  };

  const handleApproveAll = async (sim: Simulado) => {
    const pending = sim.subjects.filter((s) => s.status === "submitted");
    await Promise.all(pending.map((sub) => updateSubjectStatus(sub.id, "approved")));
    await updateSimuladoStatus(sim.id, "complete");
    toast({ title: "Simulado aprovado e finalizado!" });
  };

  const handleAnnouncement = async (simId: string, text: string) => {
    await updateAnnouncement(simId, text);
    toast({ title: "Comunicado salvo!" });
  };

  const handleGeneratePDF = (sim: Simulado) => {
    if (!generateConsolidatedPDF(sim)) {
      toast({ title: "Nenhuma disciplina aprovada ou pop-ups bloqueados.", variant: "destructive" });
    }
  };

  const handleGenerateAnswerKey = (sim: Simulado) => {
    if (!generateAnswerKeyPDF(sim)) {
      toast({ title: "Nenhuma disciplina aprovada ou pop-ups bloqueados.", variant: "destructive" });
    }
  };

  const handleCreate = async (data: Parameters<typeof createSimulado>[0]) => {
    await createSimulado(data);
    setShowNew(false);
    toast({ title: "Simulado criado com sucesso!" });
  };

  const handleEdit = (sim: Simulado) => {
    setEditingSim(sim);
  };

  const handleSaveEdit = async (simId: string, data: Parameters<typeof updateSimulado>[1]) => {
    await updateSimulado(simId, data);
    toast({ title: `Simulado atualizado com sucesso!` });
  };

  const handleDelete = async (sim: Simulado) => {
    await deleteSimulado(sim.id);
    toast({ title: `Simulado "${sim.title}" excluído com sucesso.` });
  };

  /* ---- Render list ---- */
  const renderSimuladosList = () => (
    <div className="space-y-4">
      {showNew && isCoordinator && (
        <SimuladoCreateForm
          teachers={teachers}
          classGroups={classGroups}
          onCancel={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}

      {simulados.length === 0 && !showNew && (
        <Card className="py-16 flex flex-col items-center justify-center text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            {isProfessor ? "Nenhum simulado atribuído a você." : "Nenhum simulado criado ainda."}
          </p>
          {isCoordinator && (
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" /> Criar primeiro simulado
            </Button>
          )}
        </Card>
      )}

      <div className="space-y-4">
        {simulados.map((sim) => (
          <SimuladoCard
            key={sim.id}
            sim={sim}
            isExpanded={expandedId === sim.id}
            onToggle={() => setExpandedId(expandedId === sim.id ? null : sim.id)}
            isCoordinator={isCoordinator}
            isProfessor={isProfessor}
            onProfessorEdit={setEditingSubject}
            onRevision={setRevisionSubject}
            onApprove={handleApprove}
            onApproveAll={handleApproveAll}
            onGenerateFile={(s) => generateEditableFile(s, navigate)}
            onGeneratePDF={handleGeneratePDF}
            onGenerateAnswerKey={handleGenerateAnswerKey}
            onAnnouncement={(s) => { setAnnouncementSimId(s.id); setAnnouncementInitialText(s.announcement || ""); }}
            onAnswerSheet={setAnswerSheetSim}
            onAnswerKeyEditor={setAnswerKeySim}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} className="gap-2">
            Carregar mais simulados
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <ProfessorEditDialog
        subject={editingSubject}
        onClose={() => setEditingSubject(null)}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmitToReview}
      />

      <RevisionDialog
        subject={revisionSubject}
        onClose={() => setRevisionSubject(null)}
        onRequestRevision={handleRequestRevision}
        onApprove={handleApprove}
      />

      <AnnouncementDialog
        simId={announcementSimId}
        initialText={announcementInitialText}
        onClose={() => setAnnouncementSimId(null)}
        onSave={handleAnnouncement}
      />

      <SimuladoEditDialog
        sim={editingSim}
        teachers={teachers}
        classGroups={classGroups}
        onClose={() => setEditingSim(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Simulados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isProfessor ? "Simulados atribuídos a você" : "Crie e gerencie simulados multidisciplinares"}
          </p>
        </div>
        {isCoordinator && (
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Simulado
          </Button>
        )}
      </div>

      {isCoordinator ? (
        <Tabs defaultValue="simulados" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="simulados" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Simulados</TabsTrigger>
            <TabsTrigger value="correcoes" className="gap-1.5"><Trophy className="h-3.5 w-3.5" />Correções</TabsTrigger>
          </TabsList>
          <TabsContent value="simulados">{renderSimuladosList()}</TabsContent>
          <TabsContent value="correcoes"><CorrectionsTab simulados={simulados} /></TabsContent>
        </Tabs>
      ) : (
        renderSimuladosList()
      )}

      {answerSheetSim && (
        <AnswerSheetGenerator sim={answerSheetSim} open={!!answerSheetSim} onOpenChange={(open) => !open && setAnswerSheetSim(null)} />
      )}
      {answerKeySim && (
        <AnswerKeyEditor sim={answerKeySim} open={!!answerKeySim} onOpenChange={(open) => !open && setAnswerKeySim(null)} onSaved={() => setAnswerKeySim(null)} />
      )}
    </div>
  );
}
