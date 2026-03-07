import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const statusMap = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-green-500",
    bgClass: "bg-green-500/10",
    title: "Pagamento confirmado!",
    description: "Seu pagamento foi processado com sucesso. A confirmação será registrada automaticamente no sistema.",
  },
  failure: {
    icon: XCircle,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
    title: "Pagamento não realizado",
    description: "Houve um problema ao processar seu pagamento. Por favor, tente novamente ou entre em contato com o suporte.",
  },
  pending: {
    icon: Clock,
    iconClass: "text-yellow-500",
    bgClass: "bg-yellow-500/10",
    title: "Pagamento em processamento",
    description: "Seu pagamento está sendo processado. Assim que for confirmado, atualizaremos automaticamente no sistema.",
  },
};

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const payment = searchParams.get("payment") || "pending";
  const config = statusMap[payment as keyof typeof statusMap] || statusMap.pending;
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full shadow-lg border-border/50">
        <CardContent className="pt-10 pb-8 flex flex-col items-center text-center gap-5">
          <div className={`rounded-full p-5 ${config.bgClass}`}>
            <Icon className={`h-14 w-14 ${config.iconClass}`} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">{config.description}</p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" asChild>
              <Link to="/landing">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao site
              </Link>
            </Button>
            {payment === "failure" && (
              <Button onClick={() => window.history.back()}>
                Tentar novamente
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-4">
            SmartTest • Sistema de Gestão de Provas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
