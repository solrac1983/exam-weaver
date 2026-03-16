import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImage } from "./ResizableImageExtension";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Table as TableExtension, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Color, TextStyle, FontFamily } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import Link from "@tiptap/extension-link";
import { Mathematics } from "./MathExtension";
import { BlankPage } from "./BlankPageExtension";
import { FontSize } from "./FontSizeExtension";
import { LineHeight } from "./LineHeightExtension";
import { EditorRibbon } from "./EditorRibbon";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorRuler, type TabStop } from "./EditorRuler";
import { PageHeaderFooterOverlay, defaultHeaderFooterConfig, type HeaderFooterConfig } from "./PageHeaderFooterOverlay";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { ChartData } from "./ChartEditorTab";
import { FloatingToolbar } from "./FloatingToolbar";
import { Pagination } from "./PaginationExtension";
import { HardPageBreak } from "./HardPageBreakExtension";
import { AutoNumbering } from "./AutoNumberingExtension";
import { SpellCheckPanel, type SpellSuggestion } from "./SpellCheckPanel";
import { FindReplacePanel } from "./FindReplacePanel";
import { supabase } from "@/integrations/supabase/client";

interface RichEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  showDataPanel?: boolean;
  onToggleDataPanel?: () => void;
  onChartDataChange?: (data: ChartData | null) => void;
  onChartUpdate?: (data: ChartData) => void;
  showComments?: boolean;
  onToggleComments?: () => void;
  saveStatus?: "saved" | "saving" | "unsaved";
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function RichEditor({ content = "", onChange, placeholder = "Comece a escrever sua prova...", showDataPanel, onToggleDataPanel, onChartDataChange, onChartUpdate, showComments, onToggleComments, saveStatus, headerLeft, headerRight }: RichEditorProps) {
  const [zoom, setZoom] = useState(100);
  const [showRuler, setShowRuler] = useState(true);
  const [marginLeft, setMarginLeft] = useState(38);
  const [marginRight, setMarginRight] = useState(38);
  const [firstLineIndent, setFirstLineIndent] = useState(0);
  const [tabStops, setTabStops] = useState<TabStop[]>([]);
  const [headerFooterConfig, setHeaderFooterConfig] = useState<HeaderFooterConfig>(defaultHeaderFooterConfig);
  const [tiptapEl, setTiptapEl] = useState<HTMLElement | null>(null);
  const [showSpellCheck, setShowSpellCheck] = useState(false);
  const [spellSuggestions, setSpellSuggestions] = useState<SpellSuggestion[]>([]);
  const [isSpellCheckLoading, setIsSpellCheckLoading] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState<"find" | "replace">("find");
  const [focusMode, setFocusMode] = useState(false);

  // Track the .tiptap element once editor mounts
  const examPageRef = useRef<HTMLDivElement>(null);
  const syncTiptapEl = useCallback(() => {
    if (examPageRef.current) {
      const el = examPageRef.current.querySelector(
        '.tiptap, .ProseMirror, [contenteditable="true"], [role="textbox"]'
      ) as HTMLElement | null;
      if (el && el !== tiptapEl) {
        setTiptapEl(el);
      }
    }
  }, [tiptapEl]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      ResizableImage,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      UnderlineExtension,
      Placeholder.configure({ placeholder }),
      TableExtension.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      TextStyle, Color,
      Highlight.configure({ multicolor: true }),
      Superscript, Subscript, FontFamily,
      FontSize, LineHeight,
      Mathematics, BlankPage,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      HardPageBreak,
      AutoNumbering,
      Pagination.configure({
        pageHeightPx: 29.7 * 37.7952755906,
        pagePaddingTopPx: 1 * 37.7952755906,
        pagePaddingBottomPx: 1 * 37.7952755906,
        pageGapPx: 2 * 37.7952755906,
      }),
    ],
    content,
    onUpdate: ({ editor }) => { onChange?.(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none text-sm leading-relaxed",
        spellcheck: "true",
        lang: "pt-BR",
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          if (event.shiftKey) {
            document.dispatchEvent(new CustomEvent('editor-save-as'));
            toast.info("Use os botões de exportação para salvar em diferentes formatos.");
          } else {
            document.dispatchEvent(new CustomEvent('editor-save'));
            toast.success("Documento salvo!");
          }
          return true;
        }
        return false;
      },
    },
  });

  const [marginTop, setMarginTop] = useState(38);
  const [marginBottom, setMarginBottom] = useState(38);

  // Listen for margin changes from LayoutTab
  useEffect(() => {
    const handler = (e: Event) => {
      const { top, bottom, left, right } = (e as CustomEvent).detail;
      setMarginLeft(left);
      setMarginRight(right);
      setMarginTop(top);
      setMarginBottom(bottom);
    };
    window.addEventListener('editor-margins-change', handler);
    return () => window.removeEventListener('editor-margins-change', handler);
  }, []);

  // Sync margins to editor element and CSS custom properties
  useEffect(() => {
    if (!tiptapEl) return;

    tiptapEl.style.setProperty('--page-pad-left', `${marginLeft}px`);
    tiptapEl.style.setProperty('--page-pad-right', `${marginRight}px`);
    tiptapEl.style.setProperty('--page-pad-top', `${marginTop}px`);
    tiptapEl.style.setProperty('--page-pad-bottom', `${marginBottom}px`);
    tiptapEl.style.setProperty('--page-pad-x', `${marginLeft}px`);
    tiptapEl.style.setProperty('--page-pad-y', `${marginTop}px`);

    tiptapEl.style.paddingLeft = `${marginLeft}px`;
    tiptapEl.style.paddingRight = `${marginRight}px`;
    tiptapEl.style.paddingTop = `${marginTop}px`;
    tiptapEl.style.paddingBottom = `${marginBottom}px`;

    if (examPageRef.current) {
      examPageRef.current.style.setProperty('--page-pad-left', `${marginLeft}px`);
      examPageRef.current.style.setProperty('--page-pad-right', `${marginRight}px`);
      examPageRef.current.style.setProperty('--page-pad-top', `${marginTop}px`);
      examPageRef.current.style.setProperty('--page-pad-bottom', `${marginBottom}px`);
    }
  }, [tiptapEl, marginLeft, marginRight, marginTop, marginBottom]);

  // Sync first-line indent
  useEffect(() => {
    let style = document.querySelector('#editor-first-line-indent') as HTMLStyleElement;
    if (!style) { style = document.createElement('style'); style.id = 'editor-first-line-indent'; document.head.appendChild(style); }
    style.textContent = firstLineIndent > 0
      ? `.tiptap p { text-indent: ${firstLineIndent}px; }`
      : '';
  }, [firstLineIndent]);

  // Sync tab stops to CSS
  useEffect(() => {
    let style = document.querySelector('#editor-tab-stops') as HTMLStyleElement;
    if (!style) { style = document.createElement('style'); style.id = 'editor-tab-stops'; document.head.appendChild(style); }
    if (tabStops.length > 0) {
      const firstStop = tabStops[0];
      const tabSize = firstStop ? Math.round(firstStop.position - marginLeft) : 48;
      style.textContent = `.tiptap { tab-size: ${Math.max(1, tabSize)}px; -moz-tab-size: ${Math.max(1, tabSize)}px; }`;
    } else {
      style.textContent = '';
    }
  }, [tabStops, marginLeft]);

  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Sync tiptap element after render
  useEffect(() => {
    const t = setTimeout(syncTiptapEl, 50);
    return () => clearTimeout(t);
  });

  // Page breaks are now handled by the Pagination ProseMirror plugin

  const handleAIReview = useCallback(async () => {
    if (!editor) return;
    const text = editor.getText();
    if (!text.trim()) {
      toast.info("O documento está vazio.");
      return;
    }
    setShowSpellCheck(true);
    setIsSpellCheckLoading(true);
    setSpellSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("spell-check", {
        body: { text: text.substring(0, 8000) },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setSpellSuggestions(data?.suggestions || []);
      if ((data?.suggestions || []).length === 0) {
        toast.success("Nenhum problema encontrado!");
      }
    } catch (e: any) {
      console.error("AI Review error:", e);
      toast.error("Erro ao realizar revisão com IA.");
    } finally {
      setIsSpellCheckLoading(false);
    }
  }, [editor]);

  const handleApplySuggestion = useCallback((suggestion: SpellSuggestion) => {
    if (!editor) return;
    const html = editor.getHTML();
    const escaped = suggestion.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, '');
    const newHtml = html.replace(regex, suggestion.correction);
    if (newHtml !== html) {
      editor.commands.setContent(newHtml);
      onChange?.(newHtml);
    }
  }, [editor, onChange]);

  const handleApplyAll = useCallback(() => {
    if (!editor) return;
    let html = editor.getHTML();
    for (const s of spellSuggestions) {
      const escaped = s.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, '');
      html = html.replace(regex, s.correction);
    }
    editor.commands.setContent(html);
    onChange?.(html);
    toast.success("Todas as sugestões foram aplicadas!");
  }, [editor, spellSuggestions, onChange]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="w-full sticky top-0 z-20 shrink-0">
        <EditorRibbon
          editor={editor}
          zoom={zoom}
          onZoomChange={setZoom}
          showDataPanel={showDataPanel}
          onToggleDataPanel={onToggleDataPanel}
          onChartDataChange={onChartDataChange}
          onChartUpdate={onChartUpdate}
          showComments={showComments}
          onToggleComments={onToggleComments}
          headerFooterConfig={headerFooterConfig}
          onHeaderFooterConfigChange={setHeaderFooterConfig}
          headerLeft={headerLeft}
          headerRight={headerRight}
          onAIReview={handleAIReview}
          isAIReviewLoading={isSpellCheckLoading}
        />
      </div>
      <div className="flex flex-1 min-h-0">
        {/* Vertical ruler — Word-like */}
        <div className="word-vertical-ruler shrink-0 select-none hidden md:flex flex-col" style={{ width: '22px', marginTop: '4px' }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="relative" style={{ height: '37.8px' }}>
              {i > 0 && i % 2 === 0 && (
                <span className="absolute right-1.5 text-[8px] text-muted-foreground leading-none" style={{ top: '-4px' }}>
                  {i / 2}
                </span>
              )}
              <div className="absolute right-0 w-1 border-t border-border/40" style={{ top: 0 }} />
              {i % 2 === 1 && <div className="absolute right-0 w-2 border-t border-border/60" style={{ top: 0 }} />}
            </div>
          ))}
        </div>

        {/* Main desk area */}
        <div className="flex-1 min-h-0 flex flex-col">
          {showRuler && (
            <div className="flex justify-center shrink-0 sticky top-0 z-10 bg-background" style={{ zoom: zoom / 100 }}>
              <EditorRuler
                marginLeft={marginLeft}
                marginRight={marginRight}
                onMarginLeftChange={setMarginLeft}
                onMarginRightChange={setMarginRight}
                firstLineIndent={firstLineIndent}
                onFirstLineIndentChange={setFirstLineIndent}
                tabStops={tabStops}
                onTabStopsChange={setTabStops}
              />
            </div>
          )}
          <div className="editor-desk flex-1 min-h-0 overflow-auto">
            <div className="editor-desk-inner" style={{ zoom: zoom / 100 }}>
              <div className="exam-page" ref={examPageRef} style={{ position: 'relative' }}>
                {tiptapEl && <FloatingToolbar editor={editor} />}
                <div className="editor-page-shell">
                  <EditorContent editor={editor} />
                </div>
                {tiptapEl && <PageHeaderFooterOverlay config={headerFooterConfig} editorEl={tiptapEl} />}
              </div>
            </div>
          </div>
        </div>

        {/* Spell Check Panel */}
        {showSpellCheck && (
          <SpellCheckPanel
            suggestions={spellSuggestions}
            isLoading={isSpellCheckLoading}
            onClose={() => setShowSpellCheck(false)}
            onApply={handleApplySuggestion}
            onApplyAll={handleApplyAll}
          />
        )}
      </div>
      <div className="w-full sticky bottom-0 z-20 shrink-0">
        <EditorStatusBar editor={editor} zoom={zoom} onZoomChange={setZoom} saveStatus={saveStatus} />
      </div>
    </div>
  );
}
