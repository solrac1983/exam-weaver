import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap, CheckCircle2, Zap, Shield, BarChart3,
  ArrowRight, Star, Users, FileText, Brain, Quote,
} from "lucide-react";

const features = [
  { icon: FileText, title: "Criação Inteligente de Provas", desc: "Editor completo com suporte a fórmulas, imagens, tabelas e formatação profissional." },
  { icon: Users, title: "Gestão de Equipe", desc: "Coordenadores criam demandas, professores elaboram — tudo rastreado e organizado." },
  { icon: Brain, title: "IA Geradora de Questões", desc: "Gere questões automaticamente com inteligência artificial, economizando horas de trabalho." },
  { icon: Shield, title: "Aprovação e Revisão", desc: "Fluxo completo de revisão com comentários, versionamento e aprovação formal." },
  { icon: BarChart3, title: "Relatórios e Métricas", desc: "Acompanhe prazos, produtividade e status de todas as demandas em tempo real." },
  { icon: Zap, title: "Banco de Questões", desc: "Reutilize questões entre provas com filtros por disciplina, dificuldade e tema." },
];

const testimonials = [
  { name: "Ana Beatriz", role: "Coordenadora Pedagógica", school: "Colégio São Paulo", text: "O ProvaFácil transformou completamente nossa gestão de provas. O que levava dias agora leva horas. A equipe toda adora!", rating: 5 },
  { name: "Prof. Ricardo Lima", role: "Professor de Matemática", school: "Escola Moderna", text: "A IA geradora de questões é fantástica! Consigo criar provas variadas em minutos. Meus alunos agradecem a diversidade.", rating: 5 },
  { name: "Dra. Carla Mendonça", role: "Diretora", school: "Instituto Educar", text: "Finalmente temos controle total sobre o processo de avaliação. Os relatórios me dão a visão estratégica que eu precisava.", rating: 5 },
];

const plans = [
  { name: "Gratuito", price: "R$ 0", period: "/mês", features: ["Até 5 usuários", "10 provas/mês", "Banco de questões básico", "Suporte por e-mail"], highlight: false },
  { name: "Profissional", price: "R$ 149", period: "/mês", features: ["Até 50 usuários", "Provas ilimitadas", "IA geradora de questões", "Relatórios avançados", "Suporte prioritário"], highlight: true },
  { name: "Empresarial", price: "R$ 399", period: "/mês", features: ["Usuários ilimitados", "Multi-unidades", "API e integrações", "Gerente de conta dedicado", "SLA garantido"], highlight: false },
];

/* ── Intersection Observer hook for scroll-triggered animations ── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll<HTMLElement>("[data-reveal]");
    targets.forEach((t) => {
      t.style.opacity = "0";
      t.style.transform = "translateY(32px)";
      t.style.transition = "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const delay = Number(target.dataset.revealDelay || 0);
            setTimeout(() => {
              target.style.opacity = "1";
              target.style.transform = "translateY(0)";
            }, delay);
            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function LandingPage() {
  const containerRef = useScrollReveal();

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground">
      {/* ── Header/Nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40 animate-fade-in">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/landing" className="flex items-center gap-2.5 hover-scale">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight font-display">ProvaFácil</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#funcionalidades" className="story-link hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#depoimentos" className="story-link hover:text-foreground transition-colors">Depoimentos</a>
            <a href="#planos" className="story-link hover:text-foreground transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/cadastro">
              <Button size="sm" className="shadow-md shadow-primary/20 hover-scale">Criar conta grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        {/* Floating decorative shapes */}
        <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute bottom-10 right-[10%] w-48 h-48 rounded-full bg-accent/5 blur-3xl animate-[pulse_8s_ease-in-out_infinite_1s]" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6 animate-fade-in"
            style={{ animationDelay: "0.1s", animationFillMode: "both" }}
          >
            <Zap className="h-3.5 w-3.5 animate-[pulse_2s_ease-in-out_infinite]" /> Novo: Gerador de questões com IA
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-display leading-[1.1] mb-6 animate-fade-in"
            style={{ animationDelay: "0.25s", animationFillMode: "both" }}
          >
            Crie, gerencie e aprove provas{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              sem complicação
            </span>
          </h1>
          <p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.4s", animationFillMode: "both" }}
          >
            O ProvaFácil é a plataforma completa para escolas que querem eliminar o caos na criação de avaliações.
            Do pedido à impressão, tudo em um só lugar — com inteligência artificial e fluxos automatizados.
          </p>
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in"
            style={{ animationDelay: "0.55s", animationFillMode: "both" }}
          >
            <Link to="/cadastro">
              <Button size="lg" className="text-base px-8 shadow-xl shadow-primary/25 gap-2 hover-scale">
                Começar gratuitamente <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="#funcionalidades">
              <Button size="lg" variant="outline" className="text-base px-8 hover-scale">
                Ver funcionalidades
              </Button>
            </a>
          </div>
          <p
            className="text-xs text-muted-foreground mt-4 animate-fade-in"
            style={{ animationDelay: "0.7s", animationFillMode: "both" }}
          >
            Sem cartão de crédito · Setup em 2 minutos
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="funcionalidades" className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14" data-reveal>
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-3">Tudo que sua escola precisa</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Ferramentas poderosas para cada etapa do processo de avaliação</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={f.title} data-reveal data-reveal-delay={i * 100}>
                <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/50 bg-card hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="depoimentos" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14" data-reveal>
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-3">O que nossos clientes dizem</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Mais de 200 escolas já transformaram sua gestão de provas</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={t.name} data-reveal data-reveal-delay={i * 120}>
                <Card className="border-border/50 bg-card relative overflow-hidden hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="p-6">
                    <Quote className="h-8 w-8 text-primary/15 absolute top-4 right-4" />
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">"{t.text}"</p>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role} · {t.school}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="planos" className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14" data-reveal>
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-3">Planos para cada escola</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Comece grátis e escale conforme sua necessidade</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((p, i) => (
              <div key={p.name} data-reveal data-reveal-delay={i * 120}>
                <Card className={`border-border/50 bg-card relative hover:-translate-y-1 transition-all duration-300 ${p.highlight ? "ring-2 ring-primary shadow-xl shadow-primary/10" : ""}`}>
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full animate-[pulse_3s_ease-in-out_infinite]">
                      Mais popular
                    </div>
                  )}
                  <CardContent className="p-6 pt-8">
                    <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-extrabold">{p.price}</span>
                      <span className="text-sm text-muted-foreground">{p.period}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {p.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/cadastro">
                      <Button className="w-full hover-scale" variant={p.highlight ? "default" : "outline"}>
                        {p.highlight ? "Começar agora" : "Escolher plano"}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center" data-reveal>
          <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
            Pronto para simplificar suas avaliações?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Junte-se a centenas de escolas que já economizam tempo e garantem qualidade com o ProvaFácil.
          </p>
          <Link to="/cadastro">
            <Button size="lg" className="text-base px-10 shadow-xl shadow-primary/25 gap-2 hover-scale">
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">ProvaFácil</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ProvaFácil. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
