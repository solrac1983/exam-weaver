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

export const ApprovalsPage = () => <PlaceholderPage title="Aprovações" description="Revise e aprove provas pendentes" />;

export const TemplatesPage = () => <PlaceholderPage title="Modelos" description="Gerencie modelos de provas e cabeçalhos" />;
