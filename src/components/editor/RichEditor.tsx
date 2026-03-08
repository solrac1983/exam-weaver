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
import { EditorRibbon } from "./EditorRibbon";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorRuler, type TabStop } from "./EditorRuler";
import { useEffect, useState } from "react";
import type { ChartData } from "./ChartEditorTab";

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
}

export function RichEditor({ content = "", onChange, placeholder = "Comece a escrever sua prova...", showDataPanel, onToggleDataPanel, onChartDataChange, onChartUpdate, showComments, onToggleComments }: RichEditorProps) {
  const [zoom, setZoom] = useState(100);
  const [showRuler, setShowRuler] = useState(true);
  const [marginLeft, setMarginLeft] = useState(60);
  const [marginRight, setMarginRight] = useState(60);
  const [firstLineIndent, setFirstLineIndent] = useState(0);
  const [tabStops, setTabStops] = useState<TabStop[]>([]);

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
      Superscript, Subscript, FontFamily, Mathematics, BlankPage,
    ],
    content,
    onUpdate: ({ editor }) => { onChange?.(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[297mm] px-[60px] py-[50px] text-sm leading-relaxed",
      },
    },
  });

  // Sync margins to editor element
  useEffect(() => {
    const el = document.querySelector('.tiptap') as HTMLElement;
    if (el) {
      el.style.paddingLeft = `${marginLeft}px`;
      el.style.paddingRight = `${marginRight}px`;
    }
  }, [marginLeft, marginRight]);

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

  if (!editor) return null;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full sticky top-0 z-20">
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
        />
      </div>
      {showRuler && (
        <div className="mt-2" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
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
      <div
        className={showRuler ? "mb-8 exam-page transition-transform origin-top" : "mt-4 mb-8 exam-page transition-transform origin-top"}
        style={{ transform: `scale(${zoom / 100})` }}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="w-full sticky bottom-0 z-20">
        <EditorStatusBar editor={editor} zoom={zoom} onZoomChange={setZoom} />
      </div>
    </div>
  );
}
