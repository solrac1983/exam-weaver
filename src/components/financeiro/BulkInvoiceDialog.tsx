import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Company { id: string; name: string; }
interface PaymentMethod { id: string; name: string; }

const months = [
  "01/2026", "02/2026", "03/2026", "04/2026", "05/2026", "06/2026",
  "07/2026", "08/2026", "09/2026", "10/2026", "11/2026", "12/2026",
];

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
  const [dueDate, setDueDate] = useState("");
  const [referenceMonth, setReferenceMonth] = useState("");
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
    setSelectedCompanies(comps.map(c => c.id)); // select all by default
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchData();
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
    if (!amount || !dueDate || !referenceMonth || selectedCompanies.length === 0) {
      toast.error("Preencha valor, vencimento, mês de referência e selecione ao menos uma empresa.");
      return;
    }

    setSaving(true);
    const invoices = selectedCompanies.map(company_id => ({
      company_id,
      amount: parseFloat(amount),
      due_date: dueDate,
      status: "pending",
      payment_method_id: paymentMethodId || null,
      reference_month: referenceMonth,
      notes: "Cobrança recorrente gerada automaticamente",
      is_recurring: true,
    }));

    const { error } = await supabase.from("invoices").insert(invoices);
    if (error) {
      toast.error("Erro ao gerar cobranças: " + error.message);
    } else {
      toast.success(`${invoices.length} cobrança(s) gerada(s) com sucesso!`);
      onSuccess();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cobrança Recorrente</DialogTitle>
          <DialogDescription>
            Gere cobranças para todas as escolas cadastradas de uma só vez.
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
                <Label className="text-xs">Valor (R$) *</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mês Referência *</Label>
                <Select value={referenceMonth} onValueChange={setReferenceMonth}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Vencimento *</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Escolas ({selectedCompanies.length}/{companies.length})</Label>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAll}>
                  {selectedCompanies.length === companies.length ? "Desmarcar todas" : "Selecionar todas"}
                </Button>
              </div>
              <div className="border rounded-lg max-h-[200px] overflow-y-auto p-2 space-y-1">
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
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Gerar {selectedCompanies.length} Cobrança(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
