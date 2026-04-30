import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(
        resetError.message.toLowerCase().includes("rate")
          ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
          : "Não foi possível enviar o e-mail. Verifique o endereço e tente novamente."
      );
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-xl border-border/50 text-center">
          <CardHeader className="space-y-4 pb-4">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl">Verifique seu e-mail</CardTitle>
              <CardDescription className="text-[15px] leading-relaxed">
                Se existir uma conta para <strong className="text-foreground">{email}</strong>,
                enviamos um link para redefinir sua senha.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Não recebeu? Verifique a caixa de spam ou tente novamente em alguns minutos.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Enviar para outro e-mail
              </Button>
              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">Esqueceu a senha?</CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              Informe o e-mail cadastrado e enviaremos um link seguro para você criar uma nova senha.
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
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar link de recuperação
            </Button>
          </form>
          <Link
            to="/login"
            className="mt-6 flex items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
