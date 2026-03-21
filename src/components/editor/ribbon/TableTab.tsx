import { Editor } from "@tiptap/react";
import { RibbonBtn, RibbonStackedBtn, RibbonGroup, RibbonDivider } from "./RibbonShared";
import { cn } from "@/lib/utils";
import {
  Trash2, Minus,
  ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, ArrowDownToLine,
  Merge, Split, Paintbrush, RowsIcon,
  AlignLeft, AlignCenter, AlignRight,
  Maximize2, Equal,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

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
  cols.forEach((col) => { (col as HTMLElement).style.width = `${pct}%`; });
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
      <RibbonGroup label="LINHAS">
        <RibbonStackedBtn icon={ArrowUpToLine} label="Acima" onClick={() => editor.chain().focus().addRowBefore().run()} description="Inserir uma nova linha acima da linha atual" />
        <RibbonStackedBtn icon={ArrowDownToLine} label="Abaixo" onClick={() => editor.chain().focus().addRowAfter().run()} description="Inserir uma nova linha abaixo da linha atual" />
        <RibbonBtn icon={Minus} label="Remover linha" onClick={() => editor.chain().focus().deleteRow().run()} className="text-red-400" description="Excluir a linha selecionada da tabela" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="COLUNAS">
        <RibbonStackedBtn icon={ArrowLeftToLine} label="Esquerda" onClick={() => editor.chain().focus().addColumnBefore().run()} description="Inserir uma nova coluna à esquerda" />
        <RibbonStackedBtn icon={ArrowRightToLine} label="Direita" onClick={() => editor.chain().focus().addColumnAfter().run()} description="Inserir uma nova coluna à direita" />
        <RibbonBtn icon={Minus} label="Remover coluna" onClick={() => editor.chain().focus().deleteColumn().run()} className="text-red-400" description="Excluir a coluna selecionada da tabela" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="MESCLAR">
        <RibbonStackedBtn icon={Merge} label="Mesclar" onClick={() => editor.chain().focus().mergeCells().run()} description="Mesclar as células selecionadas em uma única célula" />
        <RibbonStackedBtn icon={Split} label="Dividir" onClick={() => editor.chain().focus().splitCell().run()} description="Dividir a célula mesclada em células separadas" />
        <RibbonStackedBtn icon={RowsIcon} label="Cabeçalho" onClick={() => editor.chain().focus().toggleHeaderRow().run()} active={editor.isActive("tableHeader")} description="Alternar a primeira linha como cabeçalho da tabela" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="TAMANHO">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-[6px] rounded text-white/80 hover:text-white hover:bg-white/15 transition-colors">
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
        <RibbonBtn icon={Equal} label="Distribuir colunas" onClick={() => distributeColumns(editor)} description="Distribuir largura das colunas uniformemente" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="ALINHAR">
        <RibbonBtn icon={AlignLeft} label="Esquerda" onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} />
        <RibbonBtn icon={AlignCenter} label="Centro" onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} />
        <RibbonBtn icon={AlignRight} label="Direita" onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="ESTILO">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-[6px] rounded text-white/80 hover:text-white hover:bg-white/15 transition-colors">
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

      <RibbonGroup label="EXCLUIR">
        <RibbonStackedBtn icon={Trash2} label="Tabela" onClick={() => editor.chain().focus().deleteTable().run()} className="text-red-400" />
      </RibbonGroup>
    </div>
  );
}
