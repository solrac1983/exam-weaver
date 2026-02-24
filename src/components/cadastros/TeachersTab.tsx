import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
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
import { Search, Plus, Pencil, Trash2, Mail, UserPlus, X } from "lucide-react";
import { mockSubjects, mockClassGroups } from "@/data/mockData";
import { toast } from "sonner";

interface Teacher {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  subjects: string[];
  classGroups: string[];
}

const initialTeachers: Teacher[] = [
  { id: "prof-1", name: "Carlos Oliveira", email: "carlos@escola.com", cpf: "123.456.789-00", phone: "(11) 99999-0001", subjects: ["sub-1"], classGroups: ["2ºA", "2ºB"] },
  { id: "prof-2", name: "Ana Santos", email: "ana@escola.com", cpf: "234.567.890-11", phone: "(11) 99999-0002", subjects: ["sub-2"], classGroups: ["1ºA"] },
  { id: "prof-3", name: "Roberto Lima", email: "roberto@escola.com", cpf: "345.678.901-22", phone: "(11) 99999-0003", subjects: ["sub-3"], classGroups: ["3ºA", "3ºB", "3ºC"] },
  { id: "prof-4", name: "Fernanda Costa", email: "fernanda@escola.com", cpf: "456.789.012-33", phone: "(11) 99999-0004", subjects: ["sub-4"], classGroups: ["2ºC"] },
  { id: "prof-5", name: "Paulo Mendes", email: "paulo@escola.com", cpf: "567.890.123-44", phone: "(11) 99999-0005", subjects: ["sub-5"], classGroups: ["3ºA"] },
];

const emptyForm = { name: "", email: "", cpf: "", phone: "", subjects: [] as string[], classGroups: [] as string[] };

export default function TeachersTab() {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [welcomeTeacher, setWelcomeTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState(emptyForm);

  const subjectMap = useMemo(() => {
    const m = new Map<string, string>();
    mockSubjects.forEach((s) => m.set(s.id, s.name));
    return m;
  }, []);

  const filtered = useMemo(() => {
    let r = teachers;
    if (filterSubject !== "all") r = r.filter((t) => t.subjects.includes(filterSubject));
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((t) =>
        t.name.toLowerCase().includes(s) || t.email.toLowerCase().includes(s) || t.cpf.includes(s) ||
        t.subjects.some((sid) => subjectMap.get(sid)?.toLowerCase().includes(s)) ||
        t.classGroups.some((cg) => cg.toLowerCase().includes(s))
      );
    }
    return r;
  }, [teachers, search, filterSubject, subjectMap]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, subjects: [], classGroups: [] }); setFormOpen(true); };
  const openEdit = (t: Teacher) => { setEditing(t); setForm({ name: t.name, email: t.email, cpf: t.cpf, phone: t.phone, subjects: [...t.subjects], classGroups: [...t.classGroups] }); setFormOpen(true); };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim() || !form.cpf.trim()) { toast.error("Preencha nome, e-mail e CPF."); return; }
    if (editing) {
      setTeachers((p) => p.map((t) => (t.id === editing.id ? { ...t, ...form } : t)));
      toast.success("Professor atualizado!");
    } else {
      setTeachers((p) => [...p, { id: `prof-${Date.now()}`, ...form }]);
      toast.success("Professor cadastrado!");
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (deleting) setTeachers((p) => p.filter((t) => t.id !== deleting.id));
    setDeleteOpen(false); setDeleting(null);
    toast.success("Professor excluído.");
  };

  const handleSendWelcome = () => {
    if (welcomeTeacher) toast.success(`E-mail de boas-vindas enviado para ${welcomeTeacher.email}!`);
    setWelcomeOpen(false); setWelcomeTeacher(null);
  };

  const toggleSubject = (sid: string) => setForm((p) => ({ ...p, subjects: p.subjects.includes(sid) ? p.subjects.filter((s) => s !== sid) : [...p.subjects, sid] }));
  const toggleClassGroup = (cg: string) => setForm((p) => ({ ...p, classGroups: p.classGroups.includes(cg) ? p.classGroups.filter((c) => c !== cg) : [...p.classGroups, cg] }));

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
              {mockSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
                      {t.classGroups.map((cg) => (
                        <span key={cg} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">{cg}</span>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Disciplinas</Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-md border border-border bg-muted/30">
                {mockSubjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={form.subjects.includes(s.id)} onCheckedChange={() => toggleSubject(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Turmas</Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-md border border-border bg-muted/30">
                {mockClassGroups.map((cg) => (
                  <label key={cg} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={form.classGroups.includes(cg)} onCheckedChange={() => toggleClassGroup(cg)} />
                    {cg}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar alterações" : "Cadastrar"}</Button>
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
                <p><strong>Assunto:</strong> Bem-vindo(a) ao Sistema de Provas</p>
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
