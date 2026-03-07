import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, Moon, Sun, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("login-theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("login-theme", dark ? "dark" : "light");
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [dark]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "E-mail ou senha inválidos."
        : error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div>
      <div className="min-h-screen flex bg-background text-foreground">
        {/* Left panel — illustration */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70">
          {/* Decorative shapes */}
          <div className="absolute inset-0">
            <div className="absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-[15%] right-[10%] w-96 h-96 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white/10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full border border-white/10" />
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
          </div>

          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
            <div className="flex items-center gap-3 mb-10">
              <div className="h-12 w-12 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center border border-white/20 overflow-hidden">
                <img src="/logo.png" alt="SmartTest" className="h-8 w-8 object-contain" />
              </div>
              <span className="text-2xl font-bold tracking-tight font-display">SmartTest</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold font-display leading-tight mb-4">
              Gestão de provas{" "}
              <span className="text-white/80">simplificada e inteligente</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-md mb-10">
              Crie, gerencie e aprove avaliações com inteligência artificial. Tudo em um só lugar.
            </p>

            <div className="space-y-4">
              {[
                "Editor completo com fórmulas e imagens",
                "IA geradora de questões",
                "Fluxo de aprovação automatizado",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/80 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — login form */}
        <div className="w-full lg:w-1/2 flex flex-col">
          {/* Theme toggle */}
          <div className="flex justify-end p-4 sm:p-6">
            <button
              onClick={() => setDark(!dark)}
              className="p-2.5 rounded-xl border border-border/50 bg-card hover:bg-muted transition-colors"
              aria-label="Alternar tema"
            >
              {dark ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center px-6 sm:px-10 pb-10">
            <div className="w-full max-w-sm">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2.5 mb-8">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/25 overflow-hidden">
                  <img src="/logo.png" alt="SmartTest" className="h-7 w-7 object-contain" />
                </div>
                <span className="text-xl font-bold font-display">SmartTest</span>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-bold font-display mb-2">Bem-vindo de volta</h2>
                <p className="text-muted-foreground text-sm">Entre com suas credenciais para acessar o sistema</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                    <Link to="/esqueci-senha" className="text-xs text-primary hover:underline">
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-medium shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Entrar
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Não tem conta?{" "}
                <Link to="/cadastro" className="text-primary font-medium hover:underline">
                  Criar conta
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
