import { Editor } from "@tiptap/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Table, Columns3, RowsIcon, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

export function TableDropdown({ editor }: { editor: Editor }) {
  const [hoverR, setHoverR] = useState(0);
  const [hoverC, setHoverC] = useState(0);
  const maxR = 8, maxC = 8;

  const tableTemplates = [
    { label: "Lista simples", rows: 5, cols: 2, header: true, desc: "2 colunas, 5 linhas" },
    { label: "Tabela de dados", rows: 4, cols: 4, header: true, desc: "4×4 com cabeçalho" },
    { label: "Grade de notas", rows: 6, cols: 5, header: true, desc: "Alunos × Atividades" },
    { label: "Cronograma", rows: 5, cols: 7, header: true, desc: "Dias da semana" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Table className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px] p-2">
        <DropdownMenuLabel className="text-[10px] pb-1">Selecione o tamanho</DropdownMenuLabel>
        <div className="grid gap-[2px] mb-2 mx-auto w-fit" style={{ gridTemplateColumns: `repeat(${maxC}, 1fr)` }}>
          {Array.from({ length: maxR * maxC }).map((_, i) => {
            const r = Math.floor(i / maxC) + 1;
            const c = (i % maxC) + 1;
            return (
              <button key={i}
                className={cn("w-5 h-5 border rounded-[2px] transition-colors",
                  r <= hoverR && c <= hoverC ? "bg-primary/20 border-primary/50" : "bg-muted/30 border-border hover:border-muted-foreground/30"
                )}
                onMouseEnter={() => { setHoverR(r); setHoverC(c); }}
                onMouseLeave={() => { setHoverR(0); setHoverC(0); }}
                onClick={() => editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run()}
              />
            );
          })}
        </div>
        {hoverR > 0 && <p className="text-[10px] text-center text-muted-foreground mb-2">{hoverR} × {hoverC}</p>}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] pt-1">Modelos de tabela</DropdownMenuLabel>
        {tableTemplates.map((t) => (
          <DropdownMenuItem key={t.label} onClick={() => editor.chain().focus().insertTable({ rows: t.rows, cols: t.cols, withHeaderRow: t.header }).run()} className="flex flex-col items-start gap-0">
            <span className="text-xs font-medium">{t.label}</span>
            <span className="text-[10px] text-muted-foreground">{t.desc}</span>
          </DropdownMenuItem>
        ))}
        {editor.isActive("table") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px]">Editar tabela</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns3 className="h-3.5 w-3.5 mr-2" /><span className="text-xs">Adicionar coluna</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}><RowsIcon className="h-3.5 w-3.5 mr-2" /><span className="text-xs">Adicionar linha</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}><Columns3 className="h-3.5 w-3.5 mr-2 text-destructive" /><span className="text-xs text-destructive">Remover coluna</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}><RowsIcon className="h-3.5 w-3.5 mr-2 text-destructive" /><span className="text-xs text-destructive">Remover linha</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 className="h-3.5 w-3.5 mr-2 text-destructive" /><span className="text-xs text-destructive">Excluir tabela</span></DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
