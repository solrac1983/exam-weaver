import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Image as ImageIcon, FileText, Plus, Trash2, Upload,
  List, LayoutGrid, Eye, Download, Search, X, Pencil, FileEdit,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const segmentOptions = ["Educação Infantil", "Anos Iniciais", "Anos Finais", "Ensino Médio", "Integral"];
const gradeOptions = ["1º ano", "2º ano", "3º ano"];
const categoryOptions = ["Geral", "Mensal", "Bimestral", "Simulado", "Recuperação"];

interface TemplateHeader {
  id: string;
  name: string;
  segment: string | null;
  grade: string | null;
  file_path: string;
  file_url: string;
  created_at: string;
}

interface TemplateDocument {
  id: string;
  name: string;
  description: string | null;
  segment: string | null;
  grade: string | null;
  category: string | null;
  file_path: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

export default function TemplatesPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Modelos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie cabeçalhos de provas e modelos de documentos
          </p>
        </div>
        <Button onClick={() => navigate("/provas/editor")} className="gap-1.5">
          <FileEdit className="h-4 w-4" />
          Criar modelo no editor
        </Button>
      </div>

      <Tabs defaultValue="cabecalhos" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="cabecalhos" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Cabeçalhos
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Modelos de Prova
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cabecalhos"><HeadersTab /></TabsContent>
        <TabsContent value="documentos"><DocumentsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════
// Headers Tab (images)
// ══════════════════════════════════════════════
function HeadersTab() {
  const [items, setItems] = useState<TemplateHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHeader, setEditingHeader] = useState<TemplateHeader | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<TemplateHeader | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filterSegment, setFilterSegment] = useState("all");
  const [search, setSearch] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formSegment, setFormSegment] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchHeaders = async () => {
    const { data, error } = await supabase.from("template_headers").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Erro ao carregar cabeçalhos."); console.error(error); }
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchHeaders(); }, []);

  const filtered = items.filter((h) => {
    if (filterSegment !== "all" && h.segment !== filterSegment) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!h.name.toLowerCase().includes(s) && !(h.segment || "").toLowerCase().includes(s) && !(h.grade || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const handleUpload = async () => {
    if (!formName.trim()) { toast.error("Preencha o nome."); return; }

    // Editing existing header (metadata only, or with new file)
    if (editingHeader) {
      setUploading(true);
      let file_path = editingHeader.file_path;
      let file_url = editingHeader.file_url;

      if (formFile) {
        // Upload new file and remove old
        const ext = formFile.name.split(".").pop();
        const newPath = `${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("template-headers").upload(newPath, formFile);
        if (uploadErr) { toast.error("Erro no upload."); setUploading(false); return; }
        await supabase.storage.from("template-headers").remove([editingHeader.file_path]);
        const { data: urlData } = supabase.storage.from("template-headers").getPublicUrl(newPath);
        file_path = newPath;
        file_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("template_headers").update({
        name: formName.trim(),
        segment: formSegment || null,
        grade: formGrade || null,
        file_path,
        file_url,
      }).eq("id", editingHeader.id);

      if (error) { toast.error("Erro ao atualizar."); }
      else { toast.success("Cabeçalho atualizado!"); setFormOpen(false); fetchHeaders(); }
      setUploading(false);
      return;
    }

    // Creating new
    if (!formFile) { toast.error("Selecione uma imagem."); return; }
    setUploading(true);
    const ext = formFile.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("template-headers").upload(path, formFile);
    if (uploadErr) { toast.error("Erro no upload."); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("template-headers").getPublicUrl(path);

    const { error: insertErr } = await supabase.from("template_headers").insert({
      name: formName.trim(),
      segment: formSegment || null,
      grade: formGrade || null,
      file_path: path,
      file_url: urlData.publicUrl,
    });

    if (insertErr) { toast.error("Erro ao salvar."); }
    else { toast.success("Cabeçalho adicionado!"); setFormOpen(false); fetchHeaders(); }
    setUploading(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await supabase.storage.from("template-headers").remove([deleting.file_path]);
    await supabase.from("template_headers").delete().eq("id", deleting.id);
    toast.success("Cabeçalho excluído.");
    setDeleteOpen(false); setDeleting(null); fetchHeaders();
  };

  const openNew = () => {
    setEditingHeader(null);
    setFormName(""); setFormSegment(""); setFormGrade(""); setFormFile(null);
    setFormOpen(true);
  };

  const openEdit = (h: TemplateHeader) => {
    setEditingHeader(h);
    setFormName(h.name);
    setFormSegment(h.segment || "");
    setFormGrade(h.grade || "");
    setFormFile(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} cabeçalho(s)</p>
        <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Novo Cabeçalho</Button>
      </div>

      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cabeçalho..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterSegment} onValueChange={setFilterSegment}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos segmentos</SelectItem>
              {segmentOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || filterSegment !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterSegment("all"); }} className="text-xs gap-1"><X className="h-3 w-3" />Limpar</Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-lg p-12 text-center text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-lg p-12 text-center text-muted-foreground">
          Nenhum cabeçalho cadastrado. Clique em "Novo Cabeçalho" para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((h) => (
            <div key={h.id} className="glass-card rounded-lg overflow-hidden group">
              <div className="aspect-[3/1] bg-muted relative cursor-pointer" onClick={() => setPreviewUrl(h.file_url)}>
                <img src={h.file_url} alt={h.name} className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye className="h-6 w-6 text-background" />
                </div>
              </div>
              <div className="p-3 space-y-1">
                <p className="font-medium text-foreground text-sm truncate">{h.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {h.segment && <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px]">{h.segment}</span>}
                  {h.grade && <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">{h.grade}</span>}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(h)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setDeleting(h); setDeleteOpen(true); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              {editingHeader ? "Editar Cabeçalho" : "Novo Cabeçalho"}
            </DialogTitle>
            <DialogDescription>
              {editingHeader ? "Atualize os dados do cabeçalho. A imagem só será substituída se você selecionar uma nova." : "Faça upload de uma imagem para usar como cabeçalho de provas."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Cabeçalho Ensino Médio 2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Segmento</Label>
                <Select value={formSegment} onValueChange={setFormSegment}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{segmentOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Série</Label>
                <Select value={formGrade} onValueChange={setFormGrade}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{gradeOptions.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Imagem {editingHeader ? "(opcional — substitui a atual)" : "*"}</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFormFile(e.target.files?.[0] || null)} />
                {formFile ? (
                  <div className="space-y-1">
                    <ImageIcon className="h-8 w-8 mx-auto text-primary" />
                    <p className="text-sm text-foreground font-medium">{formFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(formFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : editingHeader ? (
                  <div className="space-y-1">
                    <img src={editingHeader.file_url} alt="Atual" className="h-12 mx-auto object-contain rounded" />
                    <p className="text-xs text-muted-foreground">Clique para substituir a imagem</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar uma imagem</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading}>{uploading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cabeçalho</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{deleting?.name}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Pré-visualização do Cabeçalho</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Cabeçalho" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════
// Documents Tab (.doc/.docx templates)
// ══════════════════════════════════════════════
function DocumentsTab() {
  const [items, setItems] = useState<TemplateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TemplateDocument | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<TemplateDocument | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Form
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSegment, setFormSegment] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [formCategory, setFormCategory] = useState("Geral");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    const { data, error } = await supabase.from("template_documents").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Erro ao carregar modelos."); console.error(error); }
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const filtered = items.filter((d) => {
    if (filterCategory !== "all" && d.category !== filterCategory) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!d.name.toLowerCase().includes(s) && !(d.description || "").toLowerCase().includes(s) && !(d.segment || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const handleUpload = async () => {
    if (!formName.trim()) { toast.error("Preencha o nome."); return; }

    // Editing existing
    if (editingDoc) {
      setUploading(true);
      let file_path = editingDoc.file_path;
      let file_url = editingDoc.file_url;
      let file_size = editingDoc.file_size;

      if (formFile) {
        const validExts = ["doc", "docx"];
        const ext = formFile.name.split(".").pop()?.toLowerCase();
        if (!ext || !validExts.includes(ext)) { toast.error("Apenas .doc e .docx são aceitos."); setUploading(false); return; }

        const newPath = `${Date.now()}-${formFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadErr } = await supabase.storage.from("template-documents").upload(newPath, formFile);
        if (uploadErr) { toast.error("Erro no upload."); setUploading(false); return; }
        await supabase.storage.from("template-documents").remove([editingDoc.file_path]);
        const { data: urlData } = supabase.storage.from("template-documents").getPublicUrl(newPath);
        file_path = newPath;
        file_url = urlData.publicUrl;
        file_size = formFile.size;
      }

      const { error } = await supabase.from("template_documents").update({
        name: formName.trim(),
        description: formDesc.trim() || null,
        segment: formSegment || null,
        grade: formGrade || null,
        category: formCategory,
        file_path,
        file_url,
        file_size,
      }).eq("id", editingDoc.id);

      if (error) { toast.error("Erro ao atualizar."); }
      else { toast.success("Modelo atualizado!"); setFormOpen(false); fetchDocs(); }
      setUploading(false);
      return;
    }

    // Creating new
    if (!formFile) { toast.error("Selecione um arquivo."); return; }
    const validExts = ["doc", "docx"];
    const ext = formFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !validExts.includes(ext)) { toast.error("Apenas arquivos .doc e .docx são aceitos."); return; }

    setUploading(true);
    const path = `${Date.now()}-${formFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const { error: uploadErr } = await supabase.storage.from("template-documents").upload(path, formFile);
    if (uploadErr) { toast.error("Erro no upload."); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("template-documents").getPublicUrl(path);

    const { error: insertErr } = await supabase.from("template_documents").insert({
      name: formName.trim(),
      description: formDesc.trim() || null,
      segment: formSegment || null,
      grade: formGrade || null,
      category: formCategory,
      file_path: path,
      file_url: urlData.publicUrl,
      file_size: formFile.size,
    });

    if (insertErr) { toast.error("Erro ao salvar."); }
    else { toast.success("Modelo adicionado!"); setFormOpen(false); fetchDocs(); }
    setUploading(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await supabase.storage.from("template-documents").remove([deleting.file_path]);
    await supabase.from("template_documents").delete().eq("id", deleting.id);
    toast.success("Modelo excluído.");
    setDeleteOpen(false); setDeleting(null); fetchDocs();
  };

  const openNew = () => {
    setEditingDoc(null);
    setFormName(""); setFormDesc(""); setFormSegment(""); setFormGrade("");
    setFormCategory("Geral"); setFormFile(null); setFormOpen(true);
  };

  const openEdit = (d: TemplateDocument) => {
    setEditingDoc(d);
    setFormName(d.name);
    setFormDesc(d.description || "");
    setFormSegment(d.segment || "");
    setFormGrade(d.grade || "");
    setFormCategory(d.category || "Geral");
    setFormFile(null);
    setFormOpen(true);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Group by category for kanban
  const kanbanGroups = categoryOptions.map((cat) => ({
    category: cat,
    items: filtered.filter((d) => (d.category || "Geral") === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{filtered.length} modelo(s)</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setViewMode("list")}
            ><List className="h-3.5 w-3.5" />Lista</button>
            <button
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setViewMode("kanban")}
            ><LayoutGrid className="h-3.5 w-3.5" />Kanban</button>
          </div>
          <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Novo Modelo</Button>
        </div>
      </div>

      <div className="glass-card rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar modelo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || filterCategory !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterCategory("all"); }} className="text-xs gap-1"><X className="h-3 w-3" />Limpar</Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-lg p-12 text-center text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-lg p-12 text-center text-muted-foreground">
          Nenhum modelo cadastrado. Clique em "Novo Modelo" para começar.
        </div>
      ) : viewMode === "list" ? (
        /* ── List View ── */
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Categoria</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Segmento</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Série</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Tamanho</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Data</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{d.name}</p>
                        {d.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{d.description}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{d.category || "Geral"}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{d.segment || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.grade || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatSize(d.file_size)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(d)} title="Editar">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <a href={d.file_url} download target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Baixar"><Download className="h-4 w-4 text-muted-foreground" /></Button>
                        </a>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setDeleting(d); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Kanban View ── */
        <div className="flex gap-4 overflow-x-auto pb-2">
          {kanbanGroups.map((group) => (
            <div key={group.category} className="min-w-[280px] max-w-[320px] flex-shrink-0">
              <div className="glass-card rounded-lg">
                <div className="px-4 py-3 border-b border-border bg-muted/50 rounded-t-lg">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {group.category}
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">{group.items.length}</span>
                  </h3>
                </div>
                <div className="p-2 space-y-2">
                  {group.items.map((d) => (
                    <div key={d.id} className="rounded-lg border border-border bg-background p-3 space-y-2 hover:shadow-sm transition-shadow">
                      <p className="font-medium text-foreground text-sm">{d.name}</p>
                      {d.description && <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {d.segment && <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px]">{d.segment}</span>}
                        {d.grade && <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">{d.grade}</span>}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground">{formatSize(d.file_size)}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(d)}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <a href={d.file_url} download target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Download className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                          </a>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setDeleting(d); setDeleteOpen(true); }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {editingDoc ? "Editar Modelo" : "Novo Modelo"}
            </DialogTitle>
            <DialogDescription>
              {editingDoc ? "Atualize os dados do modelo. O arquivo só será substituído se você selecionar um novo." : "Faça upload de um arquivo .doc ou .docx como modelo base."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Modelo Bimestral 2026" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Descrição</Label><Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Breve descrição do modelo..." rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Segmento</Label>
                <Select value={formSegment} onValueChange={setFormSegment}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{segmentOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Série</Label>
                <Select value={formGrade} onValueChange={setFormGrade}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{gradeOptions.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Arquivo {editingDoc ? "(opcional — substitui o atual)" : "*"}</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".doc,.docx" className="hidden" onChange={(e) => setFormFile(e.target.files?.[0] || null)} />
                {formFile ? (
                  <div className="space-y-1">
                    <FileText className="h-8 w-8 mx-auto text-primary" />
                    <p className="text-sm text-foreground font-medium">{formFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(formFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : editingDoc ? (
                  <div className="space-y-1">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Arquivo atual mantido</p>
                    <p className="text-xs text-muted-foreground">Clique para substituir</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo</p>
                    <p className="text-xs text-muted-foreground">.doc, .docx</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading}>{uploading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo</AlertDialogTitle>
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
