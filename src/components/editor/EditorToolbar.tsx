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
  AlignJustify,
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
  Superscript,
  Subscript,
  Highlighter,
  Palette,
  Link,
  Type,
  Columns3,
  RowsIcon,
  Trash2,
  ImagePlus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useRef, useState } from "react";

interface EditorToolbarProps {
  editor: Editor;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  icon: Icon,
  label,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  className?: string;
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
            disabled && "opacity-40 cursor-not-allowed",
            className
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

const fontFamilies = [
  { label: "Padrão", value: "Inter" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

const textColors = [
  { label: "Padrão", value: "" },
  { label: "Preto", value: "#000000" },
  { label: "Vermelho", value: "#dc2626" },
  { label: "Azul", value: "#2563eb" },
  { label: "Verde", value: "#16a34a" },
  { label: "Laranja", value: "#ea580c" },
  { label: "Roxo", value: "#9333ea" },
  { label: "Cinza", value: "#6b7280" },
];

const highlightColors = [
  { label: "Amarelo", value: "#fef08a" },
  { label: "Verde", value: "#bbf7d0" },
  { label: "Azul", value: "#bfdbfe" },
  { label: "Rosa", value: "#fbcfe8" },
  { label: "Laranja", value: "#fed7aa" },
];

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
    <div className="glass-card rounded-lg border border-border overflow-hidden">
      {/* Row 1: Font, headings, text formatting */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-border bg-muted/20">
        {/* Undo / Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={Undo} label="Desfazer (Ctrl+Z)" />
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={Redo} label="Refazer (Ctrl+Y)" />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Font family dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-[90px]">
              <Type className="h-3.5 w-3.5" />
              <span className="truncate">Fonte</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">Família da fonte</DropdownMenuLabel>
            {fontFamilies.map((f) => (
              <DropdownMenuItem
                key={f.value}
                onClick={() => editor.chain().focus().setFontFamily(f.value).run()}
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()}>
              Limpar fonte
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} icon={Heading1} label="Título 1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} icon={Heading2} label="Título 2" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} icon={Heading3} label="Título 3" />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} label="Negrito (Ctrl+B)" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} label="Itálico (Ctrl+I)" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={Underline} label="Sublinhado (Ctrl+U)" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={Strikethrough} label="Tachado" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} icon={Superscript} label="Sobrescrito" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} icon={Subscript} label="Subscrito" />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Text color */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Palette className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuLabel className="text-xs">Cor do texto</DropdownMenuLabel>
            {textColors.map((c) => (
              <DropdownMenuItem
                key={c.value || "default"}
                onClick={() =>
                  c.value
                    ? editor.chain().focus().setColor(c.value).run()
                    : editor.chain().focus().unsetColor().run()
                }
              >
                <span className="h-3 w-3 rounded-full border border-border mr-2 flex-shrink-0" style={{ background: c.value || "currentColor" }} />
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Highlight */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "p-1.5 rounded-md transition-colors",
              editor.isActive("highlight") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}>
              <Highlighter className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuLabel className="text-xs">Realce</DropdownMenuLabel>
            {highlightColors.map((c) => (
              <DropdownMenuItem
                key={c.value}
                onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
              >
                <span className="h-3 w-3 rounded border border-border mr-2 flex-shrink-0" style={{ background: c.value }} />
                {c.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetHighlight().run()}>
              Remover realce
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 2: Alignment, lists, inserts */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 bg-muted/10">
        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={AlignLeft} label="Alinhar à esquerda" />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={AlignCenter} label="Centralizar" />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={AlignRight} label="Alinhar à direita" />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} icon={AlignJustify} label="Justificar" />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={List} label="Lista com marcadores" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={ListOrdered} label="Lista numerada" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={Quote} label="Citação" />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Image dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Image className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">Inserir imagem</DropdownMenuLabel>
            <DropdownMenuItem onClick={addImage}>
              <ImagePlus className="h-3.5 w-3.5 mr-2" />
              Upload do computador
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addImageFromUrl}>
              <Link className="h-3.5 w-3.5 mr-2" />
              Colar URL da imagem
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Table dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "p-1.5 rounded-md transition-colors",
              editor.isActive("table") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}>
              <Table className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">Tabela</DropdownMenuLabel>
            <DropdownMenuItem onClick={addTable}>
              Inserir tabela 3×3
            </DropdownMenuItem>
            {editor.isActive("table") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                  <Columns3 className="h-3.5 w-3.5 mr-2" />
                  Adicionar coluna
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                  <RowsIcon className="h-3.5 w-3.5 mr-2" />
                  Adicionar linha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
                  Remover coluna
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
                  Remover linha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Excluir tabela
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} label="Linha horizontal" />
        <ToolbarButton onClick={insertFormula} icon={FunctionSquare} label="Inserir fórmula LaTeX" />
      </div>

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
