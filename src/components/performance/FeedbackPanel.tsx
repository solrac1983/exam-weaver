import { memo, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MessageSquare, Plus, Search, Star, User, Users2, ClipboardEdit,
  Loader2, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FEEDBACK_TYPES = [
  { value: "teacher_comment", label: "Comentário do Professor", icon: MessageSquare },
  { value: "self_assessment", label: "Autoavaliação", icon: ClipboardEdit },
  { value: "peer_feedback", label: "Feedback de Colegas", icon: Users2 },
];

const CATEGORIES = [
  "geral", "comportamento", "participação", "esforço",
  "colaboração", "liderança", "criatividade", "organização",
];

interface Props {
  companyId: string;
  studentNames: Record<string, string>;
  classFilter: string;
}

function FeedbackPanel({ companyId, studentNames, classFilter }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    student_id: "",
    feedback_type: "teacher_comment",
    category: "geral",
    bimester: "1",
    content: "",
    rating: 0,
  });

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["student-feedback", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_feedback" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let result = feedbacks;
    if (typeFilter !== "all") result = result.filter((f: any) => f.feedback_type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((f: any) => {
        const name = studentNames[f.student_id] || "";
        return name.toLowerCase().includes(q) || f.content?.toLowerCase().includes(q);
      });
    }
    return result;
  }, [feedbacks, typeFilter, search, studentNames]);

  const studentOptions = useMemo(() =>
    Object.entries(studentNames)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [studentNames]
  );

  const handleSubmit = async () => {
    if (!form.student_id || !form.content.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("student_feedback" as any).insert({
      student_id: form.student_id,
      company_id: companyId,
      author_id: profile?.id,
      author_name: profile?.full_name || "",
      feedback_type: form.feedback_type,
      category: form.category,
      bimester: form.bimester,
      content: form.content,
      rating: form.rating || null,
    } as any);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar feedback", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Feedback registrado com sucesso!" });
    setForm({ student_id: "", feedback_type: "teacher_comment", category: "geral", bimester: "1", content: "", rating: 0 });
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["student-feedback"] });
  };

  const typeConfig: Record<string, { color: string; label: string }> = {
    teacher_comment: { color: "bg-primary/10 text-primary border-primary/20", label: "Professor" },
    self_assessment: { color: "bg-info/10 text-info border-info/20", label: "Autoavaliação" },
    peer_feedback: { color: "bg-success/10 text-success border-success/20", label: "Colegas" },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar feedback..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {FEEDBACK_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm">Registrar Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Aluno *</Label>
                  <Select value={form.student_id} onValueChange={v => setForm(f => ({ ...f, student_id: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {studentOptions.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={form.feedback_type} onValueChange={v => setForm(f => ({ ...f, feedback_type: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FEEDBACK_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bimestre</Label>
                  <Select value={form.bimester} onValueChange={v => setForm(f => ({ ...f, bimester: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4"].map(b => (
                        <SelectItem key={b} value={b}>{b}º Bimestre</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Avaliação (1-5)</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setForm(f => ({ ...f, rating: f.rating === n ? 0 : n }))}
                      className="p-1"
                    >
                      <Star className={`h-5 w-5 ${form.rating >= n ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Comentário *</Label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Descreva o feedback sobre o aluno..."
                  className="text-xs min-h-[100px]"
                />
              </div>
              <Button onClick={handleSubmit} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FEEDBACK_TYPES.map(t => {
          const count = feedbacks.filter((f: any) => f.feedback_type === t.value).length;
          const Icon = t.icon;
          return (
            <Card key={t.value}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                  <p className="text-[10px] text-muted-foreground">{t.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Star className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {feedbacks.length > 0
                  ? (feedbacks.filter((f: any) => f.rating).reduce((s: number, f: any) => s + (f.rating || 0), 0) / Math.max(1, feedbacks.filter((f: any) => f.rating).length)).toFixed(1)
                  : "—"
                }
              </p>
              <p className="text-[10px] text-muted-foreground">Avaliação Média</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm">Nenhum feedback registrado.</p>
            <p className="text-xs mt-1">Clique em "Novo Feedback" para adicionar observações sobre os alunos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((fb: any) => {
            const cfg = typeConfig[fb.feedback_type] || typeConfig.teacher_comment;
            return (
              <Card key={fb.id} className="hover:bg-muted/20 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">
                            {studentNames[fb.student_id] || "Aluno"}
                          </span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {fb.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{fb.bimester}º Bim</span>
                        </div>
                        <p className="text-xs text-foreground mt-1 leading-relaxed">{fb.content}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            por {fb.author_name || "—"} • {format(new Date(fb.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                          {fb.rating && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(n => (
                                <Star key={n} className={`h-3 w-3 ${fb.rating >= n ? "fill-warning text-warning" : "text-muted-foreground/20"}`} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(FeedbackPanel);
