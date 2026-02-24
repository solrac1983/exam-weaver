import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Table as TableExtension, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Color, TextStyle, FontFamily } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import { Mathematics } from "./MathExtension";
import { EditorToolbar } from "./EditorToolbar";
import { useEffect } from "react";

interface RichEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

export function RichEditor({ content = "", onChange, placeholder = "Comece a escrever sua prova..." }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      UnderlineExtension,
      Placeholder.configure({ placeholder }),
      TableExtension.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      FontFamily,
      Mathematics,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
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
      {/* Sticky toolbar */}
      <div className="w-full sticky top-0 z-20">
        <EditorToolbar editor={editor} />
      </div>
      {/* A4 Portrait page */}
      <div className="mt-4 mb-8 bg-card shadow-lg border border-border rounded exam-page">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
