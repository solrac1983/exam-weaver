import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/invokeFunction";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertTriangle, Building2, TrendingUp, ExternalLink, Loader2 } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

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
  installment_number?: number | null;
  total_installments?: number | null;
  recurring_group_id?: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "A Vencer", color: "bg-yellow-500/10 text-yellow-700 border-yellow-300", icon: Clock },
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
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  const sorted = useMemo(() =>
    [...invoices].sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0) || a.reference_month.localeCompare(b.reference_month)),
    [invoices]
  );

  const generatePaymentLink = async (inv: Invoice) => {
    setGeneratingLink(inv.id);
    const { data, error } = await invokeFunction<{ init_point?: string }>("create-mercadopago-preference", {
      body: {
        invoice_id: inv.id,
        title: `${companyName} - ${inv.reference_month}`,
        description: `Parcela ${inv.installment_number || ""}/${inv.total_installments || ""} - ${inv.reference_month}`,
        amount: Number(inv.amount),
      },
      errorMessage: "Erro ao gerar link de pagamento.",
    });
    setGeneratingLink(null);
    if (error) return;
    const link = data?.init_point;
    if (link) {
      await navigator.clipboard.writeText(link);
      showInvokeSuccess("Link copiado!", {
        description: "Envie para a escola realizar o pagamento.",
        action: { label: "Abrir", onClick: () => window.open(link, "_blank") },
      });
    }
  };

  const totalAmount = sorted.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const paidInvoices = sorted.filter(i => i.status === "paid");
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalPending = totalAmount - totalPaid;
  const totalCount = sorted.length;
  const paidCount = paidInvoices.length;
  const progressPercent = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

  const monthAbbr: Record<string, string> = {
    "01": "jan", "02": "fev", "03": "mar", "04": "abr", "05": "mai", "06": "jun",
    "07": "jul", "08": "ago", "09": "set", "10": "out", "11": "nov", "12": "dez",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {companyName}
          </DialogTitle>
          <DialogDescription>Controle de parcelas recorrentes</DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 py-2">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Carnê</p>
            <p className="text-base font-bold font-mono text-foreground">R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border bg-green-500/5 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pago</p>
            <p className="text-base font-bold font-mono text-green-700">R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border bg-yellow-500/5 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendente</p>
            <p className="text-base font-bold font-mono text-yellow-700">R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border bg-primary/5 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Progresso</p>
            <p className="text-base font-bold text-primary">{paidCount}/{totalCount}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Parcelas pagas</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Installments Table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-semibold text-foreground w-24">Parcela</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-foreground">Mês Ref.</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-foreground">Vencimento</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-foreground">Valor (R$)</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-foreground">Data Pag.</th>
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
                    daysLabel = `${daysUntilDue}d`;
                    daysColor = daysUntilDue <= 7 ? "text-yellow-600" : "text-muted-foreground";
                  }

                  const total = inv.total_installments || totalCount;
                  const num = inv.installment_number || (sorted.indexOf(inv) + 1);
                  const monthParts = inv.reference_month.split("/");
                  const monthLabel = monthAbbr[monthParts[0]] || monthParts[0];
                  const yearShort = monthParts[1]?.slice(2) || "";

                  return (
                    <tr key={inv.id} className={`border-b last:border-0 transition-colors ${inv.status === "paid" ? "bg-green-500/[0.02]" : "hover:bg-muted/30"}`}>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={`text-[10px] font-mono ${inv.status === "paid" ? "bg-green-500/10 text-green-700 border-green-300" : "bg-primary/10 text-primary border-primary/30"}`}>
                          {num}/{total} ({monthLabel}/{yearShort})
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{inv.reference_month}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{format(dueDate, "dd/MM/yyyy")}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">
                        {Number(inv.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-center">
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
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-primary" onClick={() => generatePaymentLink(inv)} disabled={generatingLink === inv.id}>
                              {generatingLink === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ExternalLink className="h-3.5 w-3.5 mr-1" />}
                              Link MP
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-green-600" onClick={() => onMarkPaid(inv)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Pagar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhuma parcela encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
