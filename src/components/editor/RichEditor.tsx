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
import { Mathematics } from "./MathExtension";
import { BlankPage } from "./BlankPageExtension";
import { FontSize } from "./FontSizeExtension";
import { LineHeight } from "./LineHeightExtension";
import { EditorRibbon } from "./EditorRibbon";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorRuler, type TabStop } from "./EditorRuler";
import { PageHeaderFooterOverlay, defaultHeaderFooterConfig, type HeaderFooterConfig } from "./PageHeaderFooterOverlay";
import { useEffect, useState, useRef, useCallback } from "react";
import type { ChartData } from "./ChartEditorTab";
import { FloatingToolbar } from "./FloatingToolbar";
import { usePageBreaks } from "./usePageBreaks";

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
}

export function RichEditor({ content = "", onChange, placeholder = "Comece a escrever sua prova...", showDataPanel, onToggleDataPanel, onChartDataChange, onChartUpdate, showComments, onToggleComments, saveStatus }: RichEditorProps) {
  const [zoom, setZoom] = useState(100);
  const [showRuler, setShowRuler] = useState(true);
  const [marginLeft, setMarginLeft] = useState(38);
  const [marginRight, setMarginRight] = useState(38);
  const [firstLineIndent, setFirstLineIndent] = useState(0);
  const [tabStops, setTabStops] = useState<TabStop[]>([]);
  const [headerFooterConfig, setHeaderFooterConfig] = useState<HeaderFooterConfig>(defaultHeaderFooterConfig);
  const [tiptapEl, setTiptapEl] = useState<HTMLElement | null>(null);

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
    ],
    content,
    onUpdate: ({ editor }) => { onChange?.(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none text-sm leading-relaxed",
        spellcheck: "true",
        lang: "pt-BR",
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
      // Generate tab-size and visual guides
      const positions = tabStops.map(t => `${t.position}px`).join(', ');
      // Use CSS tab-size for the default tab width based on first stop
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

  // Sync tiptap element after render — use editor.view.dom as primary source
  useEffect(() => {
    if (editor?.view?.dom && editor.view.dom !== tiptapEl) {
      setTiptapEl(editor.view.dom as HTMLElement);
    } else {
      syncTiptapEl();
    }
  });

  // Enforce page breaks - push content that crosses page boundaries to next page
  usePageBreaks(tiptapEl, marginTop, marginBottom);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
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
        />
      </div>
      <div className="flex flex-1 min-h-0">
        {/* Vertical ruler — pinned to the left edge */}
        <div className="vertical-ruler shrink-0 select-none hidden md:flex flex-col bg-card border-r border-border/50" style={{ width: '22px', marginTop: '4px' }}>
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
        <div className="editor-desk flex-1 min-h-0 overflow-auto">
          <div className="editor-desk-inner" style={{ zoom: zoom / 100 }}>
            {showRuler && (
              <div className="flex justify-center">
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
            <div className="exam-page" ref={examPageRef} style={{ position: 'relative' }}>
              <FloatingToolbar editor={editor} />
              <EditorContent editor={editor} />
              <PageHeaderFooterOverlay config={headerFooterConfig} editorEl={tiptapEl} />
            </div>
          </div>
        </div>
      </div>
      <div className="w-full sticky bottom-0 z-20 shrink-0">
        <EditorStatusBar editor={editor} zoom={zoom} onZoomChange={setZoom} saveStatus={saveStatus} />
      </div>
    </div>
  );
}
