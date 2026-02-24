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
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function NewDemandPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    teacher: "",
    subject: "",
    classGroups: "",
    examType: "",
    deadline: "",
    applicationDate: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: integrate with backend
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
            <Label>Professor</Label>
            <Select onValueChange={(v) => setFormData((p) => ({ ...p, teacher: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o professor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prof-1">Carlos Oliveira</SelectItem>
                <SelectItem value="prof-2">Ana Santos</SelectItem>
                <SelectItem value="prof-3">Roberto Lima</SelectItem>
                <SelectItem value="prof-4">Fernanda Costa</SelectItem>
                <SelectItem value="prof-5">Paulo Mendes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Disciplina</Label>
            <Select onValueChange={(v) => setFormData((p) => ({ ...p, subject: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sub-1">Matemática</SelectItem>
                <SelectItem value="sub-2">Português</SelectItem>
                <SelectItem value="sub-3">Química</SelectItem>
                <SelectItem value="sub-4">Física</SelectItem>
                <SelectItem value="sub-5">História</SelectItem>
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
            <Label>Tipo de Prova</Label>
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
            <Label>Prazo Final</Label>
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
          <Button type="submit">Criar Demanda</Button>
        </div>
      </form>
    </div>
  );
}
