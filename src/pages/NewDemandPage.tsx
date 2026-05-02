import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Loader2, ChevronsUpDown, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { saveStandaloneExamToDB, defaultExamContent } from "@/data/examContentStore";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

interface Teacher {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface ClassGroup {
  id: string;
  name: string;
}

export default function NewDemandPage() {
  const navigate = useNavigate();
  const { profile, role, user } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [selectedClassGroups, setSelectedClassGroups] = useState<string[]>([]);
  const [classGroupSearch, setClassGroupSearch] = useState("");
  const [classGroupOpen, setClassGroupOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAvulsa, setIsAvulsa] = useState(false);
  const isAdmin = role === "admin" || role === "coordinator" || role === "super_admin";
  const [formData, setFormData] = useState({
    name: "",
    teacher_id: "",
    subject_id: "",
    examType: "",
    deadline: "",
    applicationDate: "",
    notes: "",
  });
  const [printOrientation, setPrintOrientation] = useState<"portrait" | "landscape">("portrait");
  const [printMargin, setPrintMargin] = useState<"narrow" | "normal" | "wide">("normal");

  useEffect(() => {
    if (!profile?.company_id) return;

    const fetchData = async () => {
      const [teachersRes, subjectsRes, classGroupsRes] = await Promise.all([
        supabase
          .from("teachers")
          .select("id, name")
          .eq("company_id", profile.company_id!)
          .order("name"),
        supabase
          .from("subjects")
          .select("id, name")
          .eq("company_id", profile.company_id!)
          .order("name"),
        supabase
          .from("class_groups")
          .select("id, name")
          .eq("company_id", profile.company_id!)
          .order("name"),
      ]);

      if (teachersRes.data) setTeachers(teachersRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (classGroupsRes.data) setClassGroups(classGroupsRes.data);
    };

    fetchData();
  }, [profile?.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      showInvokeError("Preencha o nome da avaliação.");
      return;
    }

    if (!profile?.company_id || !user?.id) {
      showInvokeError("Empresa ou usuário não encontrado no perfil.");
      return;
    }

    if (isAvulsa) {
      setSaving(true);
      const examId = crypto.randomUUID();
      const now = new Date().toISOString();
      const result = await saveStandaloneExamToDB(
        {
          id: examId,
          title: formData.name,
          content: defaultExamContent,
          createdAt: now,
          updatedAt: now,
          status: "in_progress",
        },
        user.id,
        profile.company_id
      );
      setSaving(false);
      if (result) {
        showInvokeSuccess("Avaliação avulsa criada com sucesso!");
        navigate(`/provas/editor/${examId}`);
      } else {
        console.error("Failed to create standalone exam. User/Profile:", { user_id: user.id, company_id: profile.company_id });
        showInvokeError("Erro ao criar avaliação avulsa.");
      }
      return;
    }

    if (!formData.teacher_id || !formData.subject_id || !formData.examType || !formData.deadline) {
      showInvokeError("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);

    const classGroupsArray = selectedClassGroups;

    const { error } = await supabase.from("demands").insert({
      company_id: profile.company_id,
      coordinator_id: profile.id,
      name: formData.name,
      teacher_id: formData.teacher_id,
      subject_id: formData.subject_id,
      class_groups: classGroupsArray,
      exam_type: formData.examType,
      deadline: formData.deadline,
      application_date: formData.applicationDate || null,
      notes: formData.notes || "",
      status: "pending",
    });

    setSaving(false);

    if (error) {
      console.error("Error creating demand:", error);
      showInvokeError("Erro ao criar avaliação. Tente novamente.");
      return;
    }

    showInvokeSuccess("Avaliação criada com sucesso!");
    navigate("/demandas");
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">Nova Avaliação</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Crie uma nova avaliação de prova{isAvulsa ? " avulsa" : " para um professor"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-lg p-6 space-y-5">
        {isAdmin && (
          <div className="flex items-center justify-between rounded-md border border-border p-3 bg-muted/30">
            <div>
              <Label className="text-sm font-medium">Avaliação Avulsa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Criar sem vincular a professor ou disciplina
              </p>
            </div>
            <Switch checked={isAvulsa} onCheckedChange={setIsAvulsa} />
          </div>
        )}

        <div className="space-y-2">
          <Label>Nome da Avaliação *</Label>
          <Input
            placeholder={isAvulsa ? "Ex: Prova Extra de Ciências" : "Ex: Prova Bimestral de Matemática"}
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
          />
        </div>

        {!isAvulsa && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Professor *</Label>
            <Select onValueChange={(v) => setFormData((p) => ({ ...p, teacher_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o professor" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
                {teachers.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Nenhum professor cadastrado
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Disciplina *</Label>
            <Select onValueChange={(v) => setFormData((p) => ({ ...p, subject_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a disciplina" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
                {subjects.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Nenhuma disciplina cadastrada
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Turma(s)</Label>
            <Popover open={classGroupOpen} onOpenChange={setClassGroupOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal h-10"
                >
                  {selectedClassGroups.length > 0
                    ? selectedClassGroups.join(", ")
                    : "Selecione as turmas"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar turma..."
                    value={classGroupSearch}
                    onChange={(e) => setClassGroupSearch(e.target.value)}
                    className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {classGroups
                    .filter((cg) =>
                      cg.name.toLowerCase().includes(classGroupSearch.toLowerCase())
                    )
                    .map((cg) => (
                      <label
                        key={cg.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={selectedClassGroups.includes(cg.name)}
                          onCheckedChange={(checked) => {
                            setSelectedClassGroups((prev) =>
                              checked
                                ? [...prev, cg.name]
                                : prev.filter((n) => n !== cg.name)
                            );
                          }}
                        />
                        {cg.name}
                      </label>
                    ))}
                  {classGroups.filter((cg) =>
                    cg.name.toLowerCase().includes(classGroupSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nenhuma turma encontrada
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Prova *</Label>
            <Select onValueChange={(v) => setFormData((p) => ({ ...p, examType: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="bimestral">Bimestral</SelectItem>
                <SelectItem value="simulado">Simulado</SelectItem>
                <SelectItem value="recuperacao">Recuperação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Prazo Final *</Label>
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData((p) => ({ ...p, deadline: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Data de Aplicação (opcional)</Label>
            <Input
              type="date"
              value={formData.applicationDate}
              onChange={(e) => setFormData((p) => ({ ...p, applicationDate: e.target.value }))}
            />
          </div>
        </div>
        )}

        {!isAvulsa && (
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            placeholder="Instruções ou observações para o professor..."
            value={formData.notes}
            onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            rows={3}
          />
        </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isAvulsa ? "Criar e Abrir Editor" : "Criar Avaliação"}
          </Button>
        </div>
      </form>
    </div>
  );
}
