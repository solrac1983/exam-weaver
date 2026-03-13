/**
 * Shared utility for PDF export and Print from the exam editor.
 * Clones the live DOM, bakes computed styles inline, and opens
 * a print-ready window with all formatting preserved.
 */

const BAKE_PROPS = [
  "font-family", "font-size", "font-weight", "font-style",
  "text-decoration", "text-align", "color", "background-color",
  "margin", "padding", "border", "line-height", "vertical-align",
  "width", "letter-spacing", "text-indent", "text-transform",
] as const;

function bakeStyles(source: HTMLElement, target: HTMLElement) {
  if (source.nodeType !== Node.ELEMENT_NODE) return;
  const computed = window.getComputedStyle(source);
  const parts: string[] = [];
  for (const prop of BAKE_PROPS) {
    const val = computed.getPropertyValue(prop);
    if (!val || val === "initial" || val === "inherit") continue;
    if (prop === "background-color" && (val === "rgba(0, 0, 0, 0)" || val === "transparent")) continue;
    if (prop === "width" && (val === "auto" || val === "0px")) continue;
    parts.push(`${prop}: ${val}`);
  }
  if (parts.length > 0) {
    const existing = target.getAttribute("style") || "";
    target.setAttribute("style", existing + (existing ? "; " : "") + parts.join("; "));
  }
  const srcChildren = source.children;
  const tgtChildren = target.children;
  const len = Math.min(srcChildren.length, tgtChildren.length);
  for (let i = 0; i < len; i++) {
    bakeStyles(srcChildren[i] as HTMLElement, tgtChildren[i] as HTMLElement);
  }
}

function cloneAndBake(): string | null {
  const examElement = document.querySelector('.exam-page') as HTMLElement | null;
  if (!examElement) return null;

  const clone = examElement.cloneNode(true) as HTMLElement;
  bakeStyles(examElement, clone);

  // Clean editor artifacts
  clone.querySelectorAll("[data-page-break], .page-break-widget").forEach((el) => {
    const br = document.createElement("div");
    br.style.pageBreakAfter = "always";
    br.style.breakAfter = "page";
    el.replaceWith(br);
  });
  clone.querySelectorAll(".blank-page-spacer").forEach((el) => {
    const br = document.createElement("div");
    br.style.pageBreakAfter = "always";
    el.replaceWith(br);
  });
  clone.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
  clone.querySelectorAll(".ProseMirror-gapcursor, .ProseMirror-separator, .ProseMirror-trailingBreak, .page-header-overlay, .page-footer-overlay, .page-gap-overlay").forEach((el) => el.remove());

  // Wrap with exam-wrapper if present (preserves CSS vars like columns)
  const wrapperEl = document.querySelector('.exam-wrapper') as HTMLElement | null;
  if (wrapperEl) {
    const wrapClone = document.createElement("div");
    // Copy CSS custom properties from wrapper
    const wrapComputed = window.getComputedStyle(wrapperEl);
    const wrapParts: string[] = [];
    for (const prop of BAKE_PROPS) {
      const val = wrapComputed.getPropertyValue(prop);
      if (val && val !== "initial" && val !== "inherit") wrapParts.push(`${prop}: ${val}`);
    }
    if (wrapParts.length) wrapClone.setAttribute("style", wrapParts.join("; "));
    wrapClone.appendChild(clone);
    return wrapClone.outerHTML;
  }

  return clone.outerHTML;
}

const PRINT_STYLES = `
  html, body {
    margin: 0; padding: 0;
    background: #fff !important;
    color: #000 !important;
  }
  .print-root {
    display: flex;
    justify-content: center;
    padding: 0;
  }
  .print-root .exam-page,
  .print-root .tiptap,
  .print-root .ProseMirror,
  .print-root [contenteditable] {
    transform: none !important;
    zoom: 1 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    min-height: auto !important;
    height: auto !important;
    background: #fff !important;
    color: #000 !important;
    overflow: visible !important;
  }
  .print-root .tiptap::after,
  .print-root .ProseMirror::after,
  .print-root [contenteditable]::after {
    display: none !important;
  }
  .page-header-overlay, .page-footer-overlay, .page-gap-overlay,
  .page-break-widget {
    display: none !important;
  }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #ccc; padding: 4px 8px; }
  @media print {
    .print-root { padding: 0; }
    @page { size: A4 portrait; margin: 10mm; }
  }
`;

export function exportPDF(): boolean {
  const contentHTML = cloneAndBake();
  if (!contentHTML) return false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>Exportar PDF</title>
    <style>${PRINT_STYLES}</style>
  </head><body>
    <main class="print-root">${contentHTML}</main>
    <script>setTimeout(function(){window.print()},600)<\/script>
  </body></html>`);
  printWindow.document.close();
  return true;
}

export function printDocument(): boolean {
  const contentHTML = cloneAndBake();
  if (!contentHTML) return false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>Imprimir</title>
    <style>${PRINT_STYLES}</style>
  </head><body>
    <main class="print-root">${contentHTML}</main>
  </body></html>`);
  printWindow.document.close();
  setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 600);
  return true;
}
