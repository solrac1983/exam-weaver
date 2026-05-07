/**
 * FileTab — Word-style "Arquivo" ribbon tab.
 *
 * Centralizes file lifecycle actions: Novo, Abrir, Salvar, Salvar como modelo,
 * Exportar PDF, Exportar DOCX, Imprimir, Propriedades do documento.
 *
 * Communicates with the parent editor page via document/window events that
 * are already in use elsewhere in the codebase (`editor-save`, etc.) so this
 * tab works whether or not the editor is wrapped in <DocumentProvider>.
 */
import { useCallback, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import {
  FilePlus, FolderOpen, Save, FileText, FileType, Printer, Info, BookmarkPlus,
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
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
import { exportToDocx } from "@/lib/exportDocx";
import { exportPDF, printDocument } from "@/lib/exportPrint";
import { useDocumentOptional } from "../core/DocumentContext";

interface FileTabProps {
  editor: Editor;
  /** Optional override filename used by Exportar PDF/DOCX. */
  defaultFilename?: string;
}

export function FileTab({ editor, defaultFilename = "documento" }: FileTabProps) {
  const docCtx = useDocumentOptional();
  const docxInputRef = useRef<HTMLInputElement>(null);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);

  // Local metadata mirror — falls back to DocumentContext when available
  const [meta, setMeta] = useState(() => ({
    title: docCtx?.model.metadata.title ?? "",
    author: docCtx?.model.metadata.author ?? "",
    subject: docCtx?.model.metadata.subject ?? "",
    keywords: (docCtx?.model.metadata.keywords ?? []).join(", "),
  }));

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

  const handleOpen = useCallback(() => docxInputRef.current?.click(), []);

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
      showInvokeSuccess(`"${file.name}" carregado com sucesso!`);
    } catch (err) {
      console.error("DOCX import error:", err);
      showInvokeError("Erro ao carregar o arquivo.");
    }
    e.target.value = "";
  }, [editor]);

  const handleSave = useCallback(() => {
    document.dispatchEvent(new CustomEvent("editor-save"));
    showInvokeSuccess("Salvando documento...");
  }, []);

  const handleSaveAsTemplate = useCallback(() => {
    document.dispatchEvent(new CustomEvent("editor-save-as-template", {
      detail: { html: editor.getHTML() },
    }));
    toast.info("Salvando como modelo...");
  }, [editor]);

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
    if (docCtx) {
      docCtx.dispatch({
        type: "PATCH_METADATA",
        payload: {
          title: meta.title,
          author: meta.author,
          subject: meta.subject,
          keywords: meta.keywords.split(",").map(k => k.trim()).filter(Boolean),
        },
      });
    }
    setPropsOpen(false);
    showInvokeSuccess("Propriedades atualizadas.");
  }, [docCtx, meta]);

  return (
    <>
      <RibbonGroup label="Arquivo">
        <RibbonStackedBtn onClick={handleNew} icon={FilePlus} label="Novo" shortcut="Ctrl+N"
          description="Criar um documento em branco" />
        <RibbonStackedBtn onClick={handleOpen} icon={FolderOpen} label="Abrir" shortcut="Ctrl+O"
          description="Importar arquivo .docx do computador" />
        <RibbonStackedBtn onClick={handleSave} icon={Save} label="Salvar" shortcut="Ctrl+S"
          description="Salvar alterações no documento atual" />
        <RibbonStackedBtn onClick={handleSaveAsTemplate} icon={BookmarkPlus} label="Modelo"
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
              <Label htmlFor="doc-subject">Assunto</Label>
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
