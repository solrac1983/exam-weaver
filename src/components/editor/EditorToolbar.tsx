import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image,
  Table,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  FunctionSquare,
  Quote,
  Code,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useRef } from "react";

interface EditorToolbarProps {
  editor: Editor;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const addImageFromUrl = () => {
    const url = prompt("Cole a URL da imagem:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertFormula = () => {
    (editor.commands as any).insertFormula({ formula: "x^2 + y^2 = z^2" });
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/30">
      {/* Undo / Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={Undo} label="Desfazer" />
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={Redo} label="Refazer" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} icon={Heading1} label="Título 1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} icon={Heading2} label="Título 2" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} icon={Heading3} label="Título 3" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} label="Negrito" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} label="Itálico" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={Underline} label="Sublinhado" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={Strikethrough} label="Tachado" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={AlignLeft} label="Alinhar à esquerda" />
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={AlignCenter} label="Centralizar" />
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={AlignRight} label="Alinhar à direita" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={List} label="Lista" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={ListOrdered} label="Lista numerada" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={Quote} label="Citação" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Insert */}
      <ToolbarButton onClick={addImage} icon={Image} label="Inserir imagem" />
      <ToolbarButton onClick={addTable} icon={Table} label="Inserir tabela" />
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} label="Linha horizontal" />
      <ToolbarButton onClick={insertFormula} icon={FunctionSquare} label="Inserir fórmula (LaTeX)" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}
