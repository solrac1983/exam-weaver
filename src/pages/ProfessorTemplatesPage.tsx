import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  FileText,
  Lightbulb,
  ClipboardList,
  Search,
  Download,
  Eye,
  Calendar,
  GraduationCap,
  PenTool,
  X,
  Printer,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Template data ───

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
<p>_______________________________________________</p>
<p></p>
<p><strong>2) (3,0 pts)</strong> [Enunciado da questão discursiva]</p>
<p><em>Resposta:</em></p>
<p>_______________________________________________</p>
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

// ─── Component ───

export default function ProfessorTemplatesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<TemplateItem | null>(null);

  const filterItems = (items: TemplateItem[]) => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q))
    );
  };

  const handleUseInEditor = (item: TemplateItem) => {
    // Save content to sessionStorage so the editor can pick it up
    sessionStorage.setItem("template-content", item.content);
    navigate("/provas/editor");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Modelos para Professor
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Planejamentos de aula, modelos de avaliação e sugestões de atividades prontos para usar
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar modelo por nome ou tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
            Planejamentos de Aula
          </TabsTrigger>
          <TabsTrigger value="avaliacoes" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Modelos de Avaliação
          </TabsTrigger>
          <TabsTrigger value="atividades" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Sugestões de Atividades
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
              <div
                className="prose prose-sm max-w-none border border-border rounded-lg p-4 bg-card"
                dangerouslySetInnerHTML={{ __html: preview.content }}
              />
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
    </div>
  );
}

// ─── Grid ───

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
        <div
          key={item.id}
          className="rounded-lg border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all group"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <Icon className="h-4.5 w-4.5" />
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
