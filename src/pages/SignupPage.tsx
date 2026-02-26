import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, CheckCircle2, Moon, Sun, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div>
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
          <Card className="w-full max-w-md shadow-xl border-border/50 text-center">
            <CardHeader className="space-y-3">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-success/15">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <CardTitle className="text-xl">Verifique seu e-mail</CardTitle>
              <CardDescription>
                Enviamos um link de confirmação para <strong>{email}</strong>.
                Clique no link para ativar sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/login">
                <Button variant="outline" className="w-full">Voltar ao login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
          </div>

          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
            <div className="flex items-center gap-3 mb-10">
              <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight font-display">ProvaFácil</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold font-display leading-tight mb-4">
              Comece a criar{" "}
              <span className="text-white/80">provas incríveis agora</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-md mb-10">
              Cadastre-se gratuitamente e tenha acesso a todas as ferramentas para gestão de avaliações.
            </p>

            <div className="space-y-4">
              {[
                "Conta gratuita para começar",
                "Acesso imediato ao editor",
                "Suporte completo da equipe",
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

        {/* Right panel — signup form */}
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
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                  <GraduationCap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold font-display">ProvaFácil</span>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-bold font-display mb-2">Criar conta</h2>
                <p className="text-muted-foreground text-sm">Preencha os dados para se cadastrar</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
                  <Input id="name" placeholder="Seu nome" value={fullName}
                    onChange={(e) => setFullName(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password}
                      onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11 pr-10" />
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
                  Criar conta
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Já tem conta?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Fazer login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
