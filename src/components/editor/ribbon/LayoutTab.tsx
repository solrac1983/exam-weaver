import { Editor } from "@tiptap/react";
import { useState } from "react";
import {
  Ruler, LayoutTemplate, Columns3, IndentIncrease, IndentDecrease,
  ArrowUpDown, Pilcrow, WrapText, SeparatorHorizontal, Grid3X3, Settings2, Gauge,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { RibbonBtn, RibbonGroup } from "./RibbonShared";
import { insertPageBreakAtEnd } from "./RibbonConstants";
import { WatermarkDropdown, PageColorDropdown, PageBorderDropdown } from "./PageBackgroundDropdowns";

export function LayoutTab({ editor }: { editor: Editor }) {
  const [marginTopMm, setMarginTopMm] = useState(25);
  const [marginBottomMm, setMarginBottomMm] = useState(25);
  const [marginLeftMm, setMarginLeftMm] = useState(30);
  const [marginRightMm, setMarginRightMm] = useState(30);

  const mmToPx = (mm: number) => Math.round(mm * 3.7795);

  const applyMargins = (topMm: number, bottomMm: number, leftMm: number, rightMm: number) => {
    setMarginTopMm(topMm); setMarginBottomMm(bottomMm); setMarginLeftMm(leftMm); setMarginRightMm(rightMm);
    window.dispatchEvent(new CustomEvent('editor-margins-change', {
      detail: { top: mmToPx(topMm), bottom: mmToPx(bottomMm), left: mmToPx(leftMm), right: mmToPx(rightMm) }
    }));
  };

  const applyIndent = (increase: boolean) => {
    const newLeft = increase ? marginLeftMm + 5 : Math.max(5, marginLeftMm - 5);
    applyMargins(marginTopMm, marginBottomMm, newLeft, marginRightMm);
  };

  const applyLineSpacing = (value: string) => { (editor.commands as any).setLineHeight(value); };

  const applyParagraphSpacing = (value: string) => {
    const style = document.querySelector('#editor-paragraph-spacing') || document.createElement('style');
    (style as HTMLStyleElement).id = 'editor-paragraph-spacing';
    (style as HTMLStyleElement).textContent = `.tiptap p { margin-bottom: ${value}; } .tiptap h1, .tiptap h2, .tiptap h3 { margin-bottom: ${value}; }`;
    if (!style.parentNode) document.head.appendChild(style);
  };

  return (
    <>
      <RibbonGroup label="Margens">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Ruler className="h-4 w-4" /><span>Margens</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Predefinições</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => applyMargins(25, 25, 30, 30)}>Normal (2,5 cm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMargins(12.7, 12.7, 12.7, 12.7)}>Estreita (1,27 cm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMargins(25.4, 25.4, 31.8, 31.8)}>Larga (3,18 cm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMargins(25, 25, 19, 19)}>Moderada</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyMargins(20, 20, 20, 20)}>Mínima (2 cm)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Personalizar (mm)</DropdownMenuLabel>
            <div className="px-2 py-1.5 grid grid-cols-2 gap-2">
              {[
                { label: "Superior", value: marginTopMm, setter: (v: number) => applyMargins(v, marginBottomMm, marginLeftMm, marginRightMm) },
                { label: "Inferior", value: marginBottomMm, setter: (v: number) => applyMargins(marginTopMm, v, marginLeftMm, marginRightMm) },
                { label: "Esquerda", value: marginLeftMm, setter: (v: number) => applyMargins(marginTopMm, marginBottomMm, v, marginRightMm) },
                { label: "Direita", value: marginRightMm, setter: (v: number) => applyMargins(marginTopMm, marginBottomMm, marginLeftMm, v) },
              ].map(({ label, value, setter }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-muted-foreground">{label} (mm)</label>
                  <input type="number" value={value} onChange={(e) => setter(Number(e.target.value))}
                    className="w-full px-1.5 py-0.5 text-xs rounded border border-input bg-background text-foreground" min={0} max={60} step={1} />
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <RibbonBtn
          onClick={() => {
            const el = document.querySelector('.tiptap') as HTMLElement;
            if (el) el.classList.toggle('show-margin-guides');
          }}
          active={false} icon={Grid3X3} label="Guias de margem"
        />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Orientação">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <LayoutTemplate className="h-4 w-4" /><span>Orientação</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { const el = document.querySelector('.exam-page') as HTMLElement; if (el) { el.style.width = '210mm'; el.style.minHeight = '297mm'; } }}>📄 Retrato</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const el = document.querySelector('.exam-page') as HTMLElement; if (el) { el.style.width = '297mm'; el.style.minHeight = '210mm'; } }}>📄 Paisagem</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Tamanho">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Settings2 className="h-4 w-4" /><span>Papel</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">Tamanho do papel</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { const el = document.querySelector('.exam-page') as HTMLElement; if (el) { el.style.width = '210mm'; el.style.minHeight = '297mm'; } }}>A4 (210 × 297 mm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const el = document.querySelector('.exam-page') as HTMLElement; if (el) { el.style.width = '216mm'; el.style.minHeight = '279mm'; } }}>Carta (216 × 279 mm)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const el = document.querySelector('.exam-page') as HTMLElement; if (el) { el.style.width = '216mm'; el.style.minHeight = '356mm'; } }}>Ofício (216 × 356 mm)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Colunas">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Columns3 className="h-4 w-4" /><span>Colunas</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs">Número de colunas</DropdownMenuLabel>
            {[
              { n: '1', gap: '0' },
              { n: '2', gap: '24px' },
              { n: '3', gap: '20px' },
            ].map(({ n, gap }) => (
              <DropdownMenuItem key={n} onClick={() => {
                const el = document.querySelector('.tiptap') as HTMLElement;
                if (el) { el.style.columnCount = n; el.style.columnGap = gap; if (n === '1') el.style.columnRule = 'none'; }
                // Update data-columns on wrapper so exporters pick it up
                const wrapper = document.querySelector('.exam-wrapper') as HTMLElement;
                if (wrapper) wrapper.setAttribute('data-columns', n);
                window.dispatchEvent(new CustomEvent('editor-columns-change', { detail: { columns: Number(n) } }));
              }}>{n} Coluna{n !== '1' ? 's' : ''}</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Linha entre colunas</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { const el = document.querySelector('.tiptap') as HTMLElement; if (el) el.style.columnRule = '1px solid hsl(0 0% 75%)'; }}>Linha fina</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const el = document.querySelector('.tiptap') as HTMLElement; if (el) el.style.columnRule = '2px solid hsl(0 0% 60%)'; }}>Linha média</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const el = document.querySelector('.tiptap') as HTMLElement; if (el) el.style.columnRule = '1px dashed hsl(0 0% 70%)'; }}>Linha tracejada</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const el = document.querySelector('.tiptap') as HTMLElement; if (el) el.style.columnRule = 'none'; }}>Sem linha</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonGroup label="Recuo">
        <RibbonBtn onClick={() => applyIndent(true)} icon={IndentIncrease} label="Aumentar recuo" />
        <RibbonBtn onClick={() => applyIndent(false)} icon={IndentDecrease} label="Diminuir recuo" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Espaçamento">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <ArrowUpDown className="h-4 w-4" /><span>Linhas</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuLabel className="text-xs">Espaçamento entre linhas</DropdownMenuLabel>
            {['1', '1.15', '1.5', '1.7', '2', '2.5', '3'].map(v => (
              <DropdownMenuItem key={v} onClick={() => applyLineSpacing(v)}>
                {v === '1' ? 'Simples (1.0)' : v === '2' ? 'Duplo (2.0)' : v === '3' ? 'Triplo (3.0)' : v}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Pilcrow className="h-4 w-4" /><span>Parágrafos</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">Espaço entre parágrafos</DropdownMenuLabel>
            {[
              { label: "Nenhum", value: "0" },
              { label: "Pequeno (Padrão)", value: "0.3rem" },
              { label: "Médio", value: "0.6rem" },
              { label: "Grande", value: "1rem" },
              { label: "Extra grande", value: "1.5rem" },
            ].map(({ label, value }) => (
              <DropdownMenuItem key={value} onClick={() => applyParagraphSpacing(value)}>{label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Quebra de Texto">
        <RibbonBtn onClick={() => {
          const el = document.querySelector('.tiptap') as HTMLElement;
          if (el) el.style.wordBreak = el.style.wordBreak === 'break-all' ? 'normal' : 'break-all';
        }} icon={WrapText} label="Quebra automática de texto" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Quebras">
        <RibbonBtn onClick={() => insertPageBreakAtEnd(editor)} icon={SeparatorHorizontal} label="Quebra de página" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Paginação">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Gauge className="h-4 w-4" /><span>Rigidez</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Nível de rigidez da paginação</DropdownMenuLabel>
            {[
              { label: "🟢 Suave", value: "soft", desc: "Texto flui livremente, menos quebras" },
              { label: "🟡 Balanceado", value: "balanced", desc: "Equilíbrio entre fluxo e quebras" },
              { label: "🔴 Rigoroso", value: "strict", desc: "Mais quebras, evita cortes ao máximo" },
            ].map(({ label, value, desc }) => (
              <DropdownMenuItem key={value} onClick={() => {
                window.dispatchEvent(new CustomEvent('editor-pagination-rigidity', { detail: { level: value } }));
              }}>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{desc}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Plano de Fundo">
        <WatermarkDropdown editor={editor} />
        <PageColorDropdown editor={editor} />
        <PageBorderDropdown editor={editor} />
      </RibbonGroup>
      <RibbonGroup label="Modelo">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <LayoutTemplate className="h-4 w-4" /><span>Modelo</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuLabel className="text-xs">Modelo de Formatação</DropdownMenuLabel>
            {[
              { id: "padrao", label: "Padrão", desc: "Layout simples, sem estilos especiais" },
              { id: "personalizado", label: "Personalizado", desc: "Arial 10pt, 2 colunas, títulos com fundo cinza" },
              { id: "enem", label: "Estilo ENEM", desc: "Times New Roman 10pt, 2 colunas" },
              { id: "concurso", label: "Estilo Concurso", desc: "Arial 10pt, 2 colunas compacto" },
              { id: "vestibular", label: "Estilo Vestibular", desc: "Georgia 11pt, 1 coluna" },
            ].map(({ id, label, desc }) => (
              <DropdownMenuItem key={id} onClick={() => {
                const wrapper = document.querySelector('.exam-wrapper') as HTMLElement;
                if (wrapper) wrapper.setAttribute('data-template', id === 'padrao' ? '' : id);
                window.dispatchEvent(new CustomEvent('editor-template-change', { detail: { template: id === 'padrao' ? '' : id } }));
              }}>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{desc}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
    </>
  );
}
