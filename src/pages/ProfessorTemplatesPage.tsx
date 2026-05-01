import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Lightbulb,
  ClipboardList,
  Search,
  Eye,
  Calendar,
  PenTool,
  X,
  Printer,
  Plus,
  Trash2,
  Pencil,
  Image as ImageIcon,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

// ─── Static template data ───

interface TemplateItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
}

const lessonPlans: TemplateItem[] = [
  {
    id: "lp-1",
    title: "Plano de Aula — Estrutura Padrão",
    description: "Modelo completo com objetivos, metodologia, recursos e avaliação.",
    category: "Geral",
    tags: ["planejamento", "estrutura"],
    content: `<h1 style="text-align:center">PLANO DE AULA</h1>
<p><strong>Professor(a):</strong> _________________ &nbsp;&nbsp; <strong>Disciplina:</strong> _________________</p>
<p><strong>Turma:</strong> _______ &nbsp;&nbsp; <strong>Data:</strong> ___/___/______ &nbsp;&nbsp; <strong>Duração:</strong> _____ min</p>
<hr/>
<h2>1. Tema / Conteúdo</h2><p>[Descreva o tema da aula]</p>
<h2>2. Objetivos de Aprendizagem</h2>
<ul><li>Objetivo 1</li><li>Objetivo 2</li><li>Objetivo 3</li></ul>
<h2>3. Metodologia</h2>
<p><strong>Momento 1 — Abertura (10 min):</strong> [Atividade de introdução / engajamento]</p>
<p><strong>Momento 2 — Desenvolvimento (25 min):</strong> [Explicação do conteúdo / atividade prática]</p>
<p><strong>Momento 3 — Encerramento (10 min):</strong> [Síntese / atividade de fixação]</p>
<h2>4. Recursos</h2><ul><li>Quadro branco</li><li>Projetor</li><li>Material impresso</li></ul>
<h2>5. Avaliação</h2><p>[Como será verificada a aprendizagem dos alunos]</p>
<h2>6. Observações</h2><p>[Notas adicionais, adaptações para inclusão, etc.]</p>`,
  },
  {
    id: "lp-2",
    title: "Plano Semanal — Visão Geral",
    description: "Planejamento semanal com distribuição de conteúdos por dia.",
    category: "Semanal",
    tags: ["planejamento", "semanal"],
    content: `<h1 style="text-align:center">PLANEJAMENTO SEMANAL</h1>
<p><strong>Professor(a):</strong> _________________ &nbsp;&nbsp; <strong>Disciplina:</strong> _________________</p>
<p><strong>Semana:</strong> ___/___/______ a ___/___/______</p>
<hr/>
<table style="width:100%;border-collapse:collapse">
<thead><tr style="background:#f3f4f6"><th style="border:1px solid #d1d5db;padding:8px">Dia</th><th style="border:1px solid #d1d5db;padding:8px">Conteúdo</th><th style="border:1px solid #d1d5db;padding:8px">Atividade</th><th style="border:1px solid #d1d5db;padding:8px">Recurso</th></tr></thead>
<tbody>
<tr><td style="border:1px solid #d1d5db;padding:8px">Segunda</td><td style="border:1px solid #d1d5db;padding:8px"></td><td style="border:1px solid #d1d5db;padding:8px"></td><td style="border:1px solid #d1d5db;padding:8px"></td></tr>
<tr><td style="border:1px solid #d1d5db;padding:8px">Terça</td><td style="border:1px solid #d1d5db;padding:8px"></td><td style="border:1px solid #d1d5db;padding:8px"></td><td style="border:1px solid #d1d5db;padding:8px"></td></tr>
<tr><td style="border:1px solid #d1d5db;padding:8px">Quarta</td><td style="border:1px solid #d1d5db;padding:8px"></td><td style="border:1px solid #d1d5db;padding:8px"></td><td style="border:1px solid #d1d5db;padding:8px"></td></tr>
<tr><td style="border:1px solid #d1d5db;padding:8px">Quinta</td><td style="border:1px solid #d1d5db;padding:8px"></td><td style="border:1px solid #d1d5db;padding:8px"></td><td style="border:1px solid #d1d5db;padding:8px"></td></tr>
<tr><td style="border:1px solid #d1d5db;padding:8px">Sexta</td><td style="border:1px solid #d1d5db;padding:8px"></td><td style="border:1px solid #d1d5db;padding:8px"></td><td style="border:1px solid #d1d5db;padding:8px"></td></tr>
</tbody></table>`,
  },
  {
    id: "lp-3",
    title: "Plano de Aula — Metodologia Ativa",
    description: "Modelo focado em sala de aula invertida e aprendizagem ativa.",
    category: "Metodologia Ativa",
    tags: ["inovação", "ativa", "sala invertida"],
    content: `<h1 style="text-align:center">PLANO DE AULA — METODOLOGIA ATIVA</h1>
<p><strong>Professor(a):</strong> _________________ &nbsp;&nbsp; <strong>Disciplina:</strong> _________________</p>
<hr/>
<h2>Pré-Aula (Atividade prévia do aluno)</h2>
<p>[Vídeo, leitura ou exercício que o aluno deve realizar antes da aula]</p>
<h2>Durante a Aula</h2>
<p><strong>Fase 1 — Verificação (10 min):</strong> Quiz rápido sobre o material pré-aula</p>
<p><strong>Fase 2 — Aprofundamento (20 min):</strong> Discussão em grupo / Resolução de problemas</p>
<p><strong>Fase 3 — Aplicação (15 min):</strong> Atividade prática / Estudo de caso</p>
<h2>Pós-Aula</h2>
<p>[Atividade de consolidação para casa]</p>
<h2>Avaliação</h2>
<p>[Rubricas, autoavaliação, avaliação por pares]</p>`,
  },
];

const assessmentModels: TemplateItem[] = [
  {
    id: "am-1",
    title: "Avaliação Bimestral — Objetiva",
    description: "Modelo de prova com questões de múltipla escolha e cabeçalho padrão.",
    category: "Bimestral",
    tags: ["prova", "objetiva", "bimestral"],
    content: `<h1 style="text-align:center">AVALIAÇÃO BIMESTRAL</h1>
<p style="text-align:center"><strong>Disciplina:</strong> _________________ &nbsp;&nbsp; <strong>Professor(a):</strong> _________________</p>
<p style="text-align:center"><strong>Aluno(a):</strong> _________________________________ &nbsp;&nbsp; <strong>Turma:</strong> _______ &nbsp;&nbsp; <strong>Data:</strong> ___/___/______</p>
<hr/>
<h2>Instruções</h2>
<ul><li>Leia atentamente cada questão antes de responder.</li><li>Utilize caneta azul ou preta.</li><li>Não é permitido o uso de corretivo.</li></ul>
<hr/>
<p><strong>1)</strong> Enunciado da questão...</p>
<p>a) Alternativa A</p><p>b) Alternativa B</p><p>c) Alternativa C</p><p>d) Alternativa D</p>
<p></p>
<p><strong>2)</strong> Enunciado da questão...</p>
<p>a) Alternativa A</p><p>b) Alternativa B</p><p>c) Alternativa C</p><p>d) Alternativa D</p>`,
  },
  {
    id: "am-2",
    title: "Avaliação Discursiva",
    description: "Modelo com espaço para respostas dissertativas e critérios de correção.",
    category: "Discursiva",
    tags: ["prova", "dissertativa"],
    content: `<h1 style="text-align:center">AVALIAÇÃO DISCURSIVA</h1>
<p style="text-align:center"><strong>Disciplina:</strong> _________________ &nbsp;&nbsp; <strong>Professor(a):</strong> _________________</p>
<p style="text-align:center"><strong>Aluno(a):</strong> _________________________________ &nbsp;&nbsp; <strong>Turma:</strong> _______ &nbsp;&nbsp; <strong>Data:</strong> ___/___/______</p>
<hr/>
<h2>Instruções</h2>
<ul><li>Responda com clareza e objetividade.</li><li>Utilize exemplos sempre que possível.</li><li>Valor de cada questão indicado entre parênteses.</li></ul>
<hr/>
<p><strong>1) (2,0 pts)</strong> [Enunciado da questão discursiva]</p>
<p><em>Resposta:</em></p>
<p>_______________________________________________</p>
<p>_______________________________________________</p>
<p></p>
<p><strong>2) (3,0 pts)</strong> [Enunciado da questão discursiva]</p>
<p><em>Resposta:</em></p>
<p>_______________________________________________</p>`,
  },
  {
    id: "am-3",
    title: "Avaliação de Recuperação",
    description: "Modelo para prova de recuperação com orientações específicas.",
    category: "Recuperação",
    tags: ["prova", "recuperação"],
    content: `<h1 style="text-align:center">AVALIAÇÃO DE RECUPERAÇÃO</h1>
<p style="text-align:center"><strong>Disciplina:</strong> _________________ &nbsp;&nbsp; <strong>Professor(a):</strong> _________________</p>
<p style="text-align:center"><strong>Aluno(a):</strong> _________________________________ &nbsp;&nbsp; <strong>Turma:</strong> _______ &nbsp;&nbsp; <strong>Data:</strong> ___/___/______</p>
<hr/>
<h2>Orientações</h2>
<ul><li>Esta avaliação contempla os conteúdos do bimestre.</li><li>A nota desta prova substituirá a menor nota obtida.</li><li>Valor total: 10,0 pontos.</li></ul>
<hr/>
<p><strong>1)</strong> [Questão de recuperação]</p><p></p>
<p><strong>2)</strong> [Questão de recuperação]</p>`,
  },
];

const activitySuggestions: TemplateItem[] = [
  {
    id: "as-1",
    title: "Atividade em Grupo — Debate Dirigido",
    description: "Roteiro para debate em sala com divisão de grupos e critérios de avaliação.",
    category: "Colaborativa",
    tags: ["grupo", "debate", "oralidade"],
    content: `<h1 style="text-align:center">ATIVIDADE — DEBATE DIRIGIDO</h1>
<p><strong>Disciplina:</strong> _________________ &nbsp;&nbsp; <strong>Turma:</strong> _______</p>
<hr/>
<h2>Objetivo</h2><p>Desenvolver argumentação, escuta ativa e pensamento crítico.</p>
<h2>Organização</h2>
<ul><li>Dividir a turma em 2 a 4 grupos</li><li>Cada grupo recebe uma posição sobre o tema</li><li>Tempo de preparação: 15 min</li><li>Tempo de debate: 20 min</li></ul>
<h2>Tema do Debate</h2><p>[Inserir tema polêmico ou relevante ao conteúdo]</p>
<h2>Critérios de Avaliação</h2>
<table style="width:100%;border-collapse:collapse">
<thead><tr style="background:#f3f4f6"><th style="border:1px solid #d1d5db;padding:6px">Critério</th><th style="border:1px solid #d1d5db;padding:6px">Peso</th></tr></thead>
<tbody>
<tr><td style="border:1px solid #d1d5db;padding:6px">Clareza dos argumentos</td><td style="border:1px solid #d1d5db;padding:6px">3,0</td></tr>
<tr><td style="border:1px solid #d1d5db;padding:6px">Respeito às opiniões contrárias</td><td style="border:1px solid #d1d5db;padding:6px">2,0</td></tr>
<tr><td style="border:1px solid #d1d5db;padding:6px">Uso de evidências</td><td style="border:1px solid #d1d5db;padding:6px">3,0</td></tr>
<tr><td style="border:1px solid #d1d5db;padding:6px">Participação de todos os membros</td><td style="border:1px solid #d1d5db;padding:6px">2,0</td></tr>
</tbody></table>`,
  },
  {
    id: "as-2",
    title: "Atividade Individual — Pesquisa e Apresentação",
    description: "Roteiro de pesquisa com rubrica de avaliação da apresentação oral.",
    category: "Individual",
    tags: ["pesquisa", "apresentação", "individual"],
    content: `<h1 style="text-align:center">ATIVIDADE — PESQUISA E APRESENTAÇÃO</h1>
<p><strong>Disciplina:</strong> _________________ &nbsp;&nbsp; <strong>Turma:</strong> _______</p>
<hr/>
<h2>Orientações</h2>
<ul><li>Escolha um dos temas listados abaixo</li><li>Elabore uma apresentação de 5 a 10 minutos</li><li>Entrega do material de apoio na data da apresentação</li></ul>
<h2>Temas Disponíveis</h2>
<ol><li>[Tema 1]</li><li>[Tema 2]</li><li>[Tema 3]</li><li>[Tema 4]</li></ol>
<h2>Estrutura Esperada</h2>
<ul><li>Introdução ao tema</li><li>Desenvolvimento com dados/exemplos</li><li>Conclusão pessoal</li><li>Referências bibliográficas</li></ul>`,
  },
  {
    id: "as-3",
    title: "Atividade Lúdica — Quiz Interativo",
    description: "Roteiro para quiz gamificado com sistema de pontuação em sala.",
    category: "Gamificação",
    tags: ["quiz", "jogo", "gamificação"],
    content: `<h1 style="text-align:center">ATIVIDADE — QUIZ INTERATIVO</h1>
<p><strong>Disciplina:</strong> _________________ &nbsp;&nbsp; <strong>Turma:</strong> _______</p>
<hr/>
<h2>Dinâmica</h2>
<ul><li>Dividir a turma em equipes de 4-5 alunos</li><li>O professor faz perguntas sobre o conteúdo estudado</li><li>Cada equipe tem 30 segundos para responder</li><li>Resposta correta = 10 pontos</li><li>Resposta parcial = 5 pontos</li></ul>
<h2>Perguntas</h2>
<p><strong>Rodada 1 — Fácil (5 pts cada):</strong></p>
<ol><li>[Pergunta fácil 1]</li><li>[Pergunta fácil 2]</li></ol>
<p><strong>Rodada 2 — Média (10 pts cada):</strong></p>
<ol><li>[Pergunta média 1]</li><li>[Pergunta média 2]</li></ol>
<p><strong>Rodada 3 — Difícil (15 pts cada):</strong></p>
<ol><li>[Pergunta difícil 1]</li><li>[Pergunta difícil 2]</li></ol>
<h2>Placar</h2>
<table style="width:100%;border-collapse:collapse">
<thead><tr style="background:#f3f4f6"><th style="border:1px solid #d1d5db;padding:6px">Equipe</th><th style="border:1px solid #d1d5db;padding:6px">Pontuação</th></tr></thead>
<tbody>
<tr><td style="border:1px solid #d1d5db;padding:6px">Equipe A</td><td style="border:1px solid #d1d5db;padding:6px"></td></tr>
<tr><td style="border:1px solid #d1d5db;padding:6px">Equipe B</td><td style="border:1px solid #d1d5db;padding:6px"></td></tr>
<tr><td style="border:1px solid #d1d5db;padding:6px">Equipe C</td><td style="border:1px solid #d1d5db;padding:6px"></td></tr>
</tbody></table>`,
  },
];

// ─── Helpers ───

function printTemplate(title: string, content: string) {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${title}</title><style>
    @page { size: A4; margin: 15mm 25mm 20mm 25mm; }
    @media print { body { margin: 0; padding: 0; } }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 10mm 0; }
    h1, h2, h3 { color: #2c3e50; }
    table { width: 100%; border-collapse: collapse; margin: 2mm 0; }
    th, td { border: 1px solid #d1d5db; padding: 1.5mm 3mm; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    hr { border: none; border-top: 1px solid #d1d5db; margin: 4mm 0; }
    ul, ol { padding-left: 6mm; }
  </style></head><body>${content}</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => setTimeout(() => w.print(), 500);
}

const categoryOptions = ["Geral", "Planejamento", "Avaliação", "Atividade", "Outro"];

// ─── Main Component ───

export default function ProfessorTemplatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<TemplateItem | null>(null);

  // Headers from coordinator
  const [headers, setHeaders] = useState<{ id: string; name: string; segment: string | null; grade: string | null; file_url: string; created_at: string }[]>([]);
  const [headersLoading, setHeadersLoading] = useState(true);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);

  // Custom templates
  const [customTemplates, setCustomTemplates] = useState<{ id: string; title: string; description: string | null; category: string; content: string; created_at: string }[]>([]);
  const [customLoading, setCustomLoading] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<typeof customTemplates[0] | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Geral");
  const [formContent, setFormContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("template_headers").select("id, name, segment, grade, file_url, created_at").order("created_at", { ascending: false })
      .then(({ data }) => { setHeaders(data || []); setHeadersLoading(false); });
  }, []);

  const fetchCustom = () => {
    if (!user) return;
    supabase.from("professor_templates").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setCustomTemplates(data || []); setCustomLoading(false); });
  };

  useEffect(() => { fetchCustom(); }, [user]);

  const filterItems = (items: TemplateItem[]) => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.includes(q))
    );
  };

  const handleUseInEditor = (item: TemplateItem) => {
    sessionStorage.setItem("template-content", item.content);
    navigate("/provas/editor");
  };

  const openNewCustom = () => {
    setEditingTemplate(null);
    setFormTitle(""); setFormDescription(""); setFormCategory("Geral"); setFormContent("");
    setSaveDialogOpen(true);
  };

  const openEditCustom = (t: typeof customTemplates[0]) => {
    setEditingTemplate(t);
    setFormTitle(t.title);
    setFormDescription(t.description || "");
    setFormCategory(t.category);
    setFormContent(t.content);
    setSaveDialogOpen(true);
  };

  const handleSaveCustom = async () => {
    if (!formTitle.trim()) { showInvokeError("Informe o título."); return; }
    if (!formContent.trim()) { showInvokeError("Informe o conteúdo do modelo."); return; }
    if (!user) return;

    setSaving(true);
    if (editingTemplate) {
      const { error } = await supabase.from("professor_templates").update({
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        category: formCategory,
        content: formContent,
      }).eq("id", editingTemplate.id);
      if (error) showInvokeError("Erro ao atualizar.");
      else { showInvokeSuccess("Modelo atualizado!"); setSaveDialogOpen(false); fetchCustom(); }
    } else {
      const { error } = await supabase.from("professor_templates").insert({
        user_id: user.id,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        category: formCategory,
        content: formContent,
      });
      if (error) showInvokeError("Erro ao salvar.");
      else { showInvokeSuccess("Modelo salvo!"); setSaveDialogOpen(false); fetchCustom(); }
    }
    setSaving(false);
  };

  const handleDeleteCustom = async () => {
    if (!deletingId) return;
    await supabase.from("professor_templates").delete().eq("id", deletingId);
    showInvokeSuccess("Modelo excluído.");
    setDeleteOpen(false); setDeletingId(null); fetchCustom();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Modelos para Professor
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Planejamentos, avaliações, atividades, cabeçalhos e seus modelos personalizados
          </p>
        </div>
        <Button onClick={openNewCustom} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Criar Modelo
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar modelo por nome ou tag..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="planejamentos" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="planejamentos" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Planejamentos
          </TabsTrigger>
          <TabsTrigger value="avaliacoes" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Avaliações
          </TabsTrigger>
          <TabsTrigger value="atividades" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Atividades
          </TabsTrigger>
          <TabsTrigger value="cabecalhos" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Cabeçalhos
          </TabsTrigger>
          <TabsTrigger value="meus-modelos" className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Meus Modelos
            {customTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{customTemplates.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planejamentos">
          <TemplateGrid items={filterItems(lessonPlans)} onPreview={setPreview} onUse={handleUseInEditor} icon={Calendar} />
        </TabsContent>
        <TabsContent value="avaliacoes">
          <TemplateGrid items={filterItems(assessmentModels)} onPreview={setPreview} onUse={handleUseInEditor} icon={ClipboardList} />
        </TabsContent>
        <TabsContent value="atividades">
          <TemplateGrid items={filterItems(activitySuggestions)} onPreview={setPreview} onUse={handleUseInEditor} icon={Lightbulb} />
        </TabsContent>

        {/* Headers Tab */}
        <TabsContent value="cabecalhos">
          <p className="text-sm text-muted-foreground mb-4">{headers.length} cabeçalho(s) disponível(is)</p>
          {headersLoading ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">Carregando...</div>
          ) : headers.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
              Nenhum cabeçalho cadastrado pela coordenação.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {headers.map((h) => (
                <div key={h.id} className="rounded-lg border border-border bg-card overflow-hidden group hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="aspect-[3/1] bg-muted relative cursor-pointer" onClick={() => setHeaderPreview(h.file_url)}>
                    <img src={h.file_url} alt={h.name} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Eye className="h-6 w-6 text-background" />
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-medium text-foreground text-sm truncate">{h.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {h.segment && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{h.segment}</Badge>}
                      {h.grade && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{h.grade}</Badge>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Custom Templates Tab */}
        <TabsContent value="meus-modelos">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{customTemplates.length} modelo(s) salvo(s)</p>
            <Button size="sm" onClick={openNewCustom} className="gap-1.5"><Plus className="h-4 w-4" />Novo Modelo</Button>
          </div>
          {customLoading ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">Carregando...</div>
          ) : customTemplates.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground space-y-2">
              <Save className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p>Você ainda não tem modelos salvos.</p>
              <p className="text-xs">Crie seu próprio modelo para reutilizar em avaliações futuras.</p>
              <Button size="sm" onClick={openNewCustom} className="gap-1.5 mt-2"><Plus className="h-4 w-4" />Criar Modelo</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customTemplates.map((t) => (
                <div key={t.id} className="rounded-lg border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all group">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <Save className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground leading-tight">{t.title}</h3>
                      {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t.category}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1 text-xs flex-1" onClick={() => {
                      setPreview({ id: t.id, title: t.title, description: t.description || "", category: t.category, tags: [t.category], content: t.content });
                    }}>
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                    <Button size="sm" className="gap-1 text-xs flex-1" onClick={() => {
                      sessionStorage.setItem("template-content", t.content);
                      navigate("/provas/editor");
                    }}>
                      <PenTool className="h-3.5 w-3.5" />
                      Usar
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCustom(t)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingId(t.id); setDeleteOpen(true); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {preview?.title}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              <div className="prose prose-sm max-w-none border border-border rounded-lg p-4 bg-card" dangerouslySetInnerHTML={{ __html: preview.content }} />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => printTemplate(preview.title, preview.content)}>
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => { handleUseInEditor(preview); setPreview(null); }}>
                  <PenTool className="h-4 w-4" />
                  Usar no Editor
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Header Preview Dialog */}
      <Dialog open={!!headerPreview} onOpenChange={(open) => !open && setHeaderPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Visualização do Cabeçalho</DialogTitle></DialogHeader>
          {headerPreview && <img src={headerPreview} alt="Cabeçalho" className="w-full rounded-lg border border-border" />}
        </DialogContent>
      </Dialog>

      {/* Save/Edit Custom Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" />
              {editingTemplate ? "Editar Modelo" : "Criar Modelo Personalizado"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Atualize os dados do seu modelo." : "Crie um modelo para reutilizar em avaliações futuras."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Prova Bimestral de Matemática" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Breve descrição do modelo" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Conteúdo HTML *</Label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Cole aqui o HTML do seu modelo..."
                className="min-h-[150px] font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Dica: Crie a avaliação no editor, copie o conteúdo e cole aqui.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCustom} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este modelo personalizado? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustom} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Template Grid ───

function TemplateGrid({
  items,
  onPreview,
  onUse,
  icon: Icon,
}: {
  items: TemplateItem[];
  onPreview: (item: TemplateItem) => void;
  onUse: (item: TemplateItem) => void;
  icon: React.ElementType;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
        Nenhum modelo encontrado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all group">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground leading-tight">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.category}</Badge>
            {item.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => onPreview(item)}>
              <Eye className="h-3.5 w-3.5" />
              Visualizar
            </Button>
            <Button size="sm" className="gap-1.5 text-xs flex-1" onClick={() => onUse(item)}>
              <PenTool className="h-3.5 w-3.5" />
              Usar no Editor
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
