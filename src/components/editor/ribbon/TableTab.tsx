import { Editor } from "@tiptap/react";
import { RibbonBtn, RibbonGroup, RibbonDivider } from "./RibbonShared";
import { TableDropdown } from "./TableDropdown";
import {
  Columns3, RowsIcon, Trash2, Plus, Minus,
  ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, ArrowDownToLine,
  Merge, Split, Paintbrush,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

const cellColors = [
  { label: "Sem cor", value: "" },
  { label: "Cinza claro", value: "hsl(var(--muted))" },
  { label: "Azul claro", value: "#dbeafe" },
  { label: "Verde claro", value: "#dcfce7" },
  { label: "Amarelo claro", value: "#fef9c3" },
  { label: "Rosa claro", value: "#fce7f3" },
];

export function TableTab({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-end gap-0 flex-wrap">
      {/* Linhas */}
      <RibbonGroup label="Linhas">
        <RibbonBtn icon={ArrowUpToLine} label="Inserir linha acima" onClick={() => editor.chain().focus().addRowBefore().run()} />
        <RibbonBtn icon={ArrowDownToLine} label="Inserir linha abaixo" onClick={() => editor.chain().focus().addRowAfter().run()} />
        <RibbonBtn icon={Minus} label="Remover linha" onClick={() => editor.chain().focus().deleteRow().run()} className="text-destructive" />
      </RibbonGroup>

      <RibbonDivider />

      {/* Colunas */}
      <RibbonGroup label="Colunas">
        <RibbonBtn icon={ArrowLeftToLine} label="Inserir coluna à esquerda" onClick={() => editor.chain().focus().addColumnBefore().run()} />
        <RibbonBtn icon={ArrowRightToLine} label="Inserir coluna à direita" onClick={() => editor.chain().focus().addColumnAfter().run()} />
        <RibbonBtn icon={Minus} label="Remover coluna" onClick={() => editor.chain().focus().deleteColumn().run()} className="text-destructive" />
      </RibbonGroup>

      <RibbonDivider />

      {/* Mesclar */}
      <RibbonGroup label="Mesclar">
        <RibbonBtn icon={Merge} label="Mesclar células" onClick={() => editor.chain().focus().mergeCells().run()} />
        <RibbonBtn icon={Split} label="Dividir célula" onClick={() => editor.chain().focus().splitCell().run()} />
        <RibbonBtn icon={RowsIcon} label="Alternar linha de cabeçalho" onClick={() => editor.chain().focus().toggleHeaderRow().run()} active={editor.isActive("tableHeader")} />
      </RibbonGroup>

      <RibbonDivider />

      {/* Cor de fundo */}
      <RibbonGroup label="Estilo">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-[6px] rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Paintbrush className="h-[14px] w-[14px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuLabel className="text-[10px]">Cor da célula</DropdownMenuLabel>
            {cellColors.map((c) => (
              <DropdownMenuItem key={c.label} onClick={() => editor.chain().focus().setCellAttribute("backgroundColor", c.value).run()} className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded border border-border" style={{ background: c.value || "transparent" }} />
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>

      <RibbonDivider />

      {/* Excluir */}
      <RibbonGroup label="Excluir">
        <RibbonBtn icon={Trash2} label="Excluir tabela" onClick={() => editor.chain().focus().deleteTable().run()} className="text-destructive" />
      </RibbonGroup>
    </div>
  );
}
