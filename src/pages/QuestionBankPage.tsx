import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  mockSubjects,
  mockClassGroups,
  mockBimesters,
  currentUser,
  professorSubjects,
} from "@/data/mockData";
import { useCompanyDemands } from "@/hooks/useCompanyDemands";
import { QuestionBankItem } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { RichEditor } from "@/components/editor/RichEditor";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Search,
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  Filter,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { GeneratedQuestion } from "@/pages/AIQuestionGeneratorPage";

const difficultyLabels: Record<string, string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
};

const difficultyStyles: Record<string, string> = {
  facil: "bg-emerald-500/10 text-emerald-600",
  media: "bg-amber-500/10 text-amber-600",
  dificil: "bg-destructive/10 text-destructive",
};

// Role-based subject filtering
function getAvailableSubjects() {
  if (currentUser.role === "coordinator" || currentUser.role === "super_admin") {
    return mockSubjects;
  }
  const subjectIds = professorSubjects[currentUser.id] || [];
  return mockSubjects.filter((s) => subjectIds.includes(s.id));
}

const emptyForm: Omit<QuestionBankItem, "id" | "createdAt" | "authorId" | "authorName"> = {
  subjectId: "",
  subjectName: "",
  classGroup: "",
  bimester: "",
  topic: "",
  grade: "",
  content: "",
  type: "objetiva",
  difficulty: "media",
  tags: [],
};

export default function QuestionBankPage() {
  const { companyQuestions } = useCompanyDemands();
  const [questions, setQuestions] = useState<QuestionBankItem[]>(companyQuestions);

  // Sync when companyQuestions changes
  useEffect(() => {
    setQuestions(companyQuestions);
  }, [companyQuestions]);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterBimester, setFilterBimester] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterTag, setFilterTag] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tagInput, setTagInput] = useState("");
  const navigate = useNavigate();
  const { profile, role: authRole } = useAuth();
  const availableSubjects = getAvailableSubjects();

  // Pick up AI-generated questions from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("ai-generated-questions");
    if (stored) {
      sessionStorage.removeItem("ai-generated-questions");
      try {
        const qs: GeneratedQuestion[] = JSON.parse(stored);
        const newQuestions = qs.map((q, i) => ({
          id: `ai-${Date.now()}-${i}`,
          subjectId: q.subjectId || "",
          subjectName: q.subjectId ? (mockSubjects.find(s => s.id === q.subjectId)?.name || "IA") : "IA",
          classGroup: q.grade || "",
          bimester: "",
          topic: q.topic,
          grade: q.grade || "",
          content: q.content + (q.options ? "<ol type='A'>" + q.options.map(o => `<li>${o}</li>`).join("") + "</ol>" : ""),
          type: q.type === "objetiva" ? "objetiva" as const : "discursiva" as const,
          difficulty: q.difficulty,
          tags: [...(q.tags || []), "IA"].filter(Boolean),
          authorId: currentUser.id,
          authorName: currentUser.name,
          createdAt: new Date().toISOString().split("T")[0],
        }));
        setQuestions(prev => [...newQuestions, ...prev]);
        toast.success(`${newQuestions.length} questão(ões) inserida(s) da IA!`);
      } catch (e) { console.error(e); }
    }
  }, []);

  // Filtering
  const filtered = questions.filter((q) => {

    if (filterSubject !== "all" && q.subjectId !== filterSubject) return false;
    if (filterClass !== "all" && q.classGroup !== filterClass) return false;
    if (filterBimester !== "all" && q.bimester !== filterBimester) return false;
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
    if (filterTag !== "all" && !q.tags.includes(filterTag)) return false;

    if (search) {
      const s = search.toLowerCase();
      return (
        q.content.toLowerCase().includes(s) ||
        q.subjectName.toLowerCase().includes(s) ||
        q.topic.toLowerCase().includes(s) ||
        q.tags.some((t) => t.toLowerCase().includes(s))
      );
    }
    return true;
  });

  const allTags = [...new Set(questions.flatMap((q) => q.tags))];

  // CRUD handlers
  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setTagInput("");
    setDialogOpen(true);
  };

  const openEdit = (q: QuestionBankItem) => {
    setEditingId(q.id);
    setForm({
      subjectId: q.subjectId,
      subjectName: q.subjectName,
      classGroup: q.classGroup,
      bimester: q.bimester,
      topic: q.topic,
      grade: q.grade,
      content: q.content,
      type: q.type,
      difficulty: q.difficulty,
      tags: [...q.tags],
    });
    setTagInput("");
    setDialogOpen(true);
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      setQuestions((prev) => prev.filter((q) => q.id !== deleteId));
      toast.success("Questão excluída com sucesso!");
    }
    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const handleSave = () => {
    if (!form.subjectId || !form.classGroup || !form.bimester || !form.content.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const subject = mockSubjects.find((s) => s.id === form.subjectId);

    if (editingId) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingId
            ? {
                ...q,
                ...form,
                subjectName: subject?.name || form.subjectName,
                updatedAt: new Date().toISOString().split("T")[0],
              }
            : q
        )
      );
      toast.success("Questão atualizada com sucesso!");
    } else {
      const newQ: QuestionBankItem = {
        id: `q-${Date.now()}`,
        ...form,
        subjectName: subject?.name || "",
        authorId: currentUser.id,
        authorName: currentUser.name,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setQuestions((prev) => [newQ, ...prev]);
      toast.success("Questão adicionada com sucesso!");
    }
    setDialogOpen(false);
  };

  const clearFilters = () => {
    setFilterSubject("all");
    setFilterClass("all");
    setFilterBimester("all");
    setFilterDifficulty("all");
    setFilterTag("all");
    setSearch("");
  };

  const hasActiveFilters =
    filterSubject !== "all" || filterClass !== "all" || filterBimester !== "all" || filterDifficulty !== "all" || filterTag !== "all" || search !== "";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Banco de Questões
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie, pesquise e reutilize questões — {filtered.length} questão(ões) encontrada(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/ai-questoes?return=/banco-questoes")} className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
            <Sparkles className="h-4 w-4" />
            Gerar com IA
          </Button>
          <Button onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nova Questão
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="glass-card rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por conteúdo, disciplina, tópico ou tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas disciplinas</SelectItem>
              {availableSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas turmas</SelectItem>
              {mockClassGroups.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterBimester} onValueChange={setFilterBimester}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Bimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos bimestres</SelectItem>
              {mockBimesters.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="facil">Fácil</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="dificil">Difícil</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filtered.map((q, i) => (
          <div
            key={q.id}
            className="glass-card rounded-lg p-4 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-primary">{q.subjectName}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{q.classGroup}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{q.bimester}</span>
                  {q.topic && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground italic">{q.topic}</span>
                    </>
                  )}
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      difficultyStyles[q.difficulty]
                    )}
                  >
                    {difficultyLabels[q.difficulty]}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      q.type === "objetiva"
                        ? "bg-sky-500/10 text-sky-600"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {q.type === "objetiva" ? "Objetiva" : "Discursiva"}
                  </span>
                </div>
                <div className="text-sm text-foreground prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded" dangerouslySetInnerHTML={{ __html: q.content }} />
                {q.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {q.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-destructive"
                  onClick={() => confirmDelete(q.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                por {q.authorName} • {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                {q.updatedAt && (
                  <span className="ml-1">(editado em {new Date(q.updatedAt).toLocaleDateString("pt-BR")})</span>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma questão encontrada.</p>
          <p className="text-xs mt-1">Tente ajustar os filtros ou adicione uma nova questão.</p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Questão" : "Nova Questão"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize os dados da questão abaixo." : "Preencha os campos para adicionar uma nova questão ao banco."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Disciplina */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Disciplina *</Label>
                <Select
                  value={form.subjectId}
                  onValueChange={(v) => setForm((f) => ({ ...f, subjectId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Turma *</Label>
                <Select
                  value={form.classGroup}
                  onValueChange={(v) => setForm((f) => ({ ...f, classGroup: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClassGroups.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Bimestre *</Label>
                <Select
                  value={form.bimester}
                  onValueChange={(v) => setForm((f) => ({ ...f, bimester: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockBimesters.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Conteúdo / Tópico</Label>
                <Input
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder="Ex: Equações do 2º Grau"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: "objetiva" | "discursiva") => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="objetiva">Objetiva</SelectItem>
                    <SelectItem value="discursiva">Discursiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dificuldade</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v: "facil" | "media" | "dificil") =>
                    setForm((f) => ({ ...f, difficulty: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facil">Fácil</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="dificil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Enunciado da Questão *</Label>
              <div className="border border-input rounded-lg overflow-hidden min-h-[350px]">
                <RichEditor
                  content={form.content}
                  onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                  placeholder="Digite o enunciado completo da questão..."
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tags</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Digite uma tag e pressione Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  Adicionar
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Salvar alterações" : "Adicionar questão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir questão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
