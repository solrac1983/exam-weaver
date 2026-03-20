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
  "column-count", "column-gap", "column-rule",
] as const;

/** Classes that are containers whose width should NOT be baked (let CSS handle them) */
const SKIP_WIDTH_CLASSES = ["exam-page", "tiptap", "ProseMirror", "exam-wrapper", "editor-page-shell"];

function shouldSkipWidth(el: HTMLElement): boolean {
  return SKIP_WIDTH_CLASSES.some(cls => el.classList.contains(cls));
}

function bakeStyles(source: HTMLElement, target: HTMLElement) {
  if (source.nodeType !== Node.ELEMENT_NODE) return;
  const computed = window.getComputedStyle(source);
  const parts: string[] = [];
  for (const prop of BAKE_PROPS) {
    const val = computed.getPropertyValue(prop);
    if (!val || val === "initial" || val === "inherit") continue;
    if (prop === "background-color" && (val === "rgba(0, 0, 0, 0)" || val === "transparent")) continue;
    if (prop === "width" && (val === "auto" || val === "0px")) continue;
    if (prop === "width" && shouldSkipWidth(source)) continue;
    if (prop === "column-count" && (val === "auto" || val === "1")) continue;
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

function cleanClone(clone: HTMLElement) {
  // Convert page breaks (both widget and hard-page-break extension)
  clone.querySelectorAll("[data-page-break], .page-break-widget, .hard-page-break").forEach((el) => {
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
  clone.querySelectorAll(
    ".ProseMirror-gapcursor, .ProseMirror-separator, .ProseMirror-trailingBreak, " +
    ".page-header-overlay, .page-footer-overlay, .page-gap-overlay, " +
    ".floating-toolbar, .editor-page-shell-ruler, .tiptap-collaboration-cursor-widget"
  ).forEach((el) => el.remove());
  // Remove draggable handles or selection decorations
  clone.querySelectorAll("[data-drag-handle], .ProseMirror-selectednode").forEach((el) => {
    el.removeAttribute("data-drag-handle");
    el.classList.remove("ProseMirror-selectednode");
  });
}

function cloneAndBake(): { html: string; dataColumns: string; dataTemplate: string } | null {
  const examElement = document.querySelector('.exam-page') as HTMLElement | null;
  if (!examElement) return null;

  const clone = examElement.cloneNode(true) as HTMLElement;
  bakeStyles(examElement, clone);
  cleanClone(clone);

  // Read data attributes from wrapper
  const wrapperEl = document.querySelector('.exam-wrapper') as HTMLElement | null;
  const dataColumns = wrapperEl?.getAttribute("data-columns") || "1";
  const dataTemplate = wrapperEl?.getAttribute("data-template") || "";

  // Build wrapper div preserving data attributes
  const wrapClone = document.createElement("div");
  wrapClone.className = "exam-wrapper";
  wrapClone.setAttribute("data-columns", dataColumns);
  if (dataTemplate) wrapClone.setAttribute("data-template", dataTemplate);

  // Preserve CSS custom properties from wrapper inline style (font family/size)
  if (wrapperEl) {
    const inlineStyle = wrapperEl.getAttribute("style") || "";
    if (inlineStyle) wrapClone.setAttribute("style", inlineStyle);
  }

  // Wrap clone in exam-page container to match CSS selectors
  const pageWrap = document.createElement("div");
  pageWrap.className = "exam-page";
  // Transfer the tiptap class to content for CSS selector matching
  clone.classList.add("tiptap");
  pageWrap.appendChild(clone);
  wrapClone.appendChild(pageWrap);

  return { html: wrapClone.outerHTML, dataColumns, dataTemplate };
}

/** CSS rules extracted from index.css for template support in exports */
const TEMPLATE_CSS = `
  /* Multi-column support */
  .exam-wrapper[data-columns="2"] .exam-page .tiptap {
    column-count: 2;
    column-gap: 24px;
  }
  .exam-wrapper[data-columns="3"] .exam-page .tiptap {
    column-count: 3;
    column-gap: 24px;
  }

  /* CSS custom property support for font family/size */
  .exam-wrapper {
    --exam-font-family: inherit;
    --exam-font-size: inherit;
  }
  .exam-wrapper .tiptap {
    font-family: var(--exam-font-family, inherit);
    font-size: var(--exam-font-size, inherit);
  }

  /* Template "Personalizado" */
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap {
    text-align: justify;
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #1a1a1a;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4 {
    background: #d1d1d1;
    padding: 3px 8px;
    margin: 14px 0 6px 0;
    font-size: 10pt;
    font-weight: 700;
    border: none;
    break-inside: avoid;
    break-after: avoid;
    text-align: left;
    text-indent: 0;
    line-height: 1.5;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2:first-child,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3:first-child,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4:first-child {
    margin-top: 0;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h1 {
    font-size: 11pt;
    font-weight: 700;
    text-align: left;
    text-transform: uppercase;
    margin: 8px 0 4px 0;
    padding: 0;
    border: none;
    background: none;
    text-indent: 0;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p {
    text-indent: 0;
    text-align: justify;
    line-height: 1.45;
    margin: 0 0 4px 0;
    break-inside: avoid;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2 + p,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3 + p,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4 + p {
    text-indent: 0.5cm;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap blockquote {
    font-style: italic;
    margin: 6px 0 6px 1em;
    padding-left: 0.5em;
    border-left: 2px solid #b3b3b3;
    text-indent: 0;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ol,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ul {
    padding-left: 0;
    margin: 4px 0 4px 0;
    text-indent: 0;
    list-style: none;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ol li,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ul li {
    text-indent: 0;
    padding-left: 0;
    margin-bottom: 1px;
    line-height: 1.45;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap img {
    display: block;
    margin: 8px auto;
    max-width: 100%;
    height: auto;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table {
    font-size: 9pt;
    margin: 6px 0;
    border-collapse: collapse;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table td,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table th {
    border: 1px solid #b3b3b3;
    padding: 2px 6px;
  }
  /* References / Sources */
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p > small,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap small {
    font-size: 8pt;
    font-style: italic;
    display: block;
    text-align: right;
    line-height: 1.35;
    margin-top: 2px;
    color: #4d4d4d;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p:has(> em:only-child) {
    font-size: 8pt;
    font-style: italic;
    text-align: right;
    line-height: 1.35;
    margin-top: 2px;
    text-indent: 0;
    color: #4d4d4d;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap figcaption {
    font-size: 8pt;
    font-style: italic;
    text-align: right;
    line-height: 1.35;
    color: #4d4d4d;
  }
`;

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
  .print-root .exam-wrapper {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
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
  .print-root .editor-page-shell {
    padding: 0 !important;
    margin: 0 !important;
  }
  .print-root .tiptap::after,
  .print-root .ProseMirror::after,
  .print-root [contenteditable]::after {
    display: none !important;
  }
  .page-header-overlay, .page-footer-overlay, .page-gap-overlay,
  .page-break-widget, .floating-toolbar {
    display: none !important;
  }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; }
  td, th { padding: 4px 8px; }
  /* Preserve multi-column layouts */
  [style*="column-count"] { column-fill: auto; }
  ${TEMPLATE_CSS}
  @media print {
    .print-root { padding: 0; }
    @page { size: A4 portrait; margin: 10mm; }
  }
`;

export function exportPDF(): boolean {
  const result = cloneAndBake();
  if (!result) return false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>Exportar PDF</title>
    <style>${PRINT_STYLES}</style>
  </head><body>
    <main class="print-root">${result.html}</main>
    <script>setTimeout(function(){window.print()},600)<\/script>
  </body></html>`);
  printWindow.document.close();
  return true;
}

export function printDocument(): boolean {
  const result = cloneAndBake();
  if (!result) return false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>Imprimir</title>
    <style>${PRINT_STYLES}</style>
  </head><body>
    <main class="print-root">${result.html}</main>
  </body></html>`);
  printWindow.document.close();
  setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 600);
  return true;
}
