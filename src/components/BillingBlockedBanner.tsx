import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle } from "lucide-react";

export function BillingBlockedBanner() {
  const { billingBlocked, role } = useAuth();

  // Super admins never see the banner
  if (!billingBlocked || role === "super_admin") return null;

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-destructive">Acesso restrito — Pagamento em atraso</p>
        <p className="text-xs text-muted-foreground">
          Sua escola possui faturas vencidas. O acesso ao sistema está em modo somente leitura até a regularização do pagamento.
        </p>
      </div>
    </div>
  );
}

export function useBillingBlocked() {
  const { billingBlocked, role } = useAuth();
  // Super admins are never blocked
  return role !== "super_admin" && billingBlocked;
}
