import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CalendarClock, Loader2, CheckCircle2, Building2 } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Invoice {
  id: string;
  company_id: string;
  amount: number;
  due_date: string;
  status: string;
  reference_month: string;
}

interface Company { id: string; name: string; }

export default function DueAlertsSection() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invRes, compRes] = await Promise.all([
      supabase.from("invoices").select("id, company_id, amount, due_date, status, reference_month").in("status", ["pending", "overdue"]).order("due_date"),
      supabase.from("companies").select("id, name").eq("active", true),
    ]);
    setInvoices((invRes.data || []) as Invoice[]);
    setCompanies((compRes.data || []) as Company[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c.name])), [companies]);
  const today = new Date();

  const categorized = useMemo(() => {
    const overdue: (Invoice & { days: number })[] = [];
    const dueSoon: (Invoice & { days: number })[] = [];
    const upcoming: (Invoice & { days: number })[] = [];

    invoices.forEach(inv => {
      const due = parseISO(inv.due_date);
      const diff = differenceInDays(due, today);
      const item = { ...inv, days: diff };
      if (diff < 0) overdue.push(item);
      else if (diff <= 7) dueSoon.push(item);
      else upcoming.push(item);
    });

    return { overdue, dueSoon, upcoming };
  }, [invoices, today]);

  const markPaid = async (id: string) => {
    await supabase.from("invoices").update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] }).eq("id", id);
    toast.success("Marcado como pago!");
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const renderList = (items: (Invoice & { days: number })[], emptyMsg: string) => {
    if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">{emptyMsg}</p>;
    return (
      <div className="space-y-2">
        {items.map(inv => (
          <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{companyMap.get(inv.company_id) || "—"}</p>
                <p className="text-xs text-muted-foreground">{inv.reference_month} · R$ {Number(inv.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={inv.days < 0 ? "text-destructive border-destructive/30" : inv.days <= 7 ? "text-yellow-700 border-yellow-300" : "text-muted-foreground"}>
                {inv.days < 0 ? `${Math.abs(inv.days)}d atraso` : inv.days === 0 ? "Hoje" : `${inv.days}d restantes`}
              </Badge>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-green-600" onClick={() => markPaid(inv.id)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Pagar
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Vencidos ({categorized.overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>{renderList(categorized.overdue, "Nenhum vencimento em atraso")}</CardContent>
        </Card>

        <Card className="border-yellow-300/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
              <Clock className="h-4 w-4" />
              Próximos 7 dias ({categorized.dueSoon.length})
            </CardTitle>
          </CardHeader>
          <CardContent>{renderList(categorized.dueSoon, "Nenhum vencimento próximo")}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              Futuros ({categorized.upcoming.length})
            </CardTitle>
          </CardHeader>
          <CardContent>{renderList(categorized.upcoming, "Nenhum vencimento futuro")}</CardContent>
        </Card>
      </div>
    </div>
  );
}
