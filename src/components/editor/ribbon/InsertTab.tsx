import { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback } from "react";
import {
  ImagePlus, Link as LinkIcon, Table, BarChart3, Shapes,
  Smile, FilePlus, FileUp, FileText, PanelTop, PanelBottom,
  TextCursorInput, Sparkles, Sigma, Hash, Scissors,
  MoreHorizontal, Minus as MinusIcon, Search, Palette, Square,
  ListChecks, PenLine, CheckCheck, Columns2, BookOpen, Footprints,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { RibbonBtn, RibbonStackedBtn, RibbonGroup, RibbonDivider } from "./RibbonShared";
import { insertPageBreakAtEnd } from "./RibbonConstants";
import { EquationPanel } from "../EquationPanel";
import { WordArtDialog } from "../WordArtDialog";
import { HeaderFooterDialog } from "../HeaderFooterDialog";
import type { HeaderFooterConfig } from "../PageHeaderFooterOverlay";
import { ChartEditorTab, isChartImage, parseChartData, serializeChartData, chartDataToImageSrc, getDefaultChartData, type ChartData } from "../ChartEditorTab";
import { getLastQuestionNumber } from "@/lib/examQuestionUtils";
import { Input } from "@/components/ui/input";

// Import sub-dropdowns
import { ShapesDropdown } from "./ShapesDropdown";
import { IconsDropdown } from "./IconsDropdown";
import { ChartsDropdown } from "./ChartsDropdown";
import { TableDropdown } from "./TableDropdown";
import { WatermarkDropdown, PageColorDropdown, PageBorderDropdown } from "./PageBackgroundDropdowns";
import { LinkPopoverContent } from "./LinkPopoverContent";

interface InsertTabProps {
  editor: Editor;
  addImage: () => void;
  addImageFromUrl: () => void;
  addTable: () => void;
  insertFormula: () => void;
  showComments?: boolean;
  onToggleComments?: () => void;
  headerFooterConfig?: HeaderFooterConfig;
  onHeaderFooterConfigChange?: (config: HeaderFooterConfig) => void;
}

export function InsertTab({ editor, addImage, addImageFromUrl, addTable, insertFormula, showComments, onToggleComments, headerFooterConfig, onHeaderFooterConfigChange }: InsertTabProps) {
  const [showEquationPanel, setShowEquationPanel] = useState(false);
  const [showHeaderFooterDialog, setShowHeaderFooterDialog] = useState(false);
  const [showWordArt, setShowWordArt] = useState(false);
  const [headersList, setHeadersList] = useState<{ id: string; name: string; file_url: string; segment: string | null; grade: string | null }[]>([]);
  const [docsList, setDocsList] = useState<{ id: string; name: string; file_url: string; category: string | null }[]>([]);
  const [loadedTemplates, setLoadedTemplates] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (loadedTemplates) return;
    setLoadedTemplates(true);
    const [hRes, dRes] = await Promise.all([
      supabase.from("template_headers").select("id, name, file_url, segment, grade").order("created_at", { ascending: false }),
      supabase.from("template_documents").select("id, name, file_url, category").order("created_at", { ascending: false }),
    ]);
    if (hRes.data) setHeadersList(hRes.data);
    if (dRes.data) setDocsList(dRes.data);
  }, [loadedTemplates]);

  const insertHeaderImage = (url: string) => { (editor.commands as any).setImage({ src: url }); };

  const insertDocTemplate = async (url: string) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.convertToHtml({ arrayBuffer });
      editor.commands.setContent(result.value);
    } catch { toast.error("Não foi possível carregar o modelo."); }
  };

  const handleInsertEquation = (formula: string, display?: boolean) => {
    (editor.commands as any).insertFormula({ formula, display: display || false });
    setShowEquationPanel(false);
  };

  const insertShapeSvg = (svgContent: string, defaultSize = 80, fillColor = "#000000", strokeColor = "#000000", strokeWidth = 3) => {
    let svg = svgContent
      .replace(/fill="currentColor"/g, `fill="${fillColor}"`)
      .replace(/stroke="currentColor"/g, `stroke="${strokeColor}"`)
      .replace(/stroke-width="\d+"/g, `stroke-width="${strokeWidth}"`);
    if (!svg.includes('xmlns=')) svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    svg = svg.replace('<svg ', `<svg width="${defaultSize}" height="${defaultSize}" `);
    const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    (editor.commands as any).setImage({ src: dataUri, alt: "Forma", customWidth: defaultSize, customHeight: defaultSize });
  };

  const insertWordArt = (html: string) => { editor.chain().focus().insertContent(html).run(); };

  const insertTextBox = () => {
    editor.chain().focus().insertContent(
      `<p style="border: 1px solid currentColor; padding: 12px; margin: 8px 0; border-radius: 4px;">Caixa de texto — edite aqui</p>`
    ).run();
  };

  const insertTOC = () => {
    const html = editor.getHTML();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3');
    if (headings.length === 0) {
      toast.info("Nenhum título encontrado no documento. Use Título 1, 2 ou 3 para gerar o sumário.");
      return;
    }
    const items = Array.from(headings).map(h => {
      const level = parseInt(h.tagName[1]);
      const indent = (level - 1) * 20;
      return `<li style="padding-left: ${indent}px;">${h.textContent}</li>`;
    });
    const tocHtml = `<div class="toc-block"><h3>📋 Sumário</h3><ul>${items.join('')}</ul></div>`;
    editor.chain().focus().insertContent(tocHtml).run();
    toast.success("Sumário inserido!");
  };

  const insertFootnote = () => {
    // Count existing footnotes
    const html = editor.getHTML();
    const count = (html.match(/class="footnote-ref"/g) || []).length + 1;
    editor.chain().focus().insertContent(
      `<sup class="footnote-ref">[${count}]</sup>`
    ).run();

    // Check if footnotes section exists, if not create it
    if (!html.includes('class="footnotes-section"')) {
      const currentHtml = editor.getHTML();
      editor.commands.setContent(
        currentHtml + `<div class="footnotes-section"><p><sup>[${count}]</sup> Nota de rodapé ${count}.</p></div>`
      );
    } else {
      // Append to existing footnotes section
      const currentHtml = editor.getHTML();
      const newHtml = currentHtml.replace(
        '</div><!-- footnotes-end -->',
        `<p><sup>[${count}]</sup> Nota de rodapé ${count}.</p></div>`
      );
      // Fallback: append before closing div of footnotes-section
      if (newHtml === currentHtml) {
        const parts = currentHtml.split('class="footnotes-section"');
        if (parts.length > 1) {
          const lastDivClose = parts[1].lastIndexOf('</div>');
          if (lastDivClose >= 0) {
            parts[1] = parts[1].substring(0, lastDivClose) + `<p><sup>[${count}]</sup> Nota de rodapé ${count}.</p>` + parts[1].substring(lastDivClose);
            editor.commands.setContent(parts[0] + 'class="footnotes-section"' + parts[1]);
          }
        }
      } else {
        editor.commands.setContent(newHtml);
      }
    }
    toast.success(`Nota de rodapé [${count}] inserida!`);
  };

  return (
    <>
      {/* ── Imagem ── */}
      <RibbonGroup label="IMAGEM">
        <RibbonStackedBtn onClick={addImage} icon={ImagePlus} label="Upload" />
        <RibbonBtn onClick={addImageFromUrl} icon={LinkIcon} label="URL da imagem" />
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Tabela ── */}
      <RibbonGroup label="TABELA">
        <TableDropdown editor={editor} />
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Formas & Gráficos & Ícones ── */}
      <RibbonGroup label="ILUSTRAÇÕES">
        <RibbonStackedBtn onClick={() => {}} icon={Shapes} label="Formas" className="hidden" />
        <ShapesDropdown onInsert={insertShapeSvg} />
        <ChartsDropdown editor={editor} />
        <IconsDropdown editor={editor} />
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Cabeçalho / Rodapé ── */}
      <RibbonGroup label="CABEÇALHO / RODAPÉ">
        <DropdownMenu onOpenChange={(open) => { if (open) loadTemplates(); }}>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-[3px] rounded-md px-2 py-1.5 min-w-[44px] text-white/75 hover:text-white hover:bg-white/[0.12] transition-all" title="Inserir cabeçalho de imagem">
              <PanelTop className="h-[18px] w-[18px]" />
              <span className="text-[9px] font-medium leading-none whitespace-nowrap tracking-wide select-none">Cabeçalho</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px] max-h-[300px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Cabeçalhos cadastrados</DropdownMenuLabel>
            {headersList.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum cabeçalho cadastrado</DropdownMenuItem>}
            {headersList.map((h) => (
              <DropdownMenuItem key={h.id} onClick={() => insertHeaderImage(h.file_url)} className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-medium">{h.name}</span>
                {(h.segment || h.grade) && <span className="text-[10px] text-muted-foreground">{[h.segment, h.grade].filter(Boolean).join(" • ")}</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <RibbonStackedBtn onClick={() => setShowHeaderFooterDialog(true)} icon={PanelBottom} label="Rodapé" />
        <RibbonStackedBtn onClick={() => insertPageBreakAtEnd(editor)} icon={FileUp} label="Quebra" />
        <RibbonBtn onClick={() => {
          editor.chain().focus().setHorizontalRule().insertContent({ type: 'blankPage' }).run();
          toast.success("Página em branco inserida abaixo.");
        }} icon={FilePlus} label="Página em branco" />
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Modelos ── */}
      <RibbonGroup label="MODELOS">
        <DropdownMenu onOpenChange={(open) => { if (open) loadTemplates(); }}>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-[3px] rounded-md px-2 py-1.5 min-w-[44px] text-white/75 hover:text-white hover:bg-white/[0.12] transition-all">
              <FileText className="h-[18px] w-[18px]" />
              <span className="text-[9px] font-medium leading-none whitespace-nowrap tracking-wide select-none">Modelos</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px] max-h-[350px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Cabeçalhos de prova</DropdownMenuLabel>
            {headersList.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum cabeçalho cadastrado</DropdownMenuItem>}
            {headersList.map((h) => (
              <DropdownMenuItem key={h.id} onClick={() => insertHeaderImage(h.file_url)} className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-medium">{h.name}</span>
                {(h.segment || h.grade) && <span className="text-[10px] text-muted-foreground">{[h.segment, h.grade].filter(Boolean).join(" • ")}</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Modelos de prova (.docx)</DropdownMenuLabel>
            {docsList.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum modelo cadastrado</DropdownMenuItem>}
            {docsList.map((d) => (
              <DropdownMenuItem key={d.id} onClick={() => insertDocTemplate(d.file_url)} className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-medium">{d.name}</span>
                {d.category && <span className="text-[10px] text-muted-foreground">{d.category}</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Plano de Fundo ── */}
      <RibbonGroup label="PLANO DE FUNDO">
        <WatermarkDropdown editor={editor} />
        <PageColorDropdown editor={editor} />
        <PageBorderDropdown editor={editor} />
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Referências ── */}
      <RibbonGroup label="REFERÊNCIAS">
        <RibbonStackedBtn onClick={insertTOC} icon={BookOpen} label="Sumário" />
        <RibbonStackedBtn onClick={insertFootnote} icon={Footprints} label="Notas" />
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Texto & Equações ── */}
      <RibbonGroup label="TEXTO">
        <RibbonStackedBtn onClick={insertTextBox} icon={TextCursorInput} label="Caixa" />
        <RibbonStackedBtn onClick={() => setShowWordArt(true)} icon={Sparkles} label="WordArt" />
        <div className="relative">
          <RibbonStackedBtn onClick={() => setShowEquationPanel(!showEquationPanel)} active={showEquationPanel} icon={Sigma} label="Equações" />
          {showEquationPanel && <EquationPanel onInsert={handleInsertEquation} onClose={() => setShowEquationPanel(false)} />}
        </div>
      </RibbonGroup>
      <WordArtDialog open={showWordArt} onOpenChange={setShowWordArt} onInsert={insertWordArt} />
      <RibbonDivider />

      {/* ── Separadores ── */}
      <RibbonGroup label="SEPARADORES">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-[3px] rounded-md px-2 py-1.5 min-w-[44px] text-white/75 hover:text-white hover:bg-white/[0.12] transition-all">
              <MoreHorizontal className="h-[18px] w-[18px]" />
              <span className="text-[9px] font-medium leading-none whitespace-nowrap tracking-wide select-none">Linhas</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Separadores Estilizados</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>─── Linha simples</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="text-align:center;border-top:2px dashed currentColor;margin:16px 0;padding:0;"></p>').run()}>- - - Linha tracejada</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="text-align:center;border-top:2px dotted currentColor;margin:16px 0;padding:0;"></p>').run()}>··· Linha pontilhada</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="text-align:center;border-top:3px double currentColor;margin:16px 0;padding:0;"></p>').run()}>═══ Linha dupla</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Questões ── */}
      <RibbonGroup label="QUESTÕES">
        <RibbonStackedBtn
          onClick={() => {
            const num = getLastQuestionNumber(editor.getHTML()) + 1;
            editor.chain().focus().insertContent(`<p><strong>${num})</strong> </p>`).run();
          }}
          icon={Hash}
          label="Numerar"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-[3px] rounded-md px-2 py-1.5 min-w-[44px] text-white/75 hover:text-white hover:bg-white/[0.12] transition-all" title="Templates de questão">
              <ListChecks className="h-[18px] w-[18px]" />
              <span className="text-[9px] font-medium leading-none whitespace-nowrap tracking-wide select-none">Templates</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[260px]">
            <DropdownMenuLabel className="text-xs">Templates Inteligentes</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              const num = getLastQuestionNumber(editor.getHTML()) + 1;
              const html = `<p><strong>${num})</strong> Enunciado da questão...</p>` +
                ['a', 'b', 'c', 'd', 'e'].map(l => `<p>${l}) </p>`).join('');
              editor.chain().focus().insertContent(html).run();
            }}>
              <ListChecks className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Múltipla Escolha (A–E)</span>
                <span className="text-[10px] text-muted-foreground">5 alternativas com enunciado</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const num = getLastQuestionNumber(editor.getHTML()) + 1;
              const html = `<p><strong>${num})</strong> Enunciado da questão...</p>` +
                ['a', 'b', 'c', 'd'].map(l => `<p>${l}) </p>`).join('');
              editor.chain().focus().insertContent(html).run();
            }}>
              <ListChecks className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Múltipla Escolha (A–D)</span>
                <span className="text-[10px] text-muted-foreground">4 alternativas com enunciado</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const num = getLastQuestionNumber(editor.getHTML()) + 1;
              const lines = Array.from({ length: 5 }, () => '<p style="border-bottom:1px solid currentColor;min-height:28px;margin:4px 0;"></p>').join('');
              const html = `<p><strong>${num})</strong> Enunciado da questão dissertativa...</p>${lines}`;
              editor.chain().focus().insertContent(html).run();
            }}>
              <PenLine className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Dissertativa</span>
                <span className="text-[10px] text-muted-foreground">Enunciado + linhas para resposta</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const num = getLastQuestionNumber(editor.getHTML()) + 1;
              const items = ['Afirmação 1...', 'Afirmação 2...', 'Afirmação 3...', 'Afirmação 4...', 'Afirmação 5...'];
              const html = `<p><strong>${num})</strong> Classifique as afirmações abaixo em Verdadeiro (V) ou Falso (F):</p>` +
                items.map(item => `<p>( &nbsp; ) ${item}</p>`).join('');
              editor.chain().focus().insertContent(html).run();
            }}>
              <CheckCheck className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Verdadeiro ou Falso</span>
                <span className="text-[10px] text-muted-foreground">5 afirmações com espaço V/F</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const num = getLastQuestionNumber(editor.getHTML()) + 1;
              const html =
                `<p><strong>${num})</strong> Associe as colunas abaixo:</p>` +
                `<p><strong>Coluna A</strong></p>` +
                `<p>(1) Item 1</p><p>(2) Item 2</p><p>(3) Item 3</p><p>(4) Item 4</p>` +
                `<p></p>` +
                `<p><strong>Coluna B</strong></p>` +
                `<p>( &nbsp; ) Descrição A</p><p>( &nbsp; ) Descrição B</p><p>( &nbsp; ) Descrição C</p><p>( &nbsp; ) Descrição D</p>` +
                `<p></p>` +
                `<p>A sequência correta é:</p>` +
                ['a', 'b', 'c', 'd', 'e'].map(l => `<p>${l}) </p>`).join('');
              editor.chain().focus().insertContent(html).run();
            }}>
              <Columns2 className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Associação de Colunas</span>
                <span className="text-[10px] text-muted-foreground">Coluna A × Coluna B com alternativas</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-[3px] rounded-md px-2 py-1.5 min-w-[44px] text-white/75 hover:text-white hover:bg-white/[0.12] transition-all" title="Espaço para resposta">
              <MinusIcon className="h-[18px] w-[18px]" />
              <span className="text-[9px] font-medium leading-none whitespace-nowrap tracking-wide select-none">Linhas</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuLabel className="text-xs">Espaço para Resposta</DropdownMenuLabel>
            {[3, 5, 10].map(n => (
              <DropdownMenuItem key={n} onClick={() => {
                const lines = Array.from({length: n}, () => '<p style="border-bottom:1px solid currentColor;min-height:28px;margin:4px 0;"></p>').join('');
                editor.chain().focus().insertContent(lines).run();
              }}>📝 {n} linhas pautadas</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="border:1px solid currentColor;min-height:120px;margin:8px 0;border-radius:4px;padding:8px;"></p>').run()}>📦 Caixa para resposta (pequena)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="border:1px solid currentColor;min-height:240px;margin:8px 0;border-radius:4px;padding:8px;"></p>').run()}>📦 Caixa para resposta (grande)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Recorte ── */}
      <RibbonGroup label="RECORTE">
        <RibbonStackedBtn onClick={() => {
          editor.chain().focus().insertContent(
            '<p style="text-align:center;border-top:2px dashed currentColor;margin:20px 0 8px;padding-top:4px;font-size:11px;opacity:0.5;">✂️ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ✂️</p>'
          ).run();
        }} icon={Scissors} label="Recortar" />
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Link / Comentário ── */}
      <RibbonGroup label="LINK / COMENTÁRIO">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-[3px] rounded-md px-2 py-1.5 min-w-[44px] text-white/75 hover:text-white hover:bg-white/[0.12] transition-all">
              <LinkIcon className="h-[18px] w-[18px]" />
              <span className="text-[9px] font-medium leading-none whitespace-nowrap tracking-wide select-none">Link</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="start">
            <LinkPopoverContent editor={editor} />
          </PopoverContent>
        </Popover>
      </RibbonGroup>

      {showHeaderFooterDialog && headerFooterConfig && onHeaderFooterConfigChange && (
        <HeaderFooterDialog
          open={showHeaderFooterDialog}
          onOpenChange={setShowHeaderFooterDialog}
          config={headerFooterConfig}
          onSave={onHeaderFooterConfigChange}
        />
      )}
    </>
  );
}
