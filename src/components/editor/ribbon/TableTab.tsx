import { Editor } from "@tiptap/react";
import { RibbonBtn, RibbonGroup, RibbonDivider } from "./RibbonShared";
import {
  Trash2, Minus,
  ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, ArrowDownToLine,
  Merge, Split, Paintbrush, RowsIcon, Columns3,
  AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  Maximize2, Equal,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

const cellColors = [
  { label: "Sem cor", value: "" },
  { label: "Cinza claro", value: "hsl(var(--muted))" },
  { label: "Azul claro", value: "#dbeafe" },
  { label: "Verde claro", value: "#dcfce7" },
  { label: "Amarelo claro", value: "#fef9c3" },
  { label: "Rosa claro", value: "#fce7f3" },
  { label: "Laranja claro", value: "#fed7aa" },
  { label: "Roxo claro", value: "#e9d5ff" },
];

const borderStyles = [
  { label: "Fina (1px)", value: "1px solid hsl(var(--border))" },
  { label: "Média (2px)", value: "2px solid hsl(var(--border))" },
  { label: "Grossa (3px)", value: "3px solid hsl(var(--foreground))" },
  { label: "Sem borda", value: "none" },
];

function distributeColumns(editor: Editor) {
  const tableEl = document.querySelector('.ProseMirror table');
  if (!tableEl) return;
  const cols = tableEl.querySelectorAll('tr:first-child th, tr:first-child td');
  if (!cols.length) return;
  const pct = Math.floor(100 / cols.length);
  cols.forEach((col) => {
    (col as HTMLElement).style.width = `${pct}%`;
  });
}

function setTableWidth(editor: Editor, width: string) {
  const tableEl = document.querySelector('.ProseMirror table');
  if (tableEl) {
    (tableEl as HTMLElement).style.width = width;
    (tableEl as HTMLElement).style.tableLayout = 'fixed';
  }
}

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

      {/* Tamanho */}
      <RibbonGroup label="Tamanho">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-[6px] rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Maximize2 className="h-[14px] w-[14px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-[10px]">Largura da tabela</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTableWidth(editor, '100%')} className="text-xs">100% (largura total)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTableWidth(editor, '75%')} className="text-xs">75%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTableWidth(editor, '50%')} className="text-xs">50%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTableWidth(editor, 'auto')} className="text-xs">Automática</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <RibbonBtn icon={Equal} label="Distribuir colunas uniformemente" onClick={() => distributeColumns(editor)} />
      </RibbonGroup>

      <RibbonDivider />

      {/* Alinhamento */}
      <RibbonGroup label="Alinhar">
        <RibbonBtn icon={AlignLeft} label="Alinhar texto à esquerda" onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} />
        <RibbonBtn icon={AlignCenter} label="Centralizar texto" onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} />
        <RibbonBtn icon={AlignRight} label="Alinhar texto à direita" onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} />
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
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-[10px]">Cor da célula</DropdownMenuLabel>
            {cellColors.map((c) => (
              <DropdownMenuItem key={c.label} onClick={() => editor.chain().focus().setCellAttribute("backgroundColor", c.value).run()} className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded border border-border" style={{ background: c.value || "transparent" }} />
                {c.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px]">Borda da célula</DropdownMenuLabel>
            {borderStyles.map((b) => (
              <DropdownMenuItem key={b.label} onClick={() => editor.chain().focus().setCellAttribute("borderStyle", b.value).run()} className="flex items-center gap-2 text-xs">
                <div className="w-8 h-0 rounded" style={{ borderBottom: b.value === "none" ? "1px dashed hsl(var(--muted-foreground))" : b.value }} />
                {b.label}
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
