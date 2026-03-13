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
  ListChecks, PenLine, CheckCheck, Columns2,
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
import { RibbonBtn, RibbonGroup } from "./RibbonShared";
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

  return (
    <>
      <RibbonGroup label="Imagem">
        <RibbonBtn onClick={addImage} icon={ImagePlus} label="Upload do computador" size="lg" />
        <RibbonBtn onClick={addImageFromUrl} icon={LinkIcon} label="URL da imagem" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Tabela">
        <TableDropdown editor={editor} />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Formas">
        <ShapesDropdown onInsert={insertShapeSvg} />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Gráficos">
        <ChartsDropdown editor={editor} />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Ícones">
        <IconsDropdown editor={editor} />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Cabeçalho / Rodapé">
        <DropdownMenu onOpenChange={(open) => { if (open) loadTemplates(); }}>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Inserir cabeçalho de imagem">
              <PanelTop className="h-4 w-4" />
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
        <RibbonBtn onClick={() => setShowHeaderFooterDialog(true)} icon={PanelBottom} label="Cabeçalho / Rodapé / Numeração" />
        <RibbonBtn onClick={() => insertPageBreakAtEnd(editor)} icon={FileUp} label="Quebra de página" />
        <RibbonBtn onClick={() => {
          editor.chain().focus().setHorizontalRule().insertContent({ type: 'blankPage' }).run();
          toast.success("Página em branco inserida abaixo.");
        }} icon={FilePlus} label="Inserir página em branco" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Modelos">
        <DropdownMenu onOpenChange={(open) => { if (open) loadTemplates(); }}>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <FileText className="h-5 w-5" />
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
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Plano de Fundo">
        <WatermarkDropdown editor={editor} />
        <PageColorDropdown editor={editor} />
        <PageBorderDropdown editor={editor} />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Texto">
        <RibbonBtn onClick={insertTextBox} icon={TextCursorInput} label="Caixa de texto" />
        <RibbonBtn onClick={() => setShowWordArt(true)} icon={Sparkles} label="WordArt" />
      </RibbonGroup>
      <WordArtDialog open={showWordArt} onOpenChange={setShowWordArt} onInsert={insertWordArt} />
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Equações">
        <div className="relative">
          <RibbonBtn onClick={() => setShowEquationPanel(!showEquationPanel)} active={showEquationPanel} icon={Sigma} label="Equações" size="lg" />
          {showEquationPanel && <EquationPanel onInsert={handleInsertEquation} onClose={() => setShowEquationPanel(false)} />}
        </div>
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Separadores">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <MoreHorizontal className="h-4 w-4" />
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
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Questões">
        <RibbonBtn
          onClick={() => {
            const html = editor.getHTML();
            const questionRegex = /(?:^|\>)\s*(\d+)[\.\)\-]/g;
            let maxNum = 0, m;
            while ((m = questionRegex.exec(html)) !== null) { const n = parseInt(m[1]); if (n > maxNum) maxNum = n; }
            editor.chain().focus().insertContent(`<p><strong>${maxNum + 1}.</strong> </p>`).run();
          }}
          icon={Hash}
          label="Inserir questão numerada"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <MinusIcon className="h-4 w-4" />
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
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Recorte">
        <RibbonBtn onClick={() => {
          editor.chain().focus().insertContent(
            '<p style="text-align:center;border-top:2px dashed currentColor;margin:20px 0 8px;padding-top:4px;font-size:11px;opacity:0.5;">✂️ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ✂️</p>'
          ).run();
        }} icon={Scissors} label="Linha de recorte (destacável)" />
      </RibbonGroup>
      <Separator orientation="vertical" className="h-10" />
      <RibbonGroup label="Link / Comentário">
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <LinkIcon className="h-4 w-4" />
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
