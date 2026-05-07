import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Printer, FileDown, ZoomIn, ZoomOut, Maximize2, Minimize2, FileText,
  ChevronLeft, ChevronRight, X, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadPageSettings, type PageSettings } from "./PageSettingsPanel";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Orientation = "portrait" | "landscape";

const PAPER_MM: Record<string, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  letter: { w: 216, h: 279 },
  legal: { w: 216, h: 356 },
};

/**
 * Modern, in-app print preview. Captures the live `.exam-page` markup,
 * renders it inside a sandboxed iframe with all current stylesheets, and
 * lets users zoom, change orientation/margin and trigger print or PDF.
 * Uses the editor's actual PageSettings so the preview matches the PDF.
 */
export function PrintPreviewDialog({ open, onOpenChange }: PrintPreviewDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Default to 100 % so what users see matches the printed PDF 1:1
  const [zoom, setZoom] = useState(100);
  const [pageSettings, setPageSettings] = useState<PageSettings>(() => loadPageSettings());
  const [orientation, setOrientation] = useState<Orientation>(pageSettings.orientation);
  const [pageCount, setPageCount] = useState(1);
  const [activePage, setActivePage] = useState(1);
  const [loading, setLoading] = useState(true);

  const paper = PAPER_MM[pageSettings.paper] || PAPER_MM.a4;
  const dims = orientation === "portrait" ? paper : { w: paper.h, h: paper.w };
  const { marginTopMm, marginBottomMm, marginLeftMm, marginRightMm } = pageSettings;

  const html = useMemo(() => {
    if (!open) return "";
    const examElement = document.querySelector(".exam-page") as HTMLElement | null;
    if (!examElement) return "";
    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    ).map((n) => n.outerHTML).join("\n");

    // Resolve relative image URLs (and other src/href) by setting <base>
    // to the current document base so <img src="/x.png"> and blob: URLs work.
    const baseHref = document.baseURI;

    // Clone the exam DOM so we can rewrite image URLs to absolute and
    // ensure math (KaTeX) inner HTML is preserved exactly as rendered.
    const examClone = examElement.cloneNode(true) as HTMLElement;
    examClone.querySelectorAll("img").forEach((img) => {
      // Force the resolved absolute URL — protects against blob URLs and
      // CSS background images getting lost when the doc is rewritten.
      const resolved = (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src;
      if (resolved) img.setAttribute("src", resolved);
      img.setAttribute("crossorigin", "anonymous");
      img.style.maxWidth = "100%";
    });
    // Make sure KaTeX rendered nodes keep their inline-block layout in print
    examClone.querySelectorAll(".katex, .katex-display").forEach((el) => {
      (el as HTMLElement).style.color = "#111";
    });

    const { w, h } = dims;
    return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<base href="${baseHref}"/>
<title>Pré-visualização</title>
${styles}
<style>
  html,body{margin:0;padding:0;background:transparent;color-scheme:light;}
  body{display:flex;flex-direction:column;align-items:center;gap:18px;padding:24px 12px;}
  .pp-page{
    width:${w}mm;min-height:${h}mm;background:#fff;color:#111;
    box-shadow:0 1px 2px rgba(0,0,0,.06),0 12px 28px -12px rgba(0,0,0,.25);
    border-radius:6px;overflow:hidden;position:relative;
  }
  .pp-page .exam-page{
    transform:none!important;box-shadow:none!important;border:none!important;
    border-radius:0!important;margin:0!important;
    width:${w}mm!important;max-width:${w}mm!important;min-height:${h}mm!important;
    background:#fff!important;
    padding:${marginTopMm}mm ${marginRightMm}mm ${marginBottomMm}mm ${marginLeftMm}mm!important;
  }
  .pp-badge{
    position:absolute;top:8px;right:10px;font:500 10px/1 Inter,system-ui,sans-serif;
    color:#9ca3af;letter-spacing:.04em;
  }
  @media print{
    body{padding:0;gap:0;background:#fff;}
    .pp-page{box-shadow:none;border-radius:0;}
    .pp-badge{display:none;}
    @page{size:${w}mm ${h}mm;margin:${marginTopMm}mm ${marginRightMm}mm ${marginBottomMm}mm ${marginLeftMm}mm;}
  }
</style></head><body>
<div class="pp-page" data-page="1"><span class="pp-badge">1</span>${examClone.outerHTML}</div>
<script>
  window.addEventListener('load', () => parent.postMessage({type:'pp-ready'}, '*'));
</script>
</body></html>`;
  }, [open, dims.w, dims.h, marginTopMm, marginBottomMm, marginLeftMm, marginRightMm]);

  // load html into iframe
  useEffect(() => {
    if (!open || !iframeRef.current || !html) return;
    setLoading(true);
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [open, html]);

  // listen for ready / measure pages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "pp-ready") {
        setLoading(false);
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;
        const exam = doc.querySelector(".exam-page") as HTMLElement | null;
        if (exam) {
          const pageHeight = orientation === "portrait" ? 297 : 210;
          const mmPerPx = pageHeight / exam.getBoundingClientRect().height || 1;
          const pages = Math.max(1, Math.ceil(exam.scrollHeight * mmPerPx / pageHeight));
          setPageCount(pages);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [orientation, html]);

  // reset on open + reload live page settings from editor
  useEffect(() => {
    if (open) {
      setActivePage(1);
      setZoom(100);
      const live = loadPageSettings();
      setPageSettings(live);
      setOrientation(live.orientation);
      const defaults = (window as any).__examPrintDefaults as
        | { orientation?: Orientation }
        | null
        | undefined;
      if (defaults?.orientation === "portrait" || defaults?.orientation === "landscape") {
        setOrientation(defaults.orientation);
      }
    }
  }, [open]);

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus(); win.print();
  };

  const fitToWidth = () => setZoom(100);
  // Note: zoom = 100 % renders the page at its real physical mm size,
  // matching exactly what the exported PDF will look like.

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[92vh] p-0 gap-0 overflow-hidden flex flex-col bg-background">
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b border-border/60 flex flex-row items-center justify-between space-y-0 bg-card/60 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">Pré-visualização de Impressão</DialogTitle>
              <p className="text-[11px] text-muted-foreground">Revise antes de imprimir ou exportar como PDF</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-md hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-5 py-2.5 border-b border-border/60 bg-muted/30 flex flex-wrap items-center gap-3">
          {/* Orientation */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Orientação</span>
            <ToggleGroup
              type="single"
              size="sm"
              value={orientation}
              onValueChange={(v) => v && setOrientation(v as Orientation)}
              className="h-8"
            >
              <ToggleGroupItem value="portrait" className="text-xs px-2.5 h-8">Retrato</ToggleGroupItem>
              <ToggleGroupItem value="landscape" className="text-xs px-2.5 h-8">Paisagem</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Margins (read-only — synced from editor's Page Settings) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Margens</span>
            <span className="text-xs tabular-nums px-2 py-1 rounded bg-muted/60 border border-border/40">
              {marginTopMm}/{marginRightMm}/{marginBottomMm}/{marginLeftMm} mm
            </span>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Zoom */}
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(40, z - 10))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium tabular-nums w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitToWidth} title="Escala real (100% = tamanho do PDF)">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handlePrint}>
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </Button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 min-h-0 relative bg-[radial-gradient(circle_at_top,hsl(var(--muted)/0.4),transparent_60%)] overflow-auto">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando pré-visualização…
              </div>
            </div>
          )}
          <div
            className="min-h-full w-full flex justify-center py-6"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          >
            <iframe
              ref={iframeRef}
              title="Pré-visualização"
              className={cn("border-0 bg-transparent", "w-full")}
              style={{ height: "calc(92vh - 110px)", minHeight: 600 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-border/60 bg-card/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{pageSettings.paper.toUpperCase()} · {dims.w}×{dims.h} mm · {orientation === "portrait" ? "Retrato" : "Paisagem"} · Margens {marginTopMm}/{marginRightMm}/{marginBottomMm}/{marginLeftMm} mm</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={activePage <= 1}
              onClick={() => setActivePage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="tabular-nums">Página {activePage} de {pageCount}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={activePage >= pageCount}
              onClick={() => setActivePage((p) => Math.min(pageCount, p + 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
