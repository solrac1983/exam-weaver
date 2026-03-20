import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImage } from "./ResizableImageExtension";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Table as TableExtension } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import Link from "@tiptap/extension-link";
import * as Y from "yjs";
import { YjsCollaboration } from "./YjsCollaborationExtension";
import { Mathematics } from "./MathExtension";
import { BlankPage } from "./BlankPageExtension";
import { FontSize } from "./FontSizeExtension";
import { LineHeight } from "./LineHeightExtension";
import { EditorRibbon } from "./EditorRibbon";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorRuler, type TabStop } from "./EditorRuler";
import { PageHeaderFooterOverlay, defaultHeaderFooterConfig, type HeaderFooterConfig } from "./PageHeaderFooterOverlay";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { ChartData } from "./ChartEditorTab";
import { FloatingToolbar } from "./FloatingToolbar";
import { Pagination } from "./PaginationExtension";
import { HardPageBreak } from "./HardPageBreakExtension";
import { AutoNumbering } from "./AutoNumberingExtension";
import { SpellCheckPanel, type SpellSuggestion } from "./SpellCheckPanel";
import { FindReplacePanel } from "./FindReplacePanel";
import { SupabaseYjsProvider } from "./SupabaseYjsProvider";
import { CollaborationBar, COLLAB_COLORS } from "./CollaborationBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  documentId?: string;
}

export function RichEditor({ content = "", onChange, placeholder = "Comece a escrever sua prova...", showDataPanel, onToggleDataPanel, onChartDataChange, onChartUpdate, showComments, onToggleComments, saveStatus, headerLeft, headerRight, documentId }: RichEditorProps) {
  const { profile } = useAuth();
  const [zoom, setZoom] = useState(100);
  const [showRuler, setShowRuler] = useState(true);
  const [marginLeft, setMarginLeft] = useState(38);
  const [marginRight, setMarginRight] = useState(38);
  const [firstLineIndent, setFirstLineIndent] = useState(0);
  const [hangingIndent, setHangingIndent] = useState(0);
  const [tabStops, setTabStops] = useState<TabStop[]>([]);
  const [headerFooterConfig, setHeaderFooterConfig] = useState<HeaderFooterConfig>(defaultHeaderFooterConfig);
  const [tiptapEl, setTiptapEl] = useState<HTMLElement | null>(null);
  const [showSpellCheck, setShowSpellCheck] = useState(false);
  const [spellSuggestions, setSpellSuggestions] = useState<SpellSuggestion[]>([]);
  const [isSpellCheckLoading, setIsSpellCheckLoading] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState<"find" | "replace">("find");
  const [focusMode, setFocusMode] = useState(false);

  // Yjs collaboration setup
  const isCollaborative = !!documentId;
  const ydoc = useMemo(() => new Y.Doc(), []);
  const typingTimeoutRef = useRef<number | null>(null);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const initialContentRef = useRef(content);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  useEffect(() => {
    if (!isCollaborative) return;
    const provider = new SupabaseYjsProvider(documentId!, ydoc);
    providerRef.current = provider;

    // Set awareness user info
    const userName = profile?.full_name || "Anônimo";
    const userColor = COLLAB_COLORS[ydoc.clientID % COLLAB_COLORS.length];
    provider.awareness.setLocalStateField("user", {
      name: userName,
      color: userColor,
    });

    // After sync, if the Yjs doc is empty and we have initial content from DB, load it
    provider.onSync(() => {
      const yXmlFragment = ydoc.getXmlFragment("prosemirror");
      if (yXmlFragment.length === 0 && initialContentRef.current) {
        setTimeout(() => {
          if (editorRef.current && initialContentRef.current) {
            editorRef.current.commands.setContent(initialContentRef.current);
          }
        }, 100);
      }
    });

    return () => {
      provider.destroy();
      providerRef.current = null;
    };
  }, [isCollaborative, documentId, ydoc, profile?.full_name]);

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

  const collabExtensions = isCollaborative && providerRef.current
    ? [
        YjsCollaboration.configure({
          document: ydoc,
          provider: providerRef.current,
          user: {
            name: profile?.full_name || "Anônimo",
            color: COLLAB_COLORS[ydoc.clientID % COLLAB_COLORS.length],
          },
        }),
      ]
    : [];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Disable history when collaborating (Yjs handles undo/redo)
        ...(isCollaborative ? { history: false } : {}),
      }),
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
        pageGapPx: 0.5 * 37.7952755906,
      }),
      ...collabExtensions,
    ],
    content: isCollaborative ? undefined : content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
      // Broadcast typing state
      if (isCollaborative && providerRef.current) {
        providerRef.current.awareness.setLocalStateField("isTyping", true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
          providerRef.current?.awareness.setLocalStateField("isTyping", false);
        }, 1500);
      }
    },
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
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
          event.preventDefault();
          setShowFindReplace(true);
          setFindReplaceMode("find");
          return true;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
          event.preventDefault();
          setShowFindReplace(true);
          setFindReplaceMode("replace");
          return true;
        }
        return false;
      },
    },
  }, [isCollaborative, documentId]);
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

  // Sync first-line indent and hanging indent
  useEffect(() => {
    let style = document.querySelector('#editor-first-line-indent') as HTMLStyleElement;
    if (!style) { style = document.createElement('style'); style.id = 'editor-first-line-indent'; document.head.appendChild(style); }
    const rules: string[] = [];
    if (firstLineIndent !== 0) {
      rules.push(`.tiptap p { text-indent: ${firstLineIndent}px; }`);
    }
    if (hangingIndent > 0) {
      rules.push(`.tiptap p { padding-left: ${hangingIndent}px; }`);
    }
    style.textContent = rules.join('\n');
  }, [firstLineIndent, hangingIndent]);

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

  // Keep editorRef in sync
  useEffect(() => {
    (editorRef as React.MutableRefObject<typeof editor>).current = editor;
  }, [editor]);

  useEffect(() => {
    if (!isCollaborative && editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor, isCollaborative]);

  // Sync tiptap element after render
  useEffect(() => {
    const t = setTimeout(syncTiptapEl, 50);
    return () => clearTimeout(t);
  });

  // Ctrl+Scroll zoom
  useEffect(() => {
    const deskEl = document.querySelector('.editor-desk');
    if (!deskEl) return;
    const handler = (e: Event) => {
      const we = e as WheelEvent;
      if (we.ctrlKey || we.metaKey) {
        we.preventDefault();
        setZoom(prev => Math.max(25, Math.min(200, prev + (we.deltaY > 0 ? -5 : 5))));
      }
    };
    deskEl.addEventListener('wheel', handler, { passive: false });
    return () => deskEl.removeEventListener('wheel', handler);
  }, []);

  // Focus mode CSS class toggle + cursor tracking
  useEffect(() => {
    const pm = document.querySelector('.ProseMirror');
    if (pm) pm.classList.toggle('focus-mode', focusMode);

    if (!focusMode || !editor) return () => { pm?.classList.remove('focus-mode'); };

    const trackFocus = () => {
      if (!pm) return;
      pm.querySelectorAll('.focus-active').forEach(el => el.classList.remove('focus-active'));
      const { from } = editor.state.selection;
      try {
        const domAtPos = editor.view.domAtPos(from);
        let node = domAtPos?.node instanceof HTMLElement ? domAtPos.node : domAtPos?.node?.parentElement;
        while (node && node !== pm && node.parentElement !== pm) {
          node = node.parentElement;
        }
        if (node && node !== pm) node.classList.add('focus-active');
      } catch { /* ignore */ }
    };

    editor.on('selectionUpdate', trackFocus);
    trackFocus();

    return () => {
      pm?.classList.remove('focus-mode');
      pm?.querySelectorAll('.focus-active').forEach(el => el.classList.remove('focus-active'));
      editor.off('selectionUpdate', trackFocus);
    };
  }, [focusMode, editor]);

  // Listen for focus-mode-toggle event from ViewTab
  useEffect(() => {
    const handler = () => setFocusMode(prev => !prev);
    window.addEventListener('editor-toggle-focus-mode', handler);
    return () => window.removeEventListener('editor-toggle-focus-mode', handler);
  }, []);

  // Listen for find-replace-toggle event from HomeTab
  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode || 'find';
      setShowFindReplace(true);
      setFindReplaceMode(mode);
    };
    window.addEventListener('editor-open-find-replace', handler);
    return () => window.removeEventListener('editor-open-find-replace', handler);
  }, []);

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
          headerRight={
            <>
              {isCollaborative && (
                <CollaborationBar awareness={providerRef.current?.awareness ?? null} />
              )}
              {headerRight}
            </>
          }
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
                hangingIndent={hangingIndent}
                onHangingIndentChange={setHangingIndent}
                tabStops={tabStops}
                onTabStopsChange={setTabStops}
              />
            </div>
          )}
          <div className="editor-desk flex-1 min-h-0 overflow-auto relative">
            {/* Find & Replace floating panel */}
            {showFindReplace && editor && (
              <FindReplacePanel
                editor={editor}
                onClose={() => setShowFindReplace(false)}
                initialMode={findReplaceMode}
              />
            )}
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
