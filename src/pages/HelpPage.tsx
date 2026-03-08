import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Search, BookOpen, LayoutDashboard, ClipboardList, NotebookPen, Library, Users,
  BarChart3, FileCheck, Award, CalendarCheck, MessageCircle, Crown, DollarSign,
  TrendingUp, GraduationCap, FileText, Lightbulb, ChevronRight, Sparkles,
  HelpCircle, BookMarked, Layers,
} from "lucide-react";
import { HelpChatbot } from "@/components/help/HelpChatbot";

interface GuideStep {
  step: number;
  title: string;
  description: string;
  tip?: string;
}

interface FeatureGuide {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  steps: GuideStep[];
  proTips: string[];
  roles: string[];
}

const allGuides: FeatureGuide[] = [
  {
    id: "dashboard",
    title: "Painel Principal",
    icon: LayoutDashboard,
    description: "Visão geral das atividades e métricas da sua instituição.",
    roles: ["super_admin", "admin", "professor"],
    steps: [
      { step: 1, title: "Acesse o painel", description: "Clique em 'Painel' no menu lateral para ver o resumo das atividades." },
      { step: 2, title: "Analise os KPIs", description: "Os cards superiores mostram métricas importantes: demandas pendentes, simulados ativos e questões no banco." },
      { step: 3, title: "Acompanhe o timeline", description: "O gráfico de atividades mostra a evolução ao longo do tempo." },
      { step: 4, title: "Ações rápidas", description: "Use os botões de acesso rápido para navegar diretamente para as funcionalidades mais usadas." },
    ],
    proTips: [
      "O painel atualiza automaticamente a cada 30 segundos.",
      "Clique nos cards de KPI para navegar diretamente à seção correspondente.",
    ],
  },
  {
    id: "demands",
    title: "Avaliações / Demandas",
    icon: ClipboardList,
    description: "Crie, acompanhe e gerencie demandas de provas para professores.",
    roles: ["admin", "professor"],
    steps: [
      { step: 1, title: "Criar nova demanda", description: "Clique em 'Nova Demanda', selecione disciplina, professor, turmas e prazo." },
      { step: 2, title: "Acompanhar status", description: "Veja o status de cada demanda: Pendente, Em Elaboração, Em Revisão, Aprovada.", tip: "Use filtros para encontrar demandas específicas." },
      { step: 3, title: "Editar prova", description: "Clique na demanda para abrir o editor de provas completo com formatação avançada." },
      { step: 4, title: "Revisar e aprovar", description: "Coordenadores podem adicionar comentários e aprovar ou solicitar alterações." },
    ],
    proTips: [
      "Professores recebem notificações quando uma nova demanda é atribuída.",
      "O editor de provas suporta fórmulas matemáticas (LaTeX), tabelas e imagens.",
      "Use os comentários para comunicar revisões sem sair do sistema.",
    ],
  },
  {
    id: "simulados",
    title: "Simulados",
    icon: NotebookPen,
    description: "Monte simulados multidisciplinares, corrija automaticamente e acompanhe resultados.",
    roles: ["admin", "professor"],
    steps: [
      { step: 1, title: "Criar simulado", description: "Defina título, turmas, data de aplicação e adicione as disciplinas com suas questões." },
      { step: 2, title: "Atribuir professores", description: "Cada disciplina pode ser atribuída a um professor específico para elaboração." },
      { step: 3, title: "Definir gabarito", description: "Configure o gabarito oficial para correção automática." },
      { step: 4, title: "Corrigir folhas", description: "Use a correção por lote: digitalize as folhas de resposta e o sistema corrige automaticamente via IA.", tip: "A IA reconhece marcações mesmo em folhas levemente tortas." },
      { step: 5, title: "Analisar resultados", description: "Veja estatísticas por turma, disciplina e questão individual." },
    ],
    proTips: [
      "Gere folhas de resposta padronizadas diretamente pelo sistema.",
      "A correção por IA é muito mais rápida que a manual — processe centenas de folhas em minutos.",
      "Exporte os resultados para planilha para análises externas.",
    ],
  },
  {
    id: "question-bank",
    title: "Banco de Questões",
    icon: Library,
    description: "Armazene, organize e reutilize questões categorizadas por disciplina, série e dificuldade.",
    roles: ["admin", "professor"],
    steps: [
      { step: 1, title: "Adicionar questão", description: "Clique em 'Nova Questão' e preencha conteúdo, disciplina, série, tópico e nível de dificuldade." },
      { step: 2, title: "Usar filtros", description: "Filtre por disciplina, dificuldade, bimestre ou tags para encontrar questões rapidamente." },
      { step: 3, title: "Gerar com IA", description: "Use o Assistente de IA para gerar questões a partir de texto, PDF ou imagens.", tip: "A IA preserva fórmulas, tabelas e gráficos do material original." },
      { step: 4, title: "Reutilizar em provas", description: "Questões do banco podem ser inseridas diretamente no editor de provas." },
    ],
    proTips: [
      "Use tags para organizar questões por tema específico (ex: trigonometria, genética).",
      "A IA pode gerar até 50 questões por vez baseadas em um material de referência.",
      "Questões geradas passam por revisão antes de serem salvas definitivamente.",
    ],
  },
  {
    id: "ai-generator",
    title: "Assistente de IA",
    icon: Sparkles,
    description: "Geração inteligente de questões usando IA avançada com Taxonomia de Bloom.",
    roles: ["admin", "professor"],
    steps: [
      { step: 1, title: "Escolha o material", description: "Cole texto, faça upload de PDF ou envie imagens como base para as questões." },
      { step: 2, title: "Configure os parâmetros", description: "Defina disciplina, série, quantidade, tipo (objetiva/dissertativa) e nível de dificuldade." },
      { step: 3, title: "Instruções opcionais", description: "Adicione instruções como 'focar em trigonometria' para direcionar o conteúdo gerado.", tip: "Quanto mais específica a instrução, melhores os resultados." },
      { step: 4, title: "Revise e exporte", description: "Edite as questões geradas no editor dinâmico e exporte para PDF ou salve no banco." },
    ],
    proTips: [
      "Envie imagens de livros didáticos — a IA reproduz fielmente gráficos e tabelas.",
      "Use a Taxonomia de Bloom para variar os níveis cognitivos das questões.",
      "Exporte com diferentes layouts: 1 ou 2 colunas, com ou sem gabarito.",
    ],
  },
  {
    id: "grades",
    title: "Notas",
    icon: Award,
    description: "Registre e gerencie notas por bimestre, turma e disciplina.",
    roles: ["admin", "professor", "super_admin"],
    steps: [
      { step: 1, title: "Selecionar turma", description: "Escolha a turma e o bimestre para visualizar a lista de alunos." },
      { step: 2, title: "Lançar notas", description: "Digite as notas diretamente na tabela. Pressione Enter para avançar para o próximo aluno." },
      { step: 3, title: "Notas de simulado", description: "Notas de simulados são importadas automaticamente após correção." },
      { step: 4, title: "Exportar", description: "Exporte o boletim da turma para planilha ou PDF." },
    ],
    proTips: [
      "Notas de simulados são lançadas automaticamente — não precisa digitar.",
      "Use o campo de observações para registrar informações sobre o desempenho individual.",
    ],
  },
  {
    id: "attendance",
    title: "Frequência",
    icon: CalendarCheck,
    description: "Controle de presença diário com relatórios por período.",
    roles: ["admin", "professor", "super_admin"],
    steps: [
      { step: 1, title: "Selecionar data e turma", description: "Escolha a data e turma para fazer a chamada." },
      { step: 2, title: "Marcar presenças", description: "Clique no status de cada aluno: Presente, Ausente ou Justificado." },
      { step: 3, title: "Adicionar observações", description: "Use o campo de notas para registrar motivos de falta." },
    ],
    proTips: [
      "A frequência pode ser filtrada por disciplina para aulas específicas.",
      "Relatórios de frequência estão disponíveis na seção de Desempenho.",
    ],
  },
  {
    id: "chat",
    title: "Chat",
    icon: MessageCircle,
    description: "Comunicação interna com mensagens, grupos e transcrição de áudio.",
    roles: ["admin", "professor"],
    steps: [
      { step: 1, title: "Iniciar conversa", description: "Clique em um contato ou crie um novo grupo para iniciar uma conversa." },
      { step: 2, title: "Enviar mensagens", description: "Digite mensagens, envie arquivos ou grave áudios diretamente." },
      { step: 3, title: "Transcrever áudio", description: "Clique no ícone de transcrição no player de áudio para converter voz em texto via IA.", tip: "Útil para ler mensagens de voz rapidamente." },
      { step: 4, title: "Buscar mensagens", description: "Use a busca interna para encontrar mensagens antigas com destaque visual." },
    ],
    proTips: [
      "Mensagens podem ser editadas e encaminhadas.",
      "No mobile, use toque longo para acessar o menu de ações.",
      "Notificações sonoras e visuais avisam sobre novas mensagens em tempo real.",
    ],
  },
  {
    id: "cadastros",
    title: "Cadastros",
    icon: Users,
    description: "Gerencie turmas, professores, alunos, disciplinas e segmentos.",
    roles: ["admin", "super_admin"],
    steps: [
      { step: 1, title: "Navegar entre abas", description: "Use as abas para alternar entre Turmas, Professores, Alunos, Disciplinas e outros cadastros." },
      { step: 2, title: "Adicionar registros", description: "Clique em 'Novo' para adicionar um registro em qualquer categoria." },
      { step: 3, title: "Importar alunos", description: "Use a importação em lote via planilha para cadastrar muitos alunos de uma vez.", tip: "Baixe o modelo de planilha para garantir o formato correto." },
      { step: 4, title: "Editar e excluir", description: "Use os botões de ação em cada linha para editar ou remover registros." },
    ],
    proTips: [
      "Professores precisam ter email cadastrado para acessar o sistema.",
      "Turmas podem ser associadas a segmentos, séries e turnos para melhor organização.",
    ],
  },
  {
    id: "reports",
    title: "Relatórios",
    icon: BarChart3,
    description: "Relatórios detalhados de desempenho, frequência e atividades.",
    roles: ["admin", "super_admin"],
    steps: [
      { step: 1, title: "Selecionar tipo", description: "Escolha entre relatórios de visão geral, notas, frequência, professores e disciplinas." },
      { step: 2, title: "Aplicar filtros", description: "Filtre por turma, período, disciplina ou professor." },
      { step: 3, title: "Analisar gráficos", description: "Visualize os dados em gráficos interativos de barras, linhas e pizza." },
      { step: 4, title: "Exportar", description: "Exporte relatórios para PDF ou planilha." },
    ],
    proTips: [
      "O relatório de timeline mostra a evolução cronológica das atividades.",
      "Compare desempenho entre turmas usando o relatório de visão geral.",
    ],
  },
  {
    id: "performance",
    title: "Desempenho",
    icon: TrendingUp,
    description: "Dashboard de desempenho com KPIs, curva de aprendizado e ranking de turmas.",
    roles: ["admin", "super_admin"],
    steps: [
      { step: 1, title: "Visão geral", description: "Veja os KPIs de desempenho: média geral, taxa de aprovação, frequência média." },
      { step: 2, title: "Curva de aprendizado", description: "Analise a evolução do desempenho ao longo dos bimestres." },
      { step: 3, title: "Ranking de turmas", description: "Compare o desempenho entre todas as turmas da escola." },
      { step: 4, title: "Perfil individual", description: "Clique em um aluno para ver seu diagnóstico completo gerado por IA." },
    ],
    proTips: [
      "O diagnóstico por IA identifica pontos fortes e fracos do aluno automaticamente.",
      "Exporte diagnósticos em lote para reuniões pedagógicas.",
    ],
  },
  {
    id: "templates",
    title: "Modelos",
    icon: BookOpen,
    description: "Gerencie cabeçalhos e documentos modelo para padronizar provas.",
    roles: ["admin"],
    steps: [
      { step: 1, title: "Upload de cabeçalho", description: "Faça upload de imagens de cabeçalho da escola para usar nas provas." },
      { step: 2, title: "Documentos modelo", description: "Carregue documentos base que professores podem usar como referência." },
      { step: 3, title: "Organizar por segmento", description: "Associe modelos a segmentos e séries específicas." },
    ],
    proTips: [
      "Cabeçalhos são aplicados automaticamente no editor de provas.",
      "Professores têm acesso aos modelos da escola na seção 'Modelos' do menu.",
    ],
  },
  {
    id: "super-admin",
    title: "Super Admin",
    icon: Crown,
    description: "Gerenciamento de escolas, usuários e monitoramento do sistema.",
    roles: ["super_admin"],
    steps: [
      { step: 1, title: "Gerenciar escolas", description: "Adicione, edite e monitore todas as escolas cadastradas no sistema." },
      { step: 2, title: "Gerenciar usuários", description: "Crie, edite e altere senhas e papéis de qualquer usuário." },
      { step: 3, title: "Monitorar IA", description: "Acesse a aba 'IA & Tokens' para monitorar consumo e configurar provedores de IA." },
      { step: 4, title: "Alertas de uso", description: "Configure alertas automáticos quando o consumo de tokens atingir limites definidos." },
    ],
    proTips: [
      "Administradores e professores devem sempre ser vinculados a uma escola.",
      "Use os gráficos de tokens para identificar padrões de consumo e otimizar custos.",
    ],
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: DollarSign,
    description: "Controle financeiro com faturas, formas de pagamento e alertas de vencimento.",
    roles: ["super_admin"],
    steps: [
      { step: 1, title: "Visão financeira", description: "Veja o resumo de receitas, faturas pendentes e vencidas." },
      { step: 2, title: "Gerar faturas", description: "Crie faturas individuais ou em lote para as escolas." },
      { step: 3, title: "Formas de pagamento", description: "Configure métodos de pagamento aceitos (PIX, boleto, cartão)." },
      { step: 4, title: "Bloqueio automático", description: "Escolas com faturas vencidas são bloqueadas automaticamente." },
    ],
    proTips: [
      "Faturas recorrentes são geradas automaticamente todo mês.",
      "O sistema envia alertas antes do vencimento para evitar bloqueios.",
    ],
  },
  {
    id: "minhas-turmas",
    title: "Minhas Turmas",
    icon: GraduationCap,
    description: "Visão consolidada das turmas e alunos atribuídos ao professor.",
    roles: ["professor"],
    steps: [
      { step: 1, title: "Ver turmas", description: "Visualize todas as turmas e disciplinas atribuídas a você." },
      { step: 2, title: "Acessar alunos", description: "Clique em uma turma para ver a lista de alunos e seus dados." },
      { step: 3, title: "Perfil do aluno", description: "Acesse o perfil individual para ver notas, frequência e diagnóstico." },
    ],
    proTips: [
      "A página é filtrada automaticamente com base no seu cadastro de professor.",
    ],
  },
  {
    id: "exam-editor",
    title: "Editor de Provas",
    icon: FileText,
    description: "Editor avançado estilo Word com ribbon, formatação completa e recursos especiais.",
    roles: ["admin", "professor"],
    steps: [
      { step: 1, title: "Abrir o editor", description: "Acesse o editor a partir de uma demanda ou simulado." },
      { step: 2, title: "Usar o ribbon", description: "O ribbon organiza ferramentas em abas: Página Inicial, Inserir, Layout e Exibição." },
      { step: 3, title: "Inserir elementos", description: "Insira separadores, numeração automática, fórmulas matemáticas, páginas em branco e muito mais." },
      { step: 4, title: "Estilos rápidos", description: "Use os estilos (Normal, Títulos, Citação, Destaque) para padronizar a formatação.", tip: "Atalhos de teclado funcionam: Ctrl+B, Ctrl+I, Ctrl+U." },
      { step: 5, title: "Exportar", description: "Exporte a prova finalizada para PDF ou DOCX." },
    ],
    proTips: [
      "O editor suporta cabeçalho e rodapé personalizados.",
      "Fórmulas matemáticas usam a sintaxe LaTeX entre $ (inline) ou $$ (bloco).",
      "Use a análise de texto para verificar legibilidade e complexidade da prova.",
    ],
  },
];

const faqItems = [
  { q: "Como recuperar minha senha?", a: "Na tela de login, clique em 'Esqueci minha senha'. Você receberá um email com link para redefinição." },
  { q: "Como alterar meu avatar?", a: "Acesse seu Perfil clicando no seu nome no menu lateral, depois clique na imagem de perfil para alterar." },
  { q: "Posso usar o sistema no celular?", a: "Sim! O SmartTest é totalmente responsivo. Use o menu hambúrguer no canto superior esquerdo para navegar." },
  { q: "Como a IA gera questões?", a: "A IA analisa o material fornecido (texto, PDF ou imagem) e gera questões seguindo a Taxonomia de Bloom, preservando fórmulas e elementos visuais." },
  { q: "Posso importar alunos de uma planilha?", a: "Sim! Em Cadastros > Alunos, clique em 'Importar' e faça upload de um arquivo Excel seguindo o modelo disponível." },
  { q: "Como funciona a correção automática de simulados?", a: "Digitalize as folhas de resposta e faça upload no sistema. A IA lê as marcações e compara com o gabarito automaticamente." },
  { q: "O que acontece quando uma escola é bloqueada?", a: "Quando há faturas vencidas, o acesso da escola fica restrito. As informações são preservadas e o acesso é restaurado após regularização." },
];

export default function HelpPage() {
  const { role } = useAuth();
  const userRole = role || "professor";
  const [search, setSearch] = useState("");
  const [showChat, setShowChat] = useState(false);

  const roleGuides = useMemo(() => {
    return allGuides
      .filter((g) => g.roles.includes(userRole))
      .filter((g) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          g.title.toLowerCase().includes(s) ||
          g.description.toLowerCase().includes(s) ||
          g.steps.some((st) => st.title.toLowerCase().includes(s) || st.description.toLowerCase().includes(s)) ||
          g.proTips.some((t) => t.toLowerCase().includes(s))
        );
      });
  }, [userRole, search]);

  const filteredFaq = useMemo(() => {
    if (!search) return faqItems;
    const s = search.toLowerCase();
    return faqItems.filter((f) => f.q.toLowerCase().includes(s) || f.a.toLowerCase().includes(s));
  }, [search]);

  const roleLabel: Record<string, string> = {
    super_admin: "Super Administrador",
    admin: "Coordenador / Administrador",
    professor: "Professor",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookMarked className="h-7 w-7 text-primary" />
            Central de Ajuda
          </h1>
          <p className="text-muted-foreground mt-1">
            Guias personalizados para <Badge variant="secondary">{roleLabel[userRole]}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar na ajuda..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowChat(!showChat)} variant={showChat ? "default" : "outline"} className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Pergunte à IA</span>
          </Button>
        </div>
      </div>

      {/* AI Chat */}
      {showChat && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <HelpChatbot />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="guides" className="w-full">
        <TabsList>
          <TabsTrigger value="guides" className="gap-1.5">
            <Layers className="h-4 w-4" />
            Guias
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5">
            <HelpCircle className="h-4 w-4" />
            Perguntas Frequentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="mt-4">
          {roleGuides.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum guia encontrado para "{search}".
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {roleGuides.map((guide) => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Perguntas Frequentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple">
                {filteredFaq.map((item, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`}>
                    <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {filteredFaq.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhuma pergunta encontrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GuideCard({ guide }: { guide: FeatureGuide }) {
  const Icon = guide.icon;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <Accordion type="single" collapsible>
        <AccordionItem value={guide.id} className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3 text-left">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{guide.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{guide.description}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            {/* Steps */}
            <div className="space-y-3 mb-4">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Passo a passo</h4>
              {guide.steps.map((s) => (
                <div key={s.step} className="flex gap-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                    {s.tip && (
                      <div className="flex items-start gap-1.5 mt-1 text-xs text-primary">
                        <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{s.tip}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pro tips */}
            {guide.proTips.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Dicas Pro
                </h4>
                {guide.proTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <ChevronRight className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
