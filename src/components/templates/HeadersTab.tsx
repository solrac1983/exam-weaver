import { useState, useEffect, useRef, useMemo } from "react";
import { TemplateFolderManager, TemplateFolder } from "./TemplateFolderManager";
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
import {
  Image as ImageIcon, Plus, Trash2, Upload, Eye, Search, X, Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TemplateHeader, segmentOptions, gradeOptions } from "./TemplateConstants";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  folders: TemplateFolder[];
  setFolders: React.Dispatch<React.SetStateAction<TemplateFolder[]>>;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
}

export function HeadersTab({ folders, setFolders, activeFolderId, setActiveFolderId }: Props) {
  const [items, setItems] = useState<TemplateHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHeader, setEditingHeader] = useState<TemplateHeader | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<TemplateHeader | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filterSegment, setFilterSegment] = useState("all");
  const [search, setSearch] = useState("");

  const [formName, setFormName] = useState("");
  const [formSegment, setFormSegment] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchHeaders = async () => {
    const { data, error } = await supabase.from("template_headers").select("*").order("created_at", { ascending: false });
    if (error) { showInvokeError("Erro ao carregar cabeçalhos."); console.error(error); }
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchHeaders(); }, []);

  const itemsInFolders = useMemo(() => {
    const set = new Set<string>();
    folders.forEach((f) => f.itemIds.forEach((id) => set.add(id)));
    return set;
  }, [folders]);

  const filtered = items.filter((h) => {
    if (activeFolderId) {
      const folder = folders.find((f) => f.id === activeFolderId);
      if (!folder?.itemIds.includes(h.id)) return false;
    } else {
      if (itemsInFolders.has(h.id)) return false;
    }
    if (filterSegment !== "all" && h.segment !== filterSegment) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!h.name.toLowerCase().includes(s) && !(h.segment || "").toLowerCase().includes(s) && !(h.grade || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const handleUpload = async () => {
    if (!formName.trim()) { showInvokeError("Preencha o nome."); return; }

    if (editingHeader) {
      setUploading(true);
      let file_path = editingHeader.file_path;
      let file_url = editingHeader.file_url;

      if (formFile) {
        const ext = formFile.name.split(".").pop();
        const newPath = `${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("template-headers").upload(newPath, formFile);
        if (uploadErr) { showInvokeError("Erro no upload."); setUploading(false); return; }
        await supabase.storage.from("template-headers").remove([editingHeader.file_path]);
        const { data: urlData } = supabase.storage.from("template-headers").getPublicUrl(newPath);
        file_path = newPath;
        file_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("template_headers").update({
        name: formName.trim(), segment: formSegment || null, grade: formGrade || null, file_path, file_url,
      }).eq("id", editingHeader.id);

      if (error) showInvokeError("Erro ao atualizar.");
      else { showInvokeSuccess("Cabeçalho atualizado!"); setFormOpen(false); fetchHeaders(); }
      setUploading(false);
      return;
    }

    if (!formFile) { showInvokeError("Selecione uma imagem."); return; }
    setUploading(true);
    const ext = formFile.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("template-headers").upload(path, formFile);
    if (uploadErr) { showInvokeError("Erro no upload."); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("template-headers").getPublicUrl(path);

    const { error: insertErr } = await supabase.from("template_headers").insert({
      name: formName.trim(), segment: formSegment || null, grade: formGrade || null, file_path: path, file_url: urlData.publicUrl,
    });

    if (insertErr) showInvokeError("Erro ao salvar.");
    else { showInvokeSuccess("Cabeçalho adicionado!"); setFormOpen(false); fetchHeaders(); }
    setUploading(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await supabase.storage.from("template-headers").remove([deleting.file_path]);
    await supabase.from("template_headers").delete().eq("id", deleting.id);
    showInvokeSuccess("Cabeçalho excluído.");
    setDeleteOpen(false); setDeleting(null); fetchHeaders();
  };

  const openNew = () => {
    setEditingHeader(null);
    setFormName(""); setFormSegment(""); setFormGrade(""); setFormFile(null);
    setFormOpen(true);
  };

  const openEdit = (h: TemplateHeader) => {
    setEditingHeader(h);
    setFormName(h.name); setFormSegment(h.segment || ""); setFormGrade(h.grade || ""); setFormFile(null);
    setFormOpen(true);
  };

  const hasFilters = search || filterSegment !== "all";

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
            <ImageIcon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{filtered.length} cabeçalho(s)</p>
            <p className="text-xs text-muted-foreground">Imagens de cabeçalho para provas</p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo Cabeçalho
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cabeçalho..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={filterSegment} onValueChange={setFilterSegment}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos segmentos</SelectItem>
              {segmentOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterSegment("all"); }} className="text-xs gap-1 h-9">
              <X className="h-3 w-3" />Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Folders */}
      <TemplateFolderManager
        folders={folders} setFolders={setFolders}
        activeFolderId={activeFolderId} setActiveFolderId={setActiveFolderId}
        itemLabel="cabeçalho"
      />

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <Skeleton className="aspect-[3/1]" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum cabeçalho encontrado</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {hasFilters ? "Tente ajustar os filtros." : 'Clique em "Novo Cabeçalho" para começar.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((h) => (
            <div
              key={h.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", h.id); e.dataTransfer.effectAllowed = "move"; }}
              className="rounded-xl border border-border bg-card overflow-hidden group hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
            >
              <div
                className="aspect-[3/1] bg-muted/50 relative cursor-pointer overflow-hidden"
                onClick={() => setPreviewUrl(h.file_url)}
              >
                <img src={h.file_url} alt={h.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]" />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-2">
                    <Eye className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="font-semibold text-foreground text-sm truncate">{h.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {h.segment && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium">
                      {h.segment}
                    </Badge>
                  )}
                  {h.grade && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                      {h.grade}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(h)} title="Editar">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setDeleting(h); setDeleteOpen(true); }} title="Excluir">
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
              {editingHeader ? "Atualize os dados do cabeçalho." : "Faça upload de uma imagem para usar como cabeçalho de provas."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Cabeçalho Ensino Médio 2026" />
            </div>
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
              <Label className="text-xs">Imagem {editingHeader ? "(opcional)" : "*"}</Label>
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
          <DialogHeader><DialogTitle>Pré-visualização</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Cabeçalho" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
