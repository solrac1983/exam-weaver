import { Editor, BubbleMenu } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline, Strikethrough, Highlighter, Palette,
  Superscript, Subscript, Link, Code
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

const textColors = [
  { label: "Padrão", value: "" },
  { label: "Preto", value: "#000000" },
  { label: "Vermelho", value: "#dc2626" },
  { label: "Azul", value: "#2563eb" },
  { label: "Verde", value: "#16a34a" },
  { label: "Laranja", value: "#ea580c" },
  { label: "Roxo", value: "#9333ea" },
];

const highlightColors = [
  { label: "Amarelo", value: "#fef08a" },
  { label: "Verde", value: "#bbf7d0" },
  { label: "Azul", value: "#bfdbfe" },
  { label: "Rosa", value: "#fbcfe8" },
  { label: "Laranja", value: "#fed7aa" },
];

function FBtn({ onClick, active, icon: Icon, label }: {
  onClick: () => void; active?: boolean; icon: React.ElementType; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "p-1.5 rounded-md transition-all duration-100",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function FloatingToolbar({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg border border-border/60 bg-card shadow-lg backdrop-blur-sm"
    >
      <FBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} label="Negrito" />
      <FBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} label="Itálico" />
      <FBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={Underline} label="Sublinhado" />
      <FBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={Strikethrough} label="Tachado" />

      <div className="w-px h-4 bg-border/50 mx-0.5" />

      <FBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} icon={Superscript} label="Sobrescrito" />
      <FBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} icon={Subscript} label="Subscrito" />
      <FBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} icon={Code} label="Código" />

      <div className="w-px h-4 bg-border/50 mx-0.5" />

      {/* Text color */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors" title="Cor do texto">
            <Palette className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[130px]">
          <DropdownMenuLabel className="text-xs">Cor do texto</DropdownMenuLabel>
          {textColors.map((c) => (
            <DropdownMenuItem
              key={c.value || "default"}
              onClick={() => c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run()}
            >
              <span className="h-3 w-3 rounded-full border border-border mr-2 shrink-0" style={{ background: c.value || "currentColor" }} />
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
            editor.isActive("highlight") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          )} title="Realce">
            <Highlighter className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[130px]">
          <DropdownMenuLabel className="text-xs">Realce</DropdownMenuLabel>
          {highlightColors.map((c) => (
            <DropdownMenuItem key={c.value} onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}>
              <span className="h-3 w-3 rounded border border-border mr-2 shrink-0" style={{ background: c.value }} />
              {c.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => editor.chain().focus().unsetHighlight().run()}>
            Remover realce
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </BubbleMenu>
  );
}
