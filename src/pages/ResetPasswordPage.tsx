import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Check, X } from "lucide-react";

const RULES = [
  { id: "len", label: "Mínimo de 8 caracteres", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "Uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { id: "num", label: "Um número", test: (p: string) => /\d/.test(p) },
];

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Confirmação opcional: o usuário precisa digitar o e-mail vinculado à sessão de recuperação
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    // Recovery flow: Supabase coloca tokens no hash e dispara PASSWORD_RECOVERY
    const captureSessionEmail = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) setSessionEmail(data.user.email);
    };

    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setValid(true);
      void captureSessionEmail();
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValid(true);
        void captureSessionEmail();
      }
    });
    // Se nada acontecer em 1s, marca como inválido
    const t = setTimeout(() => setValid((v) => (v === null ? false : v)), 1000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const handleEmailConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    const typed = emailInput.trim().toLowerCase();
    if (!typed) {
      setEmailError("Informe o e-mail para continuar.");
      return;
    }
    if (sessionEmail && typed !== sessionEmail.toLowerCase()) {
      setEmailError("O e-mail informado não corresponde ao link de recuperação.");
      return;
    }
    setEmailConfirmed(true);
  };

  const allRulesOk = RULES.every((r) => r.test(password));
  const matches = password.length > 0 && password === confirm;
  const canSubmit = allRulesOk && matches && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!allRulesOk) {
      setError("A senha não atende a todos os requisitos.");
      return;
    }
    if (!matches) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updErr) {
      const msg = updErr.message.toLowerCase();
      if (msg.includes("pwned") || msg.includes("compromised") || msg.includes("hibp")) {
        setError("Esta senha foi exposta em vazamentos públicos. Escolha uma senha diferente.");
      } else if (msg.includes("same")) {
        setError("A nova senha precisa ser diferente da atual.");
      } else {
        setError("Não foi possível atualizar a senha. Tente novamente.");
      }
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate("/login"), 2200);
  };

  if (valid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-xl border-border/50 text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <div className="space-y-2">
              <CardTitle>Link inválido ou expirado</CardTitle>
              <CardDescription>
                Este link de redefinição não é mais válido. Solicite um novo para continuar.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/esqueci-senha">
              <Button className="w-full">Solicitar novo link</Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="w-full">Voltar ao login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-xl border-border/50 text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle>Senha redefinida</CardTitle>
              <CardDescription>
                Sua senha foi atualizada com sucesso. Redirecionando para o login…
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">Crie sua nova senha</CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              Escolha uma senha forte que você ainda não tenha utilizado.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Nova senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <ul className="space-y-1.5 text-xs">
              {RULES.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.id} className={`flex items-center gap-2 ${ok ? "text-primary" : "text-muted-foreground"}`}>
                    {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {r.label}
                  </li>
                );
              })}
            </ul>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium">Confirme a nova senha</Label>
              <Input
                id="confirm"
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="h-11"
              />
              {confirm.length > 0 && !matches && (
                <p className="text-xs text-destructive">As senhas não coincidem.</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 font-semibold" disabled={!canSubmit}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Redefinir senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
