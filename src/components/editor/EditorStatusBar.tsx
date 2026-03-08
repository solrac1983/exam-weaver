import { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { FileText, Type, Hash, Layers } from "lucide-react";

interface EditorStatusBarProps {
  editor: Editor;
  zoom: number;
}

interface DocStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  lines: number;
  pages: number;
}

export function EditorStatusBar({ editor, zoom }: EditorStatusBarProps) {
  const [stats, setStats] = useState<DocStats>({ words: 0, characters: 0, charactersNoSpaces: 0, lines: 0, pages: 1 });
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });

  useEffect(() => {
    const update = () => {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const characters = text.length;
      const charactersNoSpaces = text.replace(/\s/g, "").length;
      const lines = text.split("\n").length;
      // Estimate pages: ~3000 chars per A4 page
      const pages = Math.max(1, Math.ceil(characters / 3000));

      setStats({ words, characters, charactersNoSpaces, lines, pages });

      // Cursor position
      const { from } = editor.state.selection;
      const resolved = editor.state.doc.resolve(from);
      const linesBefore = editor.state.doc.textBetween(0, from, "\n").split("\n").length;
      const lineStart = editor.state.doc.textBetween(0, from, "\n").lastIndexOf("\n");
      const col = from - lineStart;
      setCursorInfo({ line: linesBefore, col: Math.max(1, col) });
    };

    editor.on("update", update);
    editor.on("selectionUpdate", update);
    update();
    return () => {
      editor.off("update", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  const { from, to } = editor.state.selection;
  const hasSelection = from !== to;
  const selectedText = hasSelection ? editor.state.doc.textBetween(from, to) : "";
  const selectedWords = selectedText.trim() ? selectedText.trim().split(/\s+/).length : 0;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-muted/30 border-t border-border text-[11px] text-muted-foreground select-none">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3" />
          Página {stats.pages > 1 ? `1-${stats.pages}` : "1"} de {stats.pages}
        </span>
        <span className="flex items-center gap-1">
          <Type className="h-3 w-3" />
          {hasSelection
            ? `${selectedWords} de ${stats.words} palavras`
            : `${stats.words} palavras`}
        </span>
        <span className="flex items-center gap-1">
          <Hash className="h-3 w-3" />
          {hasSelection
            ? `${selectedText.length} de ${stats.characters} caracteres`
            : `${stats.characters} caracteres`}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>Ln {cursorInfo.line}, Col {cursorInfo.col}</span>
        <span>Zoom: {zoom}%</span>
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          UTF-8
        </span>
      </div>
    </div>
  );
}
