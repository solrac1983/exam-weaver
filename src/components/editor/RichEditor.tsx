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
import { EditorRibbon } from "./EditorRibbon";
import { useEffect, useState } from "react";

interface RichEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

export function RichEditor({ content = "", onChange, placeholder = "Comece a escrever sua prova..." }: RichEditorProps) {
  const [zoom, setZoom] = useState(100);

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
      Superscript, Subscript, FontFamily, Mathematics,
    ],
    content,
    onUpdate: ({ editor }) => { onChange?.(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[842px] px-[60px] py-[50px] text-sm leading-relaxed",
      },
    },
  });

  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full sticky top-0 z-20">
        <EditorRibbon editor={editor} zoom={zoom} onZoomChange={setZoom} />
      </div>
      <div
        className="mt-4 mb-8 bg-card shadow-lg border border-border rounded exam-page transition-transform origin-top"
        style={{ transform: `scale(${zoom / 100})` }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
