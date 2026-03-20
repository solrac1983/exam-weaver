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
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar simulados avulsos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowBulkDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir {selectedIds.size}
          </Button>
        )}
        <Button variant="outline" className="gap-1.5 border-primary text-primary hover:bg-primary/10" onClick={() => navigate("/simulados/novo-avulso")}>
          <Plus className="h-4 w-4" />
          Novo Simulado Avulso
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-10 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum simulado avulso encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Crie um novo simulado avulso para começar.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.length > 1 && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={selectedIds.size === filtered.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-xs text-muted-foreground">Selecionar todos</span>
            </div>
          )}
          {filtered.map((exam) => {
            const st = statusMap[exam.status] || statusMap.in_progress;
            return (
              <Card
                key={exam.id}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer hover:shadow-sm transition-shadow",
                  selectedIds.has(exam.id) && "ring-2 ring-primary"
                )}
                onClick={() => navigate(`/provas/editor/${exam.id}`)}
              >
                <Checkbox
                  checked={selectedIds.has(exam.id)}
                  onCheckedChange={() => toggleSelection(exam.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{exam.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {new Date(exam.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge className={cn("shrink-0", st.className)}>{st.label}</Badge>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); navigate(`/provas/editor/${exam.id}`); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(exam); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
