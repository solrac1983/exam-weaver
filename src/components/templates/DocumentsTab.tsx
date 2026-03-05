import { useState, useEffect, useRef, useMemo } from "react";
import { TemplateFolderManager, TemplateFolder } from "./TemplateFolderManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  FileText, Plus, Trash2, Upload, Download, Search, X, Pencil,
  List, LayoutGrid,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateDocument, segmentOptions, gradeOptions, categoryOptions, formatFileSize } from "./TemplateConstants";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  folders: TemplateFolder[];
  setFolders: React.Dispatch<React.SetStateAction<TemplateFolder[]>>;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
}

export function DocumentsTab({ folders, setFolders, activeFolderId, setActiveFolderId }: Props) {
  const [items, setItems] = useState<TemplateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TemplateDocument | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<TemplateDocument | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

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

  const itemsInFolders = useMemo(() => {
    const set = new Set<string>();
    folders.forEach((f) => f.itemIds.forEach((id) => set.add(id)));
    return set;
  }, [folders]);

  const filtered = items.filter((d) => {
    if (activeFolderId) {
      const folder = folders.find((f) => f.id === activeFolderId);
      if (!folder?.itemIds.includes(d.id)) return false;
    } else {
      if (itemsInFolders.has(d.id)) return false;
    }
    if (filterCategory !== "all" && d.category !== filterCategory) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!d.name.toLowerCase().includes(s) && !(d.description || "").toLowerCase().includes(s) && !(d.segment || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const handleUpload = async () => {
    if (!formName.trim()) { toast.error("Preencha o nome."); return; }

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
        file_path = newPath; file_url = urlData.publicUrl; file_size = formFile.size;
      }

      const { error } = await supabase.from("template_documents").update({
        name: formName.trim(), description: formDesc.trim() || null,
        segment: formSegment || null, grade: formGrade || null,
        category: formCategory, file_path, file_url, file_size,
      }).eq("id", editingDoc.id);

      if (error) toast.error("Erro ao atualizar.");
      else { toast.success("Modelo atualizado!"); setFormOpen(false); fetchDocs(); }
      setUploading(false);
      return;
    }

    if (!formFile) { toast.error("Selecione um arquivo."); return; }
    const validExts = ["doc", "docx"];
    const ext = formFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !validExts.includes(ext)) { toast.error("Apenas .doc e .docx são aceitos."); return; }

    setUploading(true);
    const path = `${Date.now()}-${formFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadErr } = await supabase.storage.from("template-documents").upload(path, formFile);
    if (uploadErr) { toast.error("Erro no upload."); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("template-documents").getPublicUrl(path);

    const { error: insertErr } = await supabase.from("template_documents").insert({
      name: formName.trim(), description: formDesc.trim() || null,
      segment: formSegment || null, grade: formGrade || null,
      category: formCategory, file_path: path, file_url: urlData.publicUrl, file_size: formFile.size,
    });

    if (insertErr) toast.error("Erro ao salvar.");
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
    setFormName(d.name); setFormDesc(d.description || "");
    setFormSegment(d.segment || ""); setFormGrade(d.grade || "");
    setFormCategory(d.category || "Geral"); setFormFile(null); setFormOpen(true);
  };

  const kanbanGroups = categoryOptions.map((cat) => ({
    category: cat,
    items: filtered.filter((d) => (d.category || "Geral") === cat),
  })).filter((g) => g.items.length > 0);

  const hasFilters = search || filterCategory !== "all";

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
            <FileText className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{filtered.length} modelo(s)</p>
            <p className="text-xs text-muted-foreground">Modelos base de documentos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setViewMode("list")}
            ><List className="h-3.5 w-3.5" />Lista</button>
            <button
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setViewMode("grid")}
            ><LayoutGrid className="h-3.5 w-3.5" />Grade</button>
          </div>
          <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Novo Modelo</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar modelo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterCategory("all"); }} className="text-xs gap-1 h-9">
              <X className="h-3 w-3" />Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Folders */}
      <TemplateFolderManager
        folders={folders} setFolders={setFolders}
        activeFolderId={activeFolderId} setActiveFolderId={setActiveFolderId}
        itemLabel="modelo"
      />

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum modelo encontrado</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {hasFilters ? "Tente ajustar os filtros." : 'Clique em "Novo Modelo" para começar.'}
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Categoria</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground hidden sm:table-cell">Segmento</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground hidden md:table-cell">Série</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground hidden md:table-cell">Tamanho</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground hidden lg:table-cell">Data</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", d.id); e.dataTransfer.effectAllowed = "move"; }} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{d.name}</p>
                        {d.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{d.description}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[11px] font-medium">{d.category || "Geral"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{d.segment || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{d.grade || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{formatFileSize(d.file_size)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(d)} title="Editar">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <a href={d.file_url} download target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Baixar"><Download className="h-4 w-4 text-muted-foreground" /></Button>
                        </a>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setDeleting(d); setDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <div
              key={d.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", d.id); e.dataTransfer.effectAllowed = "move"; }}
              className="rounded-xl border border-border bg-card p-4 space-y-3 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 group"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 flex-shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{d.name}</p>
                  {d.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{d.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] font-medium">{d.category || "Geral"}</Badge>
                {d.segment && <Badge variant="outline" className="text-[10px]">{d.segment}</Badge>}
                {d.grade && <Badge variant="outline" className="text-[10px]">{d.grade}</Badge>}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{formatFileSize(d.file_size)}</span>
                  <span>•</span>
                  <span>{new Date(d.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
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
              {editingDoc ? "Atualize os dados do modelo." : "Faça upload de um arquivo .doc ou .docx como modelo base."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Modelo Bimestral 2026" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Breve descrição do modelo..." rows={2} />
            </div>
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
              <Label className="text-xs">Arquivo {editingDoc ? "(opcional)" : "*"}</Label>
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
