import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Building2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { addMonths, format, parse } from "date-fns";

interface Company { id: string; name: string; }
interface PaymentMethod { id: string; name: string; }

const installmentOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: i === 0 ? "1x (à vista)" : i === 11 ? "12x (anual)" : `${i + 1}x`,
}));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function BulkInvoiceDialog({ open, onOpenChange, onSuccess }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [dueDay, setDueDay] = useState("5");
  const [totalInstallments, setTotalInstallments] = useState("12");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [compRes, methRes] = await Promise.all([
      supabase.from("companies").select("id, name").eq("active", true).order("name"),
      supabase.from("payment_methods").select("id, name").eq("active", true),
    ]);
    const comps = (compRes.data || []) as Company[];
    setCompanies(comps);
    setMethods((methRes.data || []) as PaymentMethod[]);
    setSelectedCompanies(comps.map(c => c.id));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
      setAmount("");
      setFirstDueDate("");
      setDueDay("5");
      setTotalInstallments("12");
      setPaymentMethodId("");
    }
  }, [open, fetchData]);

  const toggleCompany = (id: string) => {
    setSelectedCompanies(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map(c => c.id));
    }
  };

  const handleGenerate = async () => {
    if (!amount || !firstDueDate || selectedCompanies.length === 0) {
      toast.error("Preencha valor, data do primeiro vencimento e selecione ao menos uma empresa.");
      return;
    }

    setSaving(true);
    const numInstallments = parseInt(totalInstallments);
    const parsedAmount = parseFloat(amount);
    const groupId = crypto.randomUUID();
    const baseDueDate = new Date(firstDueDate + "T12:00:00");
    const day = parseInt(dueDay);

    const invoices: any[] = [];

    for (const company_id of selectedCompanies) {
      for (let i = 0; i < numInstallments; i++) {
        const monthDate = addMonths(baseDueDate, i);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const actualDay = Math.min(day, lastDayOfMonth);
        const dueDate = new Date(year, month, actualDay);
        const refMonth = format(dueDate, "MM/yyyy");

        invoices.push({
          company_id,
          amount: parsedAmount,
          due_date: format(dueDate, "yyyy-MM-dd"),
          status: "pending",
          payment_method_id: paymentMethodId || null,
          reference_month: refMonth,
          notes: `Parcela ${i + 1}/${numInstallments}`,
          is_recurring: true,
          installment_number: i + 1,
          total_installments: numInstallments,
          recurring_group_id: groupId,
        });
      }
    }

    const { error } = await supabase.from("invoices").insert(invoices);
    if (error) {
      toast.error("Erro ao gerar cobranças: " + error.message);
    } else {
      toast.success(`${invoices.length} parcela(s) gerada(s) para ${selectedCompanies.length} empresa(s)!`);
      onSuccess();
      onOpenChange(false);
    }
    setSaving(false);
  };

  const previewCount = selectedCompanies.length * parseInt(totalInstallments || "0");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Cobrança Recorrente
          </DialogTitle>
          <DialogDescription>
            Gere parcelas automáticas para as escolas selecionadas. Cada empresa receberá um carnê com as parcelas configuradas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor por parcela (R$) *</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1.500,00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nº de Parcelas *</Label>
                <Select value={totalInstallments} onValueChange={setTotalInstallments}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {installmentOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Primeiro Vencimento *</Label>
                <Input type="date" value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dia de vencimento</Label>
                <Select value={dueDay} onValueChange={setDueDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25].map(d => (
                      <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Meio de Pagamento</Label>
              <Select value={paymentMethodId || "none"} onValueChange={v => setPaymentMethodId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {methods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Escolas ({selectedCompanies.length}/{companies.length})</Label>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAll}>
                  {selectedCompanies.length === companies.length ? "Desmarcar todas" : "Selecionar todas"}
                </Button>
              </div>
              <div className="border rounded-lg max-h-[180px] overflow-y-auto p-2 space-y-1">
                {companies.map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={selectedCompanies.includes(c.id)}
                      onCheckedChange={() => toggleCompany(c.id)}
                    />
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
                {companies.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma empresa cadastrada.</p>
                )}
              </div>
            </div>

            {previewCount > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
                <p className="text-xs text-muted-foreground">Serão geradas</p>
                <p className="text-lg font-bold text-primary">{previewCount} parcelas</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCompanies.length} empresa(s) × {totalInstallments} parcela(s) = R$ {(parseFloat(amount || "0") * previewCount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Gerar {previewCount} Parcela(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
