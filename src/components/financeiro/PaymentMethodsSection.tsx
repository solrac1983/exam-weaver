import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Pencil, Trash2, Loader2, Smartphone, QrCode } from "lucide-react";
import { toast } from "sonner";

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  details: Record<string, string>;
  active: boolean;
}

const typeLabels: Record<string, string> = {
  pix: "PIX",
  picpay: "PicPay",
  boleto: "Boleto",
  transferencia: "Transferência",
  outro: "Outro",
};

const typeIcons: Record<string, React.ElementType> = {
  pix: QrCode,
  picpay: Smartphone,
  boleto: CreditCard,
  transferencia: CreditCard,
  outro: CreditCard,
};

export default function PaymentMethodsSection() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [deleting, setDeleting] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ name: "", type: "pix", key: "", cnpj: "", holder: "" });

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("payment_methods").select("*").order("created_at");
    setMethods((data || []).map((d: any) => ({ ...d, details: d.details || {} })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openNew = () => { setEditing(null); setForm({ name: "", type: "pix", key: "", cnpj: "", holder: "" }); setFormOpen(true); };
  const openEdit = (m: PaymentMethod) => {
    setEditing(m);
    setForm({ name: m.name, type: m.type, key: m.details.key || "", cnpj: m.details.cnpj || "", holder: m.details.holder || "" });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Preencha o nome."); return; }
    setSaving(true);
    const details = { key: form.key, cnpj: form.cnpj, holder: form.holder };
    if (editing) {
      const { error } = await supabase.from("payment_methods").update({ name: form.name.trim(), type: form.type, details }).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Meio de pagamento atualizado!");
    } else {
      const { error } = await supabase.from("payment_methods").insert({ name: form.name.trim(), type: form.type, details });
      if (error) toast.error(error.message); else toast.success("Meio de pagamento cadastrado!");
    }
    setSaving(false);
    setFormOpen(false);
    fetch();
  };

  const handleDelete = async () => {
    if (deleting) {
      const { error } = await supabase.from("payment_methods").delete().eq("id", deleting.id);
      if (error) toast.error(error.message); else { toast.success("Removido!"); fetch(); }
    }
    setDeleteOpen(false); setDeleting(null);
  };

  const toggleActive = async (m: PaymentMethod) => {
    await supabase.from("payment_methods").update({ active: !m.active }).eq("id", m.id);
    fetch();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{methods.length} meio(s) de pagamento</p>
        <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Novo Meio</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {methods.map((m) => {
          const Icon = typeIcons[m.type] || CreditCard;
          return (
            <Card key={m.id} className={!m.active ? "opacity-60" : ""}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{m.name}</CardTitle>
                    <Badge variant={m.active ? "default" : "secondary"} className="text-[10px] mt-0.5">
                      {typeLabels[m.type] || m.type}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setDeleting(m); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                {m.details.key && <p><strong>Chave:</strong> {m.details.key}</p>}
                {m.details.cnpj && <p><strong>CNPJ:</strong> {m.details.cnpj}</p>}
                {m.details.holder && <p><strong>Titular:</strong> {m.details.holder}</p>}
                <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 mt-1" onClick={() => toggleActive(m)}>
                  {m.active ? "Desativar" : "Ativar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {methods.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-12">Nenhum meio de pagamento cadastrado.</p>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Meio de Pagamento" : "Novo Meio de Pagamento"}</DialogTitle>
            <DialogDescription>Cadastre as informações do meio de pagamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: PIX Mercado Pago" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="picpay">PicPay</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Chave PIX / Conta</Label>
              <Input value={form.key} onChange={(e) => setForm(p => ({ ...p, key: e.target.value }))} placeholder="Chave PIX, e-mail ou telefone" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Titular</Label>
                <Input value={form.holder} onChange={(e) => setForm(p => ({ ...p, holder: e.target.value }))} placeholder="Nome do titular" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meio de pagamento</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{deleting?.name}</strong>?</AlertDialogDescription>
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
