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
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Teacher {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function NewDemandPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    teacher_id: "",
    subject_id: "",
    classGroups: "",
    examType: "",
    deadline: "",
    applicationDate: "",
    notes: "",
  });

  useEffect(() => {
    if (!profile?.company_id) return;

    const fetchData = async () => {
      const [teachersRes, subjectsRes] = await Promise.all([
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
      ]);

      if (teachersRes.data) setTeachers(teachersRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
    };

    fetchData();
  }, [profile?.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.teacher_id || !formData.subject_id || !formData.examType || !formData.deadline) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!profile?.company_id) {
      toast.error("Empresa não encontrada no perfil.");
      return;
    }

    setSaving(true);

    const classGroupsArray = formData.classGroups
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { error } = await supabase.from("demands").insert({
      company_id: profile.company_id,
      coordinator_id: profile.id,
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
      toast.error("Erro ao criar demanda. Tente novamente.");
      return;
    }

    toast.success("Demanda criada com sucesso!");
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
        <h1 className="text-2xl font-bold text-foreground font-display">Nova Demanda</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Crie uma nova demanda de prova para um professor
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-lg p-6 space-y-5">
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
            <Input
              placeholder="Ex: 2ºA, 2ºB"
              value={formData.classGroups}
              onChange={(e) => setFormData((p) => ({ ...p, classGroups: e.target.value }))}
            />
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

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            placeholder="Instruções ou observações para o professor..."
            value={formData.notes}
            onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Demanda
          </Button>
        </div>
      </form>
    </div>
  );
}
