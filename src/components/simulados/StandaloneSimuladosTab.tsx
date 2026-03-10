import { useState, useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  loadStandaloneExamsFromDB,
  getStandaloneExams,
  subscribeStandaloneExams,
  saveStandaloneExamToDB,
  deleteStandaloneExamFromCache,
  type StandaloneExam,
} from "@/data/examContentStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  FileText,
  Pencil,
  Trash2,
  Clock,
  BookOpen,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; className: string }> = {
  in_progress: { label: "Em elaboração", className: "bg-warning/10 text-warning" },
  approved: { label: "Finalizado", className: "bg-success/10 text-success" },
};

export default function StandaloneSimuladosTab() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StandaloneExam | null>(null);

  const exams = useSyncExternalStore(subscribeStandaloneExams, getStandaloneExams);

  // Filter only "simulado-avulso" type exams
  const simuladoAvulsos = exams.filter((e) => e.id.startsWith("sim-avulso-"));

  useEffect(() => {
    loadStandaloneExamsFromDB().then(() => setLoaded(true));
  }, []);

  const filtered = simuladoAvulsos.filter((e) =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newTitle.trim() || !user || !profile?.company_id) return;

    const id = `sim-avulso-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const exam: StandaloneExam = {
      id,
      title: newTitle.trim(),
      content: "",
      createdAt: now,
      updatedAt: now,
      status: "in_progress",
    };

    await saveStandaloneExamToDB(exam, user.id, profile.company_id);
    setShowCreateDialog(false);
    setNewTitle("");
    toast({ title: "Simulado avulso criado!" });
    navigate(`/provas/editor/${id}`);
  };

  const handleDelete = async (exam: StandaloneExam) => {
    await supabase.from("standalone_exams" as any).delete().eq("id", exam.id);
    deleteStandaloneExamFromCache(exam.id);
    setDeleteTarget(null);
    toast({ title: `"${exam.title}" excluído.` });
  };

  if (!loaded) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar simulado avulso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 ml-auto">
          <Plus className="h-4 w-4" /> Novo Simulado Avulso
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} simulado{filtered.length !== 1 ? "s" : ""} avulso{filtered.length !== 1 ? "s" : ""}
      </p>

      {filtered.length === 0 && (
        <Card className="py-16 flex flex-col items-center justify-center text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhum simulado avulso encontrado.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie um simulado avulso para inserir questões de imagens, Word, PDF e formatar livremente.
          </p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4" /> Criar simulado avulso
          </Button>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((exam) => (
          <Card
            key={exam.id}
            className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => navigate(`/provas/editor/${exam.id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="font-semibold text-foreground truncate text-sm">{exam.title}</h3>
                </div>
                <Badge className={cn("text-[10px]", statusMap[exam.status]?.className || "bg-muted text-muted-foreground")}>
                  {statusMap[exam.status]?.label || exam.status}
                </Badge>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary">
                Avulso
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(exam.updatedAt).toLocaleDateString("pt-BR")}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/provas/editor/${exam.id}`);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(exam);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Simulado Avulso</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Simulados avulsos permitem inserir questões de imagens, Word, PDF e formatar livremente no editor.
            </p>
            <Input
              placeholder="Título do simulado avulso"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>
              Criar e abrir editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir simulado avulso?</AlertDialogTitle>
            <AlertDialogDescription>
              O simulado "{deleteTarget?.title}" será excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
