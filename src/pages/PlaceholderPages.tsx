const PlaceholderPage = ({ title, description }: { title: string; description: string }) => (
  <div className="space-y-6 animate-fade-in">
    <div>
      <h1 className="text-2xl font-bold text-foreground font-display">{title}</h1>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
    <div className="glass-card rounded-lg p-12 text-center">
      <p className="text-muted-foreground">Em desenvolvimento — disponível em breve.</p>
    </div>
  </div>
);

export const ExamsPage = () => <PlaceholderPage title="Provas" description="Gerencie e visualize provas criadas" />;
export const ApprovalsPage = () => <PlaceholderPage title="Aprovações" description="Revise e aprove provas pendentes" />;
export const TeachersPage = () => <PlaceholderPage title="Professores" description="Cadastro e vínculos de professores" />;
export const ClassGroupsPage = () => <PlaceholderPage title="Turmas" description="Cadastro de turmas e séries" />;
export const ReportsPage = () => <PlaceholderPage title="Relatórios" description="Acompanhe métricas e desempenho" />;
export const TemplatesPage = () => <PlaceholderPage title="Modelos" description="Gerencie modelos de provas e cabeçalhos" />;
