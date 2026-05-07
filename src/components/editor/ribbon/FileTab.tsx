/**
 * FileTab — Word-style "Arquivo" ribbon tab.
 *
 * Centralizes file lifecycle actions: Novo, Abrir, Salvar, Salvar como modelo,
 * Exportar PDF, Exportar DOCX, Imprimir, Propriedades do documento.
 *
 * "Abrir" lists user templates from `professor_templates` AND lets the user
 * import a .docx file from disk. "Salvar como modelo" stores the current
 * editor HTML directly into `professor_templates`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import {
  FilePlus, FolderOpen, Save, FileText, FileType, Printer, Info, BookmarkPlus,
  Loader2, Search, Upload, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { RibbonStackedBtn, RibbonGroup, RibbonDivider } from "./RibbonShared";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
import { exportToDocx } from "@/lib/exportDocx";
import { exportPDF, printDocument } from "@/lib/exportPrint";
import { useDocumentOptional } from "../core/DocumentContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FileTabProps {
  editor: Editor;
  defaultFilename?: string;
}

interface TemplateRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: string;
  updated_at: string;
}

export function FileTab({ editor, defaultFilename = "documento" }: FileTabProps) {
  const docCtx = useDocumentOptional();
  const { user } = useAuth();
  const docxInputRef = useRef<HTMLInputElement>(null);

  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [saveTplOpen, setSaveTplOpen] = useState(false);

  // Templates list state (Open dialog)
  const [tplLoading, setTplLoading] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [tplFilter, setTplFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Save-as-template form state
  const [tplForm, setTplForm] = useState({ title: "", description: "", category: "Geral" });
  const [tplSaving, setTplSaving] = useState(false);

  // Document properties (mirrors DocumentContext when wrapped)
  const [meta, setMeta] = useState(() => ({
    title: docCtx?.model.metadata.title ?? "",
    author: docCtx?.model.metadata.author ?? "",
    subject: docCtx?.model.metadata.subject ?? "",
    keywords: (docCtx?.model.metadata.keywords ?? []).join(", "),
  }));

  // ── Templates fetching ────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    setTplLoading(true);
    const { data, error } = await supabase
      .from("professor_templates")
      .select("id,title,description,category,content,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error(error);
      showInvokeError("Não foi possível carregar os modelos.");
    } else {
      setTemplates((data ?? []) as TemplateRow[]);
    }
    setTplLoading(false);
  }, [user]);

  useEffect(() => {
    if (openDialogOpen) fetchTemplates();
  }, [openDialogOpen, fetchTemplates]);

  // ── Actions ───────────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    if (editor.isEmpty || editor.getText().trim().length < 5) {
      editor.chain().focus().clearContent(true).run();
      return;
    }
    setConfirmNewOpen(true);
  }, [editor]);

  const confirmNew = useCallback(() => {
    editor.chain().focus().clearContent(true).run();
    setConfirmNewOpen(false);
    showInvokeSuccess("Novo documento criado.");
  }, [editor]);

  const handleOpen = useCallback(() => setOpenDialogOpen(true), []);

  const triggerDocxPicker = useCallback(() => docxInputRef.current?.click(), []);

  const handleDocxUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      showInvokeError("Arquivo muito grande (máx. 25 MB).");
      e.target.value = "";
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.convertToHtml({ arrayBuffer }, {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "b => strong", "i => em", "u => u",
        ],
      } as any);
      editor.commands.setContent(result.value || "<p></p>");
      const baseName = file.name.replace(/\.docx$/i, "");
      setMeta(m => ({ ...m, title: m.title || baseName }));
      docCtx?.dispatch({ type: "PATCH_METADATA", patch: { title: baseName } });
      showInvokeSuccess(`"${file.name}" carregado com sucesso!`);
      setOpenDialogOpen(false);
    } catch (err) {
      console.error("DOCX import error:", err);
      showInvokeError("Erro ao carregar o arquivo.");
    }
    e.target.value = "";
  }, [editor, docCtx]);

  const loadTemplate = useCallback((tpl: TemplateRow) => {
    editor.commands.setContent(tpl.content || "<p></p>");
    setMeta(m => ({ ...m, title: tpl.title }));
    docCtx?.dispatch({ type: "PATCH_METADATA", patch: { title: tpl.title, subject: tpl.category } });
    showInvokeSuccess(`"${tpl.title}" carregado.`);
    setOpenDialogOpen(false);
  }, [editor, docCtx]);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from("professor_templates").delete().eq("id", id);
    if (error) { showInvokeError("Erro ao excluir modelo."); return; }
    setTemplates(t => t.filter(x => x.id !== id));
    setDeletingId(null);
    showInvokeSuccess("Modelo excluído.");
  }, []);

  const handleSave = useCallback(() => {
    document.dispatchEvent(new CustomEvent("editor-save"));
    showInvokeSuccess("Salvando documento...");
  }, []);

  const handleOpenSaveTemplate = useCallback(() => {
    setTplForm({
      title: meta.title || "",
      description: "",
      category: meta.subject || "Geral",
    });
    setSaveTplOpen(true);
  }, [meta]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!user) { showInvokeError("Faça login para salvar modelos."); return; }
    if (!tplForm.title.trim()) { showInvokeError("Informe o título do modelo."); return; }
    const html = editor.getHTML();
    if (!html || html === "<p></p>") { showInvokeError("Documento vazio."); return; }

    setTplSaving(true);
    const { error } = await supabase.from("professor_templates").insert({
      user_id: user.id,
      title: tplForm.title.trim(),
      description: tplForm.description.trim() || null,
      category: tplForm.category.trim() || "Geral",
      content: html,
    });
    setTplSaving(false);
    if (error) {
      console.error(error);
      showInvokeError("Erro ao salvar modelo.");
      return;
    }
    showInvokeSuccess("Modelo salvo!");
    setSaveTplOpen(false);
  }, [user, tplForm, editor]);

  const handleExportPDF = useCallback(() => {
    if (!exportPDF()) showInvokeError("Conteúdo não encontrado ou popup bloqueado.");
  }, []);

  const handleExportDocx = useCallback(() => {
    try {
      exportToDocx(editor.getHTML(), meta.title || defaultFilename);
      showInvokeSuccess("Exportação DOCX iniciada.");
    } catch (err) {
      console.error(err);
      showInvokeError("Falha ao exportar DOCX.");
    }
  }, [editor, meta.title, defaultFilename]);

  const handlePrint = useCallback(() => {
    if (!printDocument()) showInvokeError("Não foi possível abrir a impressão.");
  }, []);

  const saveProperties = useCallback(() => {
    docCtx?.dispatch({
      type: "PATCH_METADATA",
      patch: {
        title: meta.title,
        author: meta.author,
        subject: meta.subject,
        keywords: meta.keywords.split(",").map(k => k.trim()).filter(Boolean),
      },
    });
    setPropsOpen(false);
    showInvokeSuccess("Propriedades atualizadas.");
  }, [docCtx, meta]);

  const filteredTemplates = templates.filter(t => {
    if (!tplFilter.trim()) return true;
    const q = tplFilter.toLowerCase();
    return t.title.toLowerCase().includes(q)
      || (t.description || "").toLowerCase().includes(q)
      || t.category.toLowerCase().includes(q);
  });

  return (
    <>
      <RibbonGroup label="Arquivo">
        <RibbonStackedBtn onClick={handleNew} icon={FilePlus} label="Novo" shortcut="Ctrl+N"
          description="Criar um documento em branco" />
        <RibbonStackedBtn onClick={handleOpen} icon={FolderOpen} label="Abrir" shortcut="Ctrl+O"
          description="Abrir um modelo salvo ou importar arquivo .docx" />
        <RibbonStackedBtn onClick={handleSave} icon={Save} label="Salvar" shortcut="Ctrl+S"
          description="Salvar alterações no documento atual" />
        <RibbonStackedBtn onClick={handleOpenSaveTemplate} icon={BookmarkPlus} label="Modelo"
          description="Salvar o documento atual como modelo reutilizável" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Exportar">
        <RibbonStackedBtn onClick={handleExportPDF} icon={FileText} label="PDF"
          description="Gerar PDF do documento" />
        <RibbonStackedBtn onClick={handleExportDocx} icon={FileType} label="DOCX"
          description="Exportar para Microsoft Word (.docx)" />
        <RibbonStackedBtn onClick={handlePrint} icon={Printer} label="Imprimir" shortcut="Ctrl+P"
          description="Abrir diálogo de impressão" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Documento">
        <RibbonStackedBtn onClick={() => setPropsOpen(true)} icon={Info} label="Propriedades"
          description="Editar título, autor, assunto e palavras-chave" />
      </RibbonGroup>

      <input ref={docxInputRef} type="file" accept=".docx" className="hidden" onChange={handleDocxUpload} />

      {/* New document confirmation */}
      <AlertDialog open={confirmNewOpen} onOpenChange={setConfirmNewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar novo documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo atual será descartado. Salve antes se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNew}>Criar novo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Open dialog: templates + import .docx */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Abrir documento</DialogTitle>
            <DialogDescription>Escolha um modelo salvo ou importe um arquivo .docx.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, categoria…"
                  value={tplFilter}
                  onChange={(e) => setTplFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" onClick={triggerDocxPicker}>
                <Upload className="h-4 w-4 mr-1" />
                Importar .docx
              </Button>
            </div>

            <ScrollArea className="h-[320px] rounded-md border">
              {tplLoading ? (
                <div className="flex items-center justify-center h-full py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando modelos…
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-1">
                  <FileText className="h-8 w-8 opacity-50" />
                  <p>Nenhum modelo encontrado.</p>
                  <p className="text-xs">Use "Modelo" no ribbon para salvar o documento atual.</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {filteredTemplates.map(tpl => (
                    <li key={tpl.id} className="flex items-start gap-3 p-3 hover:bg-accent/40 transition-colors">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadTemplate(tpl)}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{tpl.title}</span>
                          <Badge variant="secondary" className="text-[10px]">{tpl.category}</Badge>
                        </div>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{tpl.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Atualizado em {new Date(tpl.updated_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeletingId(tpl.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save-as-template dialog */}
      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Salvar como modelo</DialogTitle>
            <DialogDescription>Reutilize este documento como base para novos arquivos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-title">Título *</Label>
              <Input id="tpl-title" value={tplForm.title}
                onChange={(e) => setTplForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-cat">Categoria</Label>
              <Input id="tpl-cat" value={tplForm.category}
                onChange={(e) => setTplForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Ex: Provas, Atividades, Geral" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Descrição</Label>
              <Textarea id="tpl-desc" rows={3} value={tplForm.description}
                onChange={(e) => setTplForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTplOpen(false)} disabled={tplSaving}>Cancelar</Button>
            <Button onClick={handleSaveAsTemplate} disabled={tplSaving}>
              {tplSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Salvar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete template confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteTemplate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document properties */}
      <Dialog open={propsOpen} onOpenChange={setPropsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Propriedades do documento</DialogTitle>
            <DialogDescription>Metadados utilizados em exportações e impressão.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Título</Label>
              <Input id="doc-title" value={meta.title}
                onChange={(e) => setMeta(m => ({ ...m, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-author">Autor</Label>
              <Input id="doc-author" value={meta.author}
                onChange={(e) => setMeta(m => ({ ...m, author: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-subject">Assunto / Categoria</Label>
              <Input id="doc-subject" value={meta.subject}
                onChange={(e) => setMeta(m => ({ ...m, subject: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-keywords">Palavras-chave (separadas por vírgula)</Label>
              <Textarea id="doc-keywords" rows={2} value={meta.keywords}
                onChange={(e) => setMeta(m => ({ ...m, keywords: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPropsOpen(false)}>Cancelar</Button>
            <Button onClick={saveProperties}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
