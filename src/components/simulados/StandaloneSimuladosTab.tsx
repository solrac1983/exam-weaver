import { useState, useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  loadStandaloneExamsFromDB,
  getStandaloneExams,
  subscribeStandaloneExams,
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
  Plus,
  Search,
  FileText,
  Pencil,
  Trash2,
  Clock,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [deleteTarget, setDeleteTarget] = useState<StandaloneExam | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const exams = useSyncExternalStore(subscribeStandaloneExams, getStandaloneExams);
  const simuladoAvulsos = exams.filter((e) => e.id.startsWith("sim-avulso-"));

  useEffect(() => {
    loadStandaloneExamsFromDB().then(() => setLoaded(true));
  }, []);

  const filtered = simuladoAvulsos.filter((e) =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (config: SimuladoAvulsoConfig) => {
    if (!user || !profile?.company_id) return;

    // Close the modal immediately for better UX
    setShowCreateDialog(false);
    setProcessing(true);

    try {
      let content = "";
      if (config.documents.length > 0) {
        content = await processDocuments(config.documents, config.formatting);
      }

      const id = `sim-avulso-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const exam: StandaloneExam = {
        id,
        title: config.title,
        content,
        createdAt: now,
        updatedAt: now,
        status: "in_progress",
      };

      await saveStandaloneExamToDB(exam, user.id, profile.company_id);

      const fmtParams = new URLSearchParams({
        ff: config.formatting.fontFamily,
        fs: config.formatting.fontSize,
        cols: String(config.formatting.columns),
        tmpl: config.formatting.template,
      });

      toast({ title: "Simulado avulso criado!" });
      navigate(`/provas/editor/${id}?${fmtParams.toString()}`);
    } catch (err) {
      console.error("Error creating sim avulso:", err);
      toast({ title: "Erro ao processar documentos.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (exam: StandaloneExam) => {
    await supabase.from("standalone_exams" as any).delete().eq("id", exam.id);
    deleteStandaloneExamFromCache(exam.id);
    setDeleteTarget(null);
    toast({ title: `"${exam.title}" excluído.` });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await supabase.from("standalone_exams" as any).delete().in("id", ids);
      ids.forEach(id => deleteStandaloneExamFromCache(id));
      toast({ title: `${ids.length} simulado(s) excluído(s).` });
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Erro ao excluir.", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setShowBulkDelete(false);
    }
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
      {processing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-md animate-fade-in">
          <div className="flex flex-col items-center gap-6 rounded-3xl border bg-card p-10 shadow-2xl animate-scale-in max-w-sm w-full mx-4">
            {/* Animated rings */}
            <div className="relative flex items-center justify-center h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-2 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
              <div className="relative h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <FileText className="absolute h-5 w-5 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-foreground">Preparando seu simulado</p>
              <p className="text-sm text-muted-foreground">Processando documentos e configurando o editor...</p>
            </div>
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filtered.length} simulado{filtered.length !== 1 ? "s" : ""} avulso{filtered.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={toggleSelectAll}>
              <Checkbox
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                className="pointer-events-none"
              />
              {selectedIds.size === filtered.length ? "Desmarcar" : "Selecionar todos"}
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowBulkDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir {selectedIds.size}
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 && !processing && (
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
            className={cn(
              "p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer group",
              selectedIds.has(exam.id) && "ring-1 ring-primary/30 border-primary"
            )}
            onClick={() => navigate(`/provas/editor/${exam.id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 flex items-start gap-2">
                <Checkbox
                  checked={selectedIds.has(exam.id)}
                  onCheckedChange={() => toggleSelection(exam.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-foreground truncate text-sm">{exam.title}</h3>
                  </div>
                  <Badge className={cn("text-[10px]", statusMap[exam.status]?.className || "bg-muted text-muted-foreground")}>
                    {statusMap[exam.status]?.label || exam.status}
                  </Badge>
                </div>
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
      <SimuladoAvulsoCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onConfirm={handleCreate}
      />

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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} simulado(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Os simulados selecionados serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? "Excluindo..." : `Excluir ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
