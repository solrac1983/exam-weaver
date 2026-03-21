import { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Ruler, Grid3X3, ZoomIn, ZoomOut, Printer, BarChart2, AlertCircle, AlignVerticalSpaceAround, Focus,
} from "lucide-react";
import { RibbonBtn, RibbonStackedBtn, RibbonGroup, RibbonDivider } from "./RibbonShared";

export function ViewTab({ zoom, onZoomChange, editor }: { zoom: number; onZoomChange: (z: number) => void; editor: Editor }) {
  const [showRuler, setShowRuler] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showMarginGuides, setShowMarginGuides] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const toggleRuler = () => {
    const next = !showRuler; setShowRuler(next);
    let el = document.querySelector('#editor-ruler-style') as HTMLStyleElement;
    if (!el) { el = document.createElement('style'); el.id = 'editor-ruler-style'; document.head.appendChild(el); }
    el.textContent = next ? `.exam-page { background-image: linear-gradient(to right, transparent 59px, hsl(var(--border)) 59px, hsl(var(--border)) 60px, transparent 60px); background-size: 100% 100%; background-repeat: no-repeat; }` : '';
  };

  const toggleGrid = () => {
    const next = !showGrid; setShowGrid(next);
    let el = document.querySelector('#editor-grid-style') as HTMLStyleElement;
    if (!el) { el = document.createElement('style'); el.id = 'editor-grid-style'; document.head.appendChild(el); }
    el.textContent = next ? `.tiptap { background-image: linear-gradient(hsl(var(--border) / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.15) 1px, transparent 1px); background-size: 20px 20px; }` : '';
  };

  const toggleMarginGuides = () => {
    const next = !showMarginGuides;
    setShowMarginGuides(next);
    const tiptapEl = document.querySelector('.exam-page .tiptap');
    if (tiptapEl) {
      tiptapEl.classList.toggle('show-margin-guides', next);
    }
  };

  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    window.dispatchEvent(new Event('editor-toggle-focus-mode'));
    toast.success(next ? "Modo foco ativado" : "Modo foco desativado");
  };

  const handlePrintPreview = () => {
    const examElement = document.querySelector('.exam-page') as HTMLElement | null;
    if (!examElement) { window.print(); return; }
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900');
    if (!printWindow) { window.print(); return; }
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map((node) => node.outerHTML).join('\n');
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Visualização de Impressão</title>${styles}<style>html,body{margin:0;padding:0;background:#fff}.print-root{display:flex;justify-content:center;padding:10mm}.print-root .exam-page{transform:none!important;box-shadow:none!important;border:none!important;border-radius:0!important;margin:0!important;width:210mm!important;max-width:210mm!important;min-height:297mm!important;background:#fff!important}@media print{.print-root{padding:0}@page{size:A4 portrait;margin:10mm}}</style></head><body><main class="print-root">${examElement.outerHTML}</main></body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 250);
  };

  return (
    <>
      <RibbonGroup label="EXIBIR">
        <RibbonStackedBtn onClick={toggleRuler} active={showRuler} icon={Ruler} label="Régua" description="Mostrar/ocultar a régua vertical na lateral do documento" />
        <RibbonStackedBtn onClick={toggleGrid} active={showGrid} icon={Grid3X3} label="Grade" description="Exibir uma grade de referência sobre o documento" />
        <RibbonStackedBtn onClick={toggleMarginGuides} active={showMarginGuides} icon={AlignVerticalSpaceAround} label="Margens" description="Mostrar/ocultar as guias visuais de margem" />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="MODO FOCO">
        <RibbonStackedBtn onClick={toggleFocusMode} active={focusMode} icon={Focus} label="Foco" description="Ativar modo foco: oculta distrações para concentração na escrita" />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="ZOOM">
        <RibbonBtn onClick={() => onZoomChange(Math.max(50, zoom - 10))} icon={ZoomOut} label="Diminuir zoom" shortcut="Ctrl+−" description="Reduzir o nível de zoom do documento" />
        <span className="text-xs font-medium text-white/90 min-w-[36px] text-center tabular-nums">{zoom}%</span>
        <RibbonBtn onClick={() => onZoomChange(Math.min(200, zoom + 10))} icon={ZoomIn} label="Aumentar zoom" shortcut="Ctrl++" description="Aumentar o nível de zoom do documento" />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="PREDEFINIÇÕES">
        {[75, 100, 125, 150].map(z => (
          <button key={z} onClick={() => onZoomChange(z)} className={cn(
            "px-2 py-0.5 rounded text-[10px] font-medium transition-all",
            zoom === z
              ? "bg-white/20 text-white shadow-[inset_0_0_0_1px_hsl(0_0%_100%/0.25)]"
              : "text-white/50 hover:text-white hover:bg-white/10"
          )}>{z}%</button>
        ))}
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="IMPRESSÃO">
        <RibbonStackedBtn onClick={handlePrintPreview} icon={Printer} label="Imprimir" shortcut="Ctrl+P" description="Abrir visualização de impressão do documento" />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="ESTATÍSTICAS">
        <RibbonStackedBtn
          onClick={() => {
            const html = editor.getHTML();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const allText = doc.body.innerText || '';
            const questionMatches = allText.match(/(?:^|\n)\s*\d+[\.\)\-]/g) || [];
            const questionKeyword = (allText.match(/quest[aã]o/gi) || []).length;
            const total = Math.max(questionMatches.length, questionKeyword);
            const images = doc.body.querySelectorAll('img').length;
            const tables = doc.body.querySelectorAll('table').length;
            toast('📊 Estatísticas do Documento', { description: `📝 Questões: ~${total} · 🖼️ Imagens: ${images} · 📋 Tabelas: ${tables}`, duration: 10000 });
          }}
          icon={BarChart2} label="Contar"
          description="Contar questões, imagens e tabelas no documento"
        />
        <RibbonStackedBtn
          onClick={() => {
            const html = editor.getHTML();
            const issues: string[] = [];
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            if (doc.body.querySelectorAll('img').length === 0) issues.push('⚠️ Nenhuma imagem');
            const text = (doc.body.textContent || '').trim();
            if (text.length < 50) issues.push('⚠️ Documento muito curto');
            if (!/\b[abcdABCD]\)|\([abcdABCD]\)/.test(text)) issues.push('ℹ️ Sem alternativas detectadas');
            if (issues.length === 0) toast.success('✅ Nenhum problema encontrado.');
            else toast('🔍 Verificação', { description: issues.join(' · '), duration: 10000 });
          }}
          icon={AlertCircle} label="Verificar"
          description="Verificar problemas comuns: imagens ausentes, alternativas e tamanho"
        />
      </RibbonGroup>
    </>
  );
}
