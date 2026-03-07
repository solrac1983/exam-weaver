import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, CheckCircle2, Zap, Shield, BarChart3,
  ArrowRight, Star, Users, FileText, Brain, Quote, Menu, X,
  Sparkles, ChevronRight, Moon, Sun,
} from "lucide-react";

const features = [
  { icon: FileText, title: "Criação Inteligente de Provas", desc: "Editor completo com suporte a fórmulas, imagens, tabelas e formatação profissional.", color: "from-blue-500/20 to-indigo-500/20" },
  { icon: Users, title: "Gestão de Equipe", desc: "Coordenadores criam demandas, professores elaboram — tudo rastreado e organizado.", color: "from-emerald-500/20 to-teal-500/20" },
  { icon: Brain, title: "IA Geradora de Questões", desc: "Gere questões automaticamente com inteligência artificial, economizando horas de trabalho.", color: "from-violet-500/20 to-purple-500/20" },
  { icon: Shield, title: "Aprovação e Revisão", desc: "Fluxo completo de revisão com comentários, versionamento e aprovação formal.", color: "from-amber-500/20 to-orange-500/20" },
  { icon: BarChart3, title: "Relatórios e Métricas", desc: "Acompanhe prazos, produtividade e status de todas as demandas em tempo real.", color: "from-rose-500/20 to-pink-500/20" },
  { icon: Zap, title: "Banco de Questões", desc: "Reutilize questões entre provas com filtros por disciplina, dificuldade e tema.", color: "from-cyan-500/20 to-sky-500/20" },
];

const testimonials = [
  { name: "Ana Beatriz", role: "Coordenadora Pedagógica", school: "Colégio São Paulo", text: "O SmartTest transformou completamente nossa gestão de provas. O que levava dias agora leva horas. A equipe toda adora!", rating: 5, avatar: "AB" },
  { name: "Prof. Ricardo Lima", role: "Professor de Matemática", school: "Escola Moderna", text: "A IA geradora de questões é fantástica! Consigo criar provas variadas em minutos. Meus alunos agradecem a diversidade.", rating: 5, avatar: "RL" },
  { name: "Dra. Carla Mendonça", role: "Diretora", school: "Instituto Educar", text: "Finalmente temos controle total sobre o processo de avaliação. Os relatórios me dão a visão estratégica que eu precisava.", rating: 5, avatar: "CM" },
];

const plans = [
  { name: "Básico", price: "R$ 199", period: "/mês", features: ["Até 10 usuários", "Provas ilimitadas", "Banco de questões", "Suporte por WhatsApp"], highlight: false, cta: "Escolher plano" },
  { name: "Profissional", price: "R$ 299", period: "/mês", features: ["Até 20 usuários", "Provas ilimitadas", "IA geradora de questões", "Relatórios avançados", "Suporte por WhatsApp"], highlight: false, cta: "Escolher plano" },
  { name: "Premium", price: "R$ 499", period: "/mês", features: ["Até 40 usuários", "Provas ilimitadas", "IA geradora + banco de questões", "Relatórios personalizados", "Simulados com correção automática", "Suporte por WhatsApp"], highlight: true, cta: "Começar agora" },
  { name: "Professor Individual", price: "Sob consulta", period: "", features: ["Plano personalizado", "Funcionalidades sob medida", "Provas ilimitadas", "IA geradora + banco de questões", "Relatórios personalizados", "Simulados com correção automática", "Suporte por WhatsApp"], highlight: false, cta: "Fale pelo WhatsApp" },
];

const stats = [
  { value: "200+", label: "Escolas" },
  { value: "15k+", label: "Provas criadas" },
  { value: "98%", label: "Satisfação" },
  { value: "50%", label: "Menos tempo" },
];

/* ── Intersection Observer hook ── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = el.querySelectorAll<HTMLElement>("[data-reveal]");
    targets.forEach((t) => {
      t.style.opacity = "0";
      t.style.transform = "translateY(24px)";
      t.style.transition = "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)";
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
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function LandingPage() {
  const containerRef = useScrollReveal();
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("landing-theme");
      if (saved) return saved === "dark";
    }
    return true; // default dark
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    localStorage.setItem("landing-theme", dark ? "dark" : "light");
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [dark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Header ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/landing" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow overflow-hidden">
              <img src="/logo.png" alt="SmartTest" className="h-7 w-7 object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight font-display">SmartTest</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            {[
              { href: "#funcionalidades", label: "Funcionalidades" },
              { href: "#depoimentos", label: "Depoimentos" },
              { href: "#planos", label: "Planos" },
            ].map((link) => (
              <a key={link.href} href={link.href} className="relative py-1 hover:text-foreground transition-colors after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-xl border border-border/50 bg-card/80 hover:bg-muted transition-colors"
              aria-label="Alternar tema"
            >
              {dark ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
            </button>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-medium">Entrar</Button>
            </Link>
            <Link to="/cadastro">
              <Button size="sm" className="shadow-lg shadow-primary/20 font-medium gap-1.5">
                Começar agora <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Alternar tema"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/50 animate-fade-in">
            <div className="px-4 py-4 space-y-3">
              <a href="#funcionalidades" className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Funcionalidades</a>
              <a href="#depoimentos" className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Depoimentos</a>
              <a href="#planos" className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Planos</a>
              <div className="pt-2 flex gap-3">
                <Link to="/login" className="flex-1"><Button variant="outline" className="w-full" size="sm">Entrar</Button></Link>
                <Link to="/cadastro" className="flex-1"><Button className="w-full" size="sm">Criar conta</Button></Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 px-4 sm:px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12),transparent_70%)]" />
          <div className="absolute top-40 -left-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-20 -right-20 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-8 animate-fade-in"
            style={{ animationDelay: "0.1s", animationFillMode: "both" }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Novo: Gerador de questões com IA
            <ChevronRight className="h-3 w-3" />
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight font-display leading-[1.05] mb-6 animate-fade-in"
            style={{ animationDelay: "0.2s", animationFillMode: "both" }}
          >
            Crie, gerencie e aprove{" "}
            <br className="hidden sm:block" />
            provas{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                sem complicação
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M1 5.5C40 2 80 2 100 4C120 6 160 3 199 5" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              </svg>
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.35s", animationFillMode: "both" }}
          >
            A plataforma completa para escolas que querem eliminar o caos na criação de avaliações.
            Do pedido à impressão, tudo em um só lugar.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in"
            style={{ animationDelay: "0.5s", animationFillMode: "both" }}
          >
            <Link to="/cadastro">
              <Button size="lg" className="text-base px-8 h-12 shadow-xl shadow-primary/25 gap-2 hover:shadow-primary/35 transition-all hover:-translate-y-0.5">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#funcionalidades">
              <Button size="lg" variant="outline" className="text-base px-8 h-12 hover:-translate-y-0.5 transition-all">
                Ver funcionalidades
              </Button>
            </a>
          </div>

          <p
            className="text-xs text-muted-foreground mt-5 animate-fade-in flex items-center justify-center gap-4"
            style={{ animationDelay: "0.65s", animationFillMode: "both" }}
          >
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Teste por 7 dias grátis</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Setup em 2 minutos</span>
          </p>
        </div>

        {/* Stats bar */}
        <div
          className="max-w-3xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 animate-fade-in"
          style={{ animationDelay: "0.8s", animationFillMode: "both" }}
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold font-display text-foreground">{s.value}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="funcionalidades" className="py-20 sm:py-28 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/40 via-muted/20 to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16" data-reveal>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">Funcionalidades</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-4">Tudo que sua escola precisa</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">Ferramentas poderosas para cada etapa do processo de avaliação</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={f.title} data-reveal data-reveal-delay={i * 80}>
                <div className="group relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 h-full">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 font-display">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="depoimentos" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16" data-reveal>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">Depoimentos</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-4">O que nossos clientes dizem</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">Mais de 200 escolas já transformaram sua gestão de provas</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={t.name} data-reveal data-reveal-delay={i * 100}>
                <div className="relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 hover:border-primary/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                  <Quote className="h-8 w-8 text-primary/10 absolute top-5 right-5" />
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role} · {t.school}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="planos" className="py-20 sm:py-28 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/40 via-muted/20 to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16" data-reveal>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">Planos</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-4">Planos para cada escola</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">Escolha o plano ideal e escale conforme sua necessidade</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((p, i) => (
              <div key={p.name} data-reveal data-reveal-delay={i * 100}>
                <div className={`relative rounded-2xl border bg-card/80 backdrop-blur-sm p-6 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col ${p.highlight ? "border-primary/40 shadow-xl shadow-primary/10 ring-1 ring-primary/20" : "border-border/50 hover:border-primary/20 hover:shadow-lg"}`}>
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-primary/20">
                      Mais popular
                    </div>
                  )}
                  <div className="pt-2">
                    <h3 className="font-bold text-base mb-1 font-display">{p.name}</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-extrabold font-display">{p.price}</span>
                      <span className="text-sm text-muted-foreground">{p.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  {p.name === "Professor Individual" ? (
                    <a href="https://wa.me/5500000000000?text=Olá! Tenho interesse no plano Professor Individual do SmartTest" target="_blank" rel="noopener noreferrer">
                      <Button className="w-full" variant="outline">{p.cta}</Button>
                    </a>
                  ) : (
                    <Link to="/cadastro">
                      <Button
                        className={`w-full transition-all ${p.highlight ? "shadow-lg shadow-primary/20 hover:shadow-primary/30" : ""}`}
                        variant={p.highlight ? "default" : "outline"}
                      >
                        {p.cta}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto" data-reveal>
          <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-10 sm:p-16 text-center overflow-hidden">
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-5">
                Pronto para simplificar suas avaliações?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Junte-se a centenas de escolas que já economizam tempo e garantem qualidade com o SmartTest.
              </p>
              <Link to="/cadastro">
                <Button size="lg" className="text-base px-10 h-12 shadow-xl shadow-primary/25 gap-2 hover:shadow-primary/35 transition-all hover:-translate-y-0.5">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-white flex items-center justify-center overflow-hidden shadow-sm">
              <img src="/logo.png" alt="SmartTest" className="h-5 w-5 object-contain" />
            </div>
            <span className="text-sm font-semibold font-display">SmartTest</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SmartTest. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ── WhatsApp Float ── */}
      <a
        href="https://wa.me/5584996706253?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20SmartTest!"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-[hsl(142,70%,45%)] text-white shadow-lg shadow-[hsl(142,70%,45%)/0.35] hover:scale-110 transition-transform duration-200 animate-fade-in"
        style={{ animationDelay: "1s", animationFillMode: "both" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  );
}
