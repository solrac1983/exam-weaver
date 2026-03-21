import { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Heading1, Heading2,
  Heading3, Undo, Redo, Quote, Superscript, Subscript, Highlighter,
  Palette, Type, Save, FilePlus, FolderOpen, FileDown,
  ALargeSmall, Paintbrush, Eraser, CaseSensitive,
  Search, Replace, SpellCheck, MousePointer2, ListChecks,
  GaugeCircle, ArrowDownAZ, ArrowUpAZ, BarChart2, AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { RibbonBtn, RibbonStackedBtn, RibbonGroup, RibbonDivider } from "./RibbonShared";
import { textColors, highlightColors, fontSizes, moreFonts } from "./RibbonConstants";

interface HomeTabProps {
  editor: Editor;
  onAIReview?: () => void;
  isAIReviewLoading?: boolean;
}

export function HomeTab({ editor, onAIReview, isAIReviewLoading }: HomeTabProps) {
  const docxInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [formatPainterMarks, setFormatPainterMarks] = useState<any[] | null>(null);
  const formatPainterRef = useRef<any[] | null>(null);

  useEffect(() => { formatPainterRef.current = formatPainterMarks; }, [formatPainterMarks]);

  useEffect(() => {
    const editorEl = document.querySelector('.ProseMirror') as HTMLElement | null;
    if (editorEl) {
      if (formatPainterMarks) {
        editorEl.style.cursor = 'crosshair';
        editorEl.classList.add('format-painter-active');
      } else {
        editorEl.style.cursor = '';
        editorEl.classList.remove('format-painter-active');
      }
    }
    return () => {
      if (editorEl) { editorEl.style.cursor = ''; editorEl.classList.remove('format-painter-active'); }
    };
  }, [formatPainterMarks]);

  useEffect(() => {
    const editorEl = document.querySelector('.ProseMirror') as HTMLElement | null;
    const applyPainter = () => {
      const marks = formatPainterRef.current;
      if (!marks) return;
      requestAnimationFrame(() => {
        const { from, to } = editor.state.selection;
        if (from === to) return;
        const tr = editor.state.tr;
        editor.state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isText) {
            node.marks.forEach((mark) => {
              tr.removeMark(Math.max(pos, from), Math.min(pos + node.nodeSize, to), mark.type);
            });
          }
        });
        marks.forEach((mark: any) => tr.addMark(from, to, mark));
        editor.view.dispatch(tr);
        setFormatPainterMarks(null);
        toast.success("Formatação aplicada!");
      });
    };
    const handleSelectionUpdate = () => {
      if (!formatPainterRef.current) return;
      const { from, to } = editor.state.selection;
      if (from !== to) applyPainter();
    };
    editor.on("selectionUpdate", handleSelectionUpdate);
    editorEl?.addEventListener('mouseup', applyPainter);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editorEl?.removeEventListener('mouseup', applyPainter);
    };
  }, [editor]);

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.convertToHtml({ arrayBuffer });
      editor.commands.setContent(result.value);
      setUploadStatus(`✓ "${file.name}" carregado com sucesso!`);
      setTimeout(() => setUploadStatus(null), 3000);
    } catch {
      setUploadStatus("✗ Erro ao carregar o arquivo.");
      setTimeout(() => setUploadStatus(null), 3000);
    }
    e.target.value = "";
  };

  const sortContent = (direction: 'asc' | 'desc') => {
    const html = editor.getHTML();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements = Array.from(doc.body.children);
    elements.sort((a, b) => {
      const textA = (a.textContent || '').trim().toLowerCase();
      const textB = (b.textContent || '').trim().toLowerCase();
      return direction === 'asc' ? textA.localeCompare(textB) : textB.localeCompare(textA);
    });
    editor.commands.setContent(elements.map(el => el.outerHTML).join(''));
  };

  const openFind = () => {
    window.dispatchEvent(new CustomEvent('editor-open-find-replace', { detail: { mode: 'find' } }));
  };

  const openReplace = () => {
    window.dispatchEvent(new CustomEvent('editor-open-find-replace', { detail: { mode: 'replace' } }));
  };

  const activateFormatPainter = () => {
    if (formatPainterMarks) {
      setFormatPainterMarks(null);
      toast.info("Pincel de formatação cancelado.");
      return;
    }
    const { from, to, $from } = editor.state.selection;
    let marks: readonly any[] = [];
    if (from === to) {
      marks = editor.state.storedMarks || $from.marks();
      if (marks.length === 0 && from > 0) marks = editor.state.doc.resolve(from - 1).marks();
    } else {
      editor.state.doc.nodesBetween(from, to, (node) => {
        if (node.isText && node.marks.length > 0 && marks.length === 0) marks = node.marks;
      });
    }
    if (marks.length === 0) {
      toast.info("Posicione o cursor em um texto formatado ou selecione-o.");
      return;
    }
    setFormatPainterMarks([...marks]);
    toast.success("Formatação copiada! Agora selecione o texto destino.");
  };

  return (
    <>
      {formatPainterMarks && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2">
          <Paintbrush className="h-3 w-3" />
          Selecione o texto destino para aplicar a formatação
          <button onClick={() => { setFormatPainterMarks(null); toast.info("Pincel cancelado."); }} className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5">✕</button>
        </div>
      )}

      <RibbonGroup label="ARQUIVO">
        <RibbonStackedBtn onClick={() => editor.commands.clearContent()} icon={FilePlus} label="Novo" />
        <RibbonStackedBtn onClick={() => docxInputRef.current?.click()} icon={FolderOpen} label="Abrir" />
        <RibbonStackedBtn onClick={() => { document.dispatchEvent(new CustomEvent('editor-save')); toast.success("Documento salvo!"); }} icon={Save} label="Salvar" />
        <RibbonStackedBtn onClick={() => { document.dispatchEvent(new CustomEvent('editor-save-as')); toast.info("Use os botões de exportação para salvar em diferentes formatos."); }} icon={FileDown} label="Exportar" />
        <input ref={docxInputRef} type="file" accept=".docx" className="hidden" onChange={handleDocxUpload} />
      </RibbonGroup>
      {uploadStatus && (
        <div className={cn("flex items-center px-3 py-1 rounded-md text-xs font-medium animate-in fade-in-0", uploadStatus.startsWith("✓") ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
          {uploadStatus}
        </div>
      )}

      <RibbonDivider />

      <RibbonGroup label="DESFAZER">
        <RibbonBtn onClick={() => editor.chain().focus().undo().run()} icon={Undo} label="Desfazer" shortcut="Ctrl+Z" />
        <RibbonBtn onClick={() => editor.chain().focus().redo().run()} icon={Redo} label="Refazer" shortcut="Ctrl+Y" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="FONTE">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[100px] border border-border/40 hover:border-border">
              <Type className="h-3 w-3" /><span className="truncate font-medium" style={{ fontFamily: editor.getAttributes('textStyle').fontFamily || undefined }}>{(() => {
                const active = editor.getAttributes('textStyle').fontFamily;
                if (!active) return 'Padrão';
                const match = moreFonts.find(f => f.value === active);
                return match ? match.label : active.split(',')[0].replace(/['"]/g, '');
              })()}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px] max-h-[300px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Fontes disponíveis</DropdownMenuLabel>
            {moreFonts.map((f) => (
              <DropdownMenuItem key={f.value} onClick={() => editor.chain().focus().setFontFamily(f.value).run()} style={{ fontFamily: f.value }}>{f.label}</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()}>Limpar fonte</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[56px] border border-border/40 hover:border-border">
              <ALargeSmall className="h-3 w-3" /><span className="font-medium">{(() => {
                const fs = editor.getAttributes('textStyle').fontSize;
                return fs ? fs.replace('pt', '') + 'pt' : '11pt';
              })()}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[100px] max-h-[250px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Tamanho da fonte</DropdownMenuLabel>
            {fontSizes.map((size) => (
              <DropdownMenuItem key={size} onClick={() => (editor.commands as any).setFontSize(`${size}pt`)}>
                <span style={{ fontSize: Math.min(parseInt(size), 24) + 'px' }}>{size}pt</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => (editor.commands as any).unsetFontSize()}>Tamanho padrão</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Palette className="h-[14px] w-[14px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuLabel className="text-xs">Cor do texto</DropdownMenuLabel>
            {textColors.map((c) => (
              <DropdownMenuItem key={c.value || "d"} onClick={() => c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run()}>
                <span className="h-3 w-3 rounded-full border border-border mr-2" style={{ background: c.value || "currentColor" }} />{c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("p-1.5 rounded transition-colors", editor.isActive("highlight") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              <Highlighter className="h-[14px] w-[14px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuLabel className="text-xs">Realce</DropdownMenuLabel>
            {highlightColors.map((c) => (
              <DropdownMenuItem key={c.value} onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}>
                <span className="h-3 w-3 rounded border border-border mr-2" style={{ background: c.value }} />{c.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetHighlight().run()}>Remover</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="FORMATAÇÃO">
        <RibbonBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} label="Negrito" shortcut="Ctrl+B" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} label="Itálico" shortcut="Ctrl+I" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={Underline} label="Sublinhado" shortcut="Ctrl+U" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={Strikethrough} label="Tachado" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} icon={Superscript} label="Sobrescrito" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} icon={Subscript} label="Subscrito" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="PARÁGRAFO">
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={AlignLeft} label="Alinhar à esquerda" shortcut="Ctrl+L" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={AlignCenter} label="Centralizar" shortcut="Ctrl+E" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={AlignRight} label="Alinhar à direita" shortcut="Ctrl+R" />
        <RibbonBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} icon={AlignJustify} label="Justificar" shortcut="Ctrl+J" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={List} label="Lista com marcadores" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={ListOrdered} label="Lista numerada" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={Quote} label="Citação" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Estilos">
        <div className="flex items-center gap-0.5">
          {[
            { label: "Normal", active: !editor.isActive("heading") && !editor.isActive("blockquote"), apply: () => editor.chain().focus().setParagraph().unsetAllMarks().run() },
            { label: "Título 1", active: editor.isActive("heading", { level: 1 }), apply: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
            { label: "Título 2", active: editor.isActive("heading", { level: 2 }), apply: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
            { label: "Título 3", active: editor.isActive("heading", { level: 3 }), apply: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
          ].map((style) => (
            <button
              key={style.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={style.apply}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium transition-all whitespace-nowrap border",
                style.active
                  ? "bg-primary/12 text-primary border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent hover:border-border/40"
              )}
              style={
                style.label === "Título 1" ? { fontSize: '12px', fontWeight: 700 } :
                style.label === "Título 2" ? { fontSize: '11px', fontWeight: 600 } :
                style.label === "Título 3" ? { fontSize: '10px', fontWeight: 600, fontStyle: 'italic' } :
                {}
              }
            >
              {style.label}
            </button>
          ))}
        </div>
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Ferramentas">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={activateFormatPainter}
              className={cn(
                "rounded transition-all duration-100 relative p-[6px]",
                formatPainterMarks
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40 animate-pulse"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Paintbrush className="h-[14px] w-[14px]" />
              {formatPainterMarks && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary border-2 border-card animate-ping" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[11px]">
            {formatPainterMarks ? "Clique para cancelar o pincel" : "Pincel de formatação"}
          </TooltipContent>
        </Tooltip>
        <RibbonBtn onClick={() => { editor.chain().focus().unsetAllMarks().run(); editor.chain().focus().clearNodes().run(); }} icon={Eraser} label="Limpar toda formatação" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-[6px] rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              <CaseSensitive className="h-[14px] w-[14px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs">Maiúsculas / Minúsculas</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { const { from, to } = editor.state.selection; const text = editor.state.doc.textBetween(from, to); if (text) editor.chain().focus().insertContentAt({ from, to }, text.toUpperCase()).run(); }}>MAIÚSCULAS</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const { from, to } = editor.state.selection; const text = editor.state.doc.textBetween(from, to); if (text) editor.chain().focus().insertContentAt({ from, to }, text.toLowerCase()).run(); }}>minúsculas</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const { from, to } = editor.state.selection; const text = editor.state.doc.textBetween(from, to); if (text) editor.chain().focus().insertContentAt({ from, to }, text.replace(/\b\w/g, c => c.toUpperCase())).run(); }}>Capitalizar Cada Palavra</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <RibbonBtn onClick={() => sortContent('asc')} icon={ArrowDownAZ} label="Classificar A → Z" />
        <RibbonBtn onClick={() => sortContent('desc')} icon={ArrowUpAZ} label="Classificar Z → A" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Revisão">
        <RibbonBtn onClick={openFind} icon={Search} label="Localizar" shortcut="Ctrl+F" />
        <RibbonBtn onClick={openReplace} icon={Replace} label="Substituir" shortcut="Ctrl+H" />
        <RibbonBtn
          onClick={() => {
            const editorEl = document.querySelector('.ProseMirror') as HTMLElement;
            if (editorEl) {
              const enable = editorEl.getAttribute('spellcheck') !== 'true';
              editorEl.setAttribute('spellcheck', String(enable));
              editorEl.setAttribute('lang', 'pt-BR');
              if (enable) { editorEl.blur(); setTimeout(() => editorEl.focus(), 50); }
              toast.success(enable ? 'Revisão ortográfica ativada.' : 'Revisão ortográfica desativada.');
            }
          }}
          icon={SpellCheck}
          label="Revisão ortográfica (navegador)"
        />
        <RibbonBtn
          onClick={onAIReview}
          icon={Sparkles}
          label="Revisão com IA"
          disabled={isAIReviewLoading}
        />
      </RibbonGroup>
    </>
  );
}
