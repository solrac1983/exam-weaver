import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertTriangle, Building2 } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invoice {
  id: string;
  company_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  payment_method_id: string | null;
  reference_month: string;
  notes: string;
  is_recurring?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-700 border-yellow-300", icon: Clock },
  paid: { label: "Pago", color: "bg-green-500/10 text-green-700 border-green-300", icon: CheckCircle2 },
  overdue: { label: "Vencido", color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  invoices: Invoice[];
  methodMap: Map<string, string>;
  onMarkPaid: (inv: Invoice) => void;
}

export default function CompanyInvoiceDetailDialog({ open, onOpenChange, companyName, invoices, methodMap, onMarkPaid }: Props) {
  const sorted = useMemo(() => 
    [...invoices].sort((a, b) => a.reference_month.localeCompare(b.reference_month)),
    [invoices]
  );

  const totalAmount = sorted.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalPaid = sorted.filter(i => i.status === "paid").reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalPending = totalAmount - totalPaid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {companyName}
          </DialogTitle>
          <DialogDescription>Histórico completo de cobranças recorrentes</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold font-mono text-foreground">R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border bg-green-500/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="text-lg font-bold font-mono text-green-700">R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border bg-yellow-500/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="text-lg font-bold font-mono text-yellow-700">R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Mês Ref.</th>
                <th className="text-right px-4 py-2.5 font-semibold text-foreground">Valor</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Vencimento</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Pago em</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Dias</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Meio</th>
                <th className="text-right px-4 py-2.5 font-semibold text-foreground">Ação</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(inv => {
                const cfg = statusConfig[inv.status] || statusConfig.pending;
                const StatusIcon = cfg.icon;
                const today = new Date();
                const dueDate = parseISO(inv.due_date);
                const daysUntilDue = differenceInDays(dueDate, today);
                
                let daysLabel = "";
                let daysColor = "text-muted-foreground";
                if (inv.status === "paid") {
                  daysLabel = "—";
                } else if (daysUntilDue < 0) {
                  daysLabel = `${Math.abs(daysUntilDue)}d atrasado`;
                  daysColor = "text-destructive font-medium";
                } else if (daysUntilDue === 0) {
                  daysLabel = "Hoje";
                  daysColor = "text-yellow-600 font-medium";
                } else {
                  daysLabel = `${daysUntilDue}d restantes`;
                  daysColor = daysUntilDue <= 7 ? "text-yellow-600" : "text-muted-foreground";
                }

                return (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{inv.reference_month}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">
                      R$ {Number(inv.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{format(dueDate, "dd/MM/yyyy")}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={`gap-1 text-[10px] ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />{cfg.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {inv.paid_date ? format(parseISO(inv.paid_date), "dd/MM/yyyy") : "—"}
                    </td>
                    <td className={`px-4 py-2.5 text-xs ${daysColor}`}>{daysLabel}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{methodMap.get(inv.payment_method_id || "") || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      {inv.status !== "paid" && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-green-600" onClick={() => onMarkPaid(inv)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Pagar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhuma cobrança encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
