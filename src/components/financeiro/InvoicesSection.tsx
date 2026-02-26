import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Search, X, Building2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
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
}

interface Company { id: string; name: string; }
interface PaymentMethod { id: string; name: string; type: string; }

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-700 border-yellow-300", icon: Clock },
  paid: { label: "Pago", color: "bg-green-500/10 text-green-700 border-green-300", icon: CheckCircle2 },
  overdue: { label: "Vencido", color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
};

const months = [
  "01/2026", "02/2026", "03/2026", "04/2026", "05/2026", "06/2026",
  "07/2026", "08/2026", "09/2026", "10/2026", "11/2026", "12/2026",
];

export default function InvoicesSection() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    company_id: "", amount: "", due_date: "", paid_date: "", status: "pending",
    payment_method_id: "", reference_month: "", notes: "",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [invRes, compRes, methRes] = await Promise.all([
      supabase.from("invoices").select("*").order("due_date", { ascending: false }),
      supabase.from("companies").select("id, name").eq("active", true).order("name"),
      supabase.from("payment_methods").select("id, name, type").eq("active", true),
    ]);
    setInvoices((invRes.data || []) as Invoice[]);
    setCompanies((compRes.data || []) as Company[]);
    setMethods((methRes.data || []) as PaymentMethod[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c.name])), [companies]);
  const methodMap = useMemo(() => new Map(methods.map(m => [m.id, m.name])), [methods]);

  const filtered = useMemo(() => {
    let r = invoices;
    if (filterCompany !== "all") r = r.filter(i => i.company_id === filterCompany);
    if (filterMonth !== "all") r = r.filter(i => i.reference_month === filterMonth);
    if (filterStatus !== "all") r = r.filter(i => i.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(i => (companyMap.get(i.company_id) || "").toLowerCase().includes(q) || i.notes?.toLowerCase().includes(q));
    }
    return r;
  }, [invoices, filterCompany, filterMonth, filterStatus, search, companyMap]);

  const openNew = () => {
    setEditing(null);
    setForm({ company_id: "", amount: "", due_date: "", paid_date: "", status: "pending", payment_method_id: "", reference_month: "", notes: "" });
    setFormOpen(true);
  };
  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      company_id: inv.company_id, amount: String(inv.amount), due_date: inv.due_date,
      paid_date: inv.paid_date || "", status: inv.status, payment_method_id: inv.payment_method_id || "",
      reference_month: inv.reference_month, notes: inv.notes || "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.company_id || !form.amount || !form.due_date || !form.reference_month) {
      toast.error("Preencha empresa, valor, vencimento e mês de referência."); return;
    }
    setSaving(true);
    const payload = {
      company_id: form.company_id,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      paid_date: form.paid_date || null,
      status: form.status,
      payment_method_id: form.payment_method_id || null,
      reference_month: form.reference_month,
      notes: form.notes,
    };
    if (editing) {
      const { error } = await supabase.from("invoices").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Pagamento atualizado!");
    } else {
      const { error } = await supabase.from("invoices").insert(payload);
      if (error) toast.error(error.message); else toast.success("Pagamento registrado!");
    }
    setSaving(false);
    setFormOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (deleting) {
      const { error } = await supabase.from("invoices").delete().eq("id", deleting.id);
      if (error) toast.error(error.message); else { toast.success("Removido!"); fetchAll(); }
    }
    setDeleteOpen(false); setDeleting(null);
  };

  const markPaid = async (inv: Invoice) => {
    await supabase.from("invoices").update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] }).eq("id", inv.id);
    toast.success("Marcado como pago!"); fetchAll();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} registro(s)</p>
        <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Novo Pagamento</Button>
      </div>

      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); }} className="pl-9" />
          </div>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-[200px]"><Building2 className="h-4 w-4 mr-1 text-muted-foreground" /><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas empresas</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos meses</SelectItem>
              {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
            </SelectContent>
          </Select>
          {(search || filterCompany !== "all" || filterMonth !== "all" || filterStatus !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterCompany("all"); setFilterMonth("all"); setFilterStatus("all"); }} className="text-xs gap-1"><X className="h-3 w-3" />Limpar</Button>
          )}
        </div>
      </div>

      <div className="glass-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Empresa</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Mês Ref.</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">Valor</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Vencimento</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Meio</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const cfg = statusConfig[inv.status] || statusConfig.pending;
                const StatusIcon = cfg.icon;
                return (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{companyMap.get(inv.company_id) || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.reference_month}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                      R$ {Number(inv.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{format(parseISO(inv.due_date), "dd/MM/yyyy")}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`gap-1 text-[10px] ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{methodMap.get(inv.payment_method_id || "") || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status !== "paid" && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-green-600" onClick={() => markPaid(inv)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Pagar
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(inv)}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setDeleting(inv); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Nenhum pagamento encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Pagamento" : "Novo Pagamento"}</DialogTitle>
            <DialogDescription>Registre os dados do pagamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa *</Label>
              <Select value={form.company_id} onValueChange={v => setForm(p => ({ ...p, company_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mês Referência *</Label>
                <Select value={form.reference_month} onValueChange={v => setForm(p => ({ ...p, reference_month: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Vencimento *</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data Pagamento</Label>
                <Input type="date" value={form.paid_date} onChange={e => setForm(p => ({ ...p, paid_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meio de Pagamento</Label>
                <Select value={form.payment_method_id || "none"} onValueChange={v => setForm(p => ({ ...p, payment_method_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {methods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notas adicionais..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagamento</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este registro?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
