import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Pencil, Trash2, Mail, UserPlus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Teacher {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  subjects: string[];
  class_groups: string[];
}

interface SubjectOption {
  id: string;
  name: string;
}

interface ClassGroupOption {
  id: string;
  name: string;
}

interface TeachersTabProps {
  companyId: string;
}

const emptyForm = { name: "", email: "", cpf: "", phone: "", subjects: [] as string[], class_groups: [] as string[] };

export default function TeachersTab({ companyId }: TeachersTabProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [welcomeTeacher, setWelcomeTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [classGroupOptions, setClassGroupOptions] = useState<ClassGroupOption[]>([]);

  const fetchOptions = useCallback(async () => {
    const [subRes, cgRes] = await Promise.all([
      supabase.from("subjects").select("id, name").eq("company_id", companyId).order("name"),
      supabase.from("class_groups").select("id, name").eq("company_id", companyId).order("name"),
    ]);
    setSubjectOptions((subRes.data || []) as SubjectOption[]);
    setClassGroupOptions((cgRes.data || []) as ClassGroupOption[]);
  }, [companyId]);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("teachers")
      .select("id, name, email, cpf, phone, subjects, class_groups")
      .eq("company_id", companyId)
      .order("name");
    if (error) { showInvokeError("Erro ao carregar professores."); console.error(error); }
    setTeachers((data || []).map((d: any) => ({
      id: d.id, name: d.name, email: d.email || "", cpf: d.cpf || "",
      phone: d.phone || "", subjects: d.subjects || [], class_groups: d.class_groups || [],
    })));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { if (companyId) { fetchTeachers(); fetchOptions(); } }, [companyId, fetchTeachers, fetchOptions]);

  const subjectMap = useMemo(() => {
    const m = new Map<string, string>();
    subjectOptions.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [subjectOptions]);

  const classGroupMap = useMemo(() => {
    const m = new Map<string, string>();
    classGroupOptions.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [classGroupOptions]);

  const filtered = useMemo(() => {
    let r = teachers;
    if (filterSubject !== "all") r = r.filter((t) => t.subjects.includes(filterSubject));
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((t) =>
        t.name.toLowerCase().includes(s) || t.email.toLowerCase().includes(s) || t.cpf.includes(s) ||
        t.subjects.some((sid) => subjectMap.get(sid)?.toLowerCase().includes(s)) ||
        t.class_groups.some((cid) => classGroupMap.get(cid)?.toLowerCase().includes(s))
      );
    }
    return r;
  }, [teachers, search, filterSubject, subjectMap, classGroupMap]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, subjects: [], class_groups: [] }); setFormOpen(true); };
  const openEdit = (t: Teacher) => { setEditing(t); setForm({ name: t.name, email: t.email, cpf: t.cpf, phone: t.phone, subjects: [...t.subjects], class_groups: [...t.class_groups] }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.cpf.trim()) { showInvokeError("Preencha nome, e-mail e CPF."); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), email: form.email.trim(), cpf: form.cpf.trim(), phone: form.phone.trim(), subjects: form.subjects, class_groups: form.class_groups };
    if (editing) {
      const { error } = await supabase.from("teachers").update(payload).eq("id", editing.id);
      if (error) { showInvokeError(error.message); } else { showInvokeSuccess("Professor atualizado!"); }
    } else {
      const { error } = await supabase.from("teachers").insert({ ...payload, company_id: companyId });
      if (error) { showInvokeError(error.message); } else { showInvokeSuccess("Professor cadastrado!"); }
    }
    setSaving(false);
    setFormOpen(false);
    fetchTeachers();
  };

  const handleDelete = async () => {
    if (deleting) {
      const { error } = await supabase.from("teachers").delete().eq("id", deleting.id);
      if (error) { showInvokeError(error.message); } else { showInvokeSuccess("Professor excluído."); fetchTeachers(); }
    }
    setDeleteOpen(false); setDeleting(null);
  };

  const handleSendWelcome = () => {
    if (welcomeTeacher) showInvokeSuccess(`E-mail de boas-vindas enviado para ${welcomeTeacher.email}!`);
    setWelcomeOpen(false); setWelcomeTeacher(null);
  };

  const toggleSubject = (sid: string) => setForm((p) => ({ ...p, subjects: p.subjects.includes(sid) ? p.subjects.filter((s) => s !== sid) : [...p.subjects, sid] }));
  const toggleClassGroup = (cid: string) => setForm((p) => ({ ...p, class_groups: p.class_groups.includes(cid) ? p.class_groups.filter((c) => c !== cid) : [...p.class_groups, cid] }));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} professor(es)</p>
        <Button size="sm" onClick={openNew} className="gap-1.5"><UserPlus className="h-4 w-4" />Novo Professor</Button>
      </div>

      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, e-mail, CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Disciplina" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas disciplinas</SelectItem>
              {subjectOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || filterSubject !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterSubject("all"); }} className="text-xs gap-1"><X className="h-3 w-3" />Limpar</Button>
          )}
        </div>
      </div>

      <div className="glass-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">E-mail</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">CPF</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Disciplinas</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Turmas</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.email}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.cpf}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.subjects.map((sid) => (
                        <span key={sid} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{subjectMap.get(sid) || sid}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.class_groups.map((cid) => (
                        <span key={cid} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">{classGroupMap.get(cid) || cid}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setWelcomeTeacher(t); setWelcomeOpen(true); }} title="Enviar e-mail de boas-vindas"><Mail className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(t)} title="Editar"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setDeleting(t); setDeleteOpen(true); }} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhum professor encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? <Pencil className="h-5 w-5 text-primary" /> : <UserPlus className="h-5 w-5 text-primary" />}
              {editing ? "Editar Professor" : "Novo Professor"}
            </DialogTitle>
            <DialogDescription>{editing ? "Atualize as informações do professor." : "Preencha os dados para cadastrar um novo professor."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Nome completo *</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nome do professor" /></div>
              <div className="space-y-1.5"><Label className="text-xs">E-mail *</Label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="professor@escola.com" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">CPF *</Label><Input value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Telefone</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
            </div>
            {subjectOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Disciplinas</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-md border border-border bg-muted/30 max-h-32 overflow-y-auto">
                  {subjectOptions.map((s) => (
                    <label key={s.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={form.subjects.includes(s.id)} onCheckedChange={() => toggleSubject(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {classGroupOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Turmas</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-md border border-border bg-muted/30 max-h-32 overflow-y-auto">
                  {classGroupOptions.map((cg) => (
                    <label key={cg.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={form.class_groups.includes(cg.id)} onCheckedChange={() => toggleClassGroup(cg.id)} />
                      {cg.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir professor</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{deleting?.name}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Welcome email dialog */}
      <Dialog open={welcomeOpen} onOpenChange={setWelcomeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Enviar e-mail de boas-vindas</DialogTitle>
            <DialogDescription>Um e-mail será enviado para o professor com as informações de acesso ao sistema.</DialogDescription>
          </DialogHeader>
          {welcomeTeacher && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
                <p><strong>Para:</strong> {welcomeTeacher.email}</p>
                <p><strong>Assunto:</strong> Bem-vindo(a) ao SmartTest</p>
                <hr className="border-border" />
                <div className="text-muted-foreground space-y-1 text-xs">
                  <p>Olá, <strong>{welcomeTeacher.name}</strong>!</p>
                  <p>Você foi cadastrado(a) no sistema de gestão de provas.</p>
                  <p><strong>Link de acesso:</strong> {window.location.origin}</p>
                  <p><strong>Usuário:</strong> {welcomeTeacher.email}</p>
                  <p><strong>Senha:</strong> {welcomeTeacher.cpf.replace(/\D/g, "")}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-2">Recomendamos alterar sua senha no primeiro acesso.</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWelcomeOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendWelcome} className="gap-1.5"><Mail className="h-4 w-4" />Enviar e-mail</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
