import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle, Building2, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface Invoice {
  id: string;
  company_id: string;
  amount: number;
  status: string;
  reference_month: string;
}

interface Company { id: string; name: string; plan: string; }

const COLORS = ["hsl(142,71%,45%)", "hsl(48,96%,53%)", "hsl(0,84%,60%)", "hsl(217,91%,60%)"];

export default function FinancialOverview() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invRes, compRes] = await Promise.all([
      supabase.from("invoices").select("id, company_id, amount, status, reference_month"),
      supabase.from("companies").select("id, name, plan").eq("active", true).order("name"),
    ]);
    setInvoices((invRes.data || []) as Invoice[]);
    setCompanies((compRes.data || []) as Company[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
    const pending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + Number(i.amount), 0);
    const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + Number(i.amount), 0);
    return { total, paid, pending, overdue };
  }, [invoices]);

  const statusChart = useMemo(() => [
    { name: "Pago", value: invoices.filter(i => i.status === "paid").length },
    { name: "Pendente", value: invoices.filter(i => i.status === "pending").length },
    { name: "Vencido", value: invoices.filter(i => i.status === "overdue").length },
  ].filter(d => d.value > 0), [invoices]);

  const companyChart = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach(inv => {
      const name = companies.find(c => c.id === inv.company_id)?.name || "Outros";
      map.set(name, (map.get(name) || 0) + Number(inv.amount));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [invoices, companies]);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total Faturado</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-xl font-bold text-foreground">{fmt(stats.total)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground font-medium">Recebido</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><p className="text-xl font-bold text-green-600">{fmt(stats.paid)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent><p className="text-xl font-bold text-yellow-600">{fmt(stats.pending)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground font-medium">Em Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-xl font-bold text-destructive">{fmt(stats.overdue)}</p></CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Faturamento por Empresa</CardTitle></CardHeader>
          <CardContent>
            {companyChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={companyChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis dataKey="name" type="category" width={120} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição por Status</CardTitle></CardHeader>
          <CardContent>
            {statusChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusChart} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Company Summary */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Resumo por Empresa</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2 font-semibold text-foreground">Empresa</th>
                  <th className="text-left px-4 py-2 font-semibold text-foreground">Plano</th>
                  <th className="text-right px-4 py-2 font-semibold text-foreground">Total</th>
                  <th className="text-right px-4 py-2 font-semibold text-foreground">Pago</th>
                  <th className="text-right px-4 py-2 font-semibold text-foreground">Pendente</th>
                  <th className="text-center px-4 py-2 font-semibold text-foreground">Faturas</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => {
                  const ci = invoices.filter(i => i.company_id === c.id);
                  const total = ci.reduce((s, i) => s + Number(i.amount), 0);
                  const paid = ci.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
                  const pending = ci.filter(i => i.status !== "paid").reduce((s, i) => s + Number(i.amount), 0);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium uppercase">{c.plan}</span></td>
                      <td className="px-4 py-2 text-right font-mono text-foreground">{fmt(total)}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-600">{fmt(paid)}</td>
                      <td className="px-4 py-2 text-right font-mono text-yellow-600">{fmt(pending)}</td>
                      <td className="px-4 py-2 text-center text-muted-foreground">{ci.length}</td>
                    </tr>
                  );
                })}
                {companies.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma empresa cadastrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
