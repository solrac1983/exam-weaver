/**
 * Shared utility for PDF export and Print from the exam editor.
 * Clones the live DOM, bakes computed styles inline, and opens
 * a print-ready window with all formatting preserved.
 */

const BAKE_PROPS = [
  "font-family", "font-size", "font-weight", "font-style",
  "text-decoration", "text-align", "color", "background-color",
  "margin", "padding", "border", "line-height", "vertical-align",
  "width", "height", "letter-spacing", "text-indent", "text-transform",
  "column-count", "column-gap", "column-rule",
  "float", "display",
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
  const tagName = source.tagName.toLowerCase();
  const isImage = tagName === "img";

  for (const prop of BAKE_PROPS) {
    const val = computed.getPropertyValue(prop);
    if (!val || val === "initial" || val === "inherit") continue;
    if (prop === "background-color" && (val === "rgba(0, 0, 0, 0)" || val === "transparent" || val === "rgb(255, 255, 255)")) continue;
    if (prop === "color" && val === "rgb(0, 0, 0)") continue;
    if (prop === "width" && (val === "auto" || val === "0px")) continue;
    if (prop === "width" && !isImage && shouldSkipWidth(source)) continue;
    if (prop === "height" && !isImage) continue; // Only bake height for images
    if (prop === "height" && (val === "auto" || val === "0px")) continue;
    if (prop === "column-count" && (val === "auto" || val === "1")) continue;
    if (prop === "float" && val === "none") continue;
    if (prop === "display" && (val === "block" || val === "inline")) continue;
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

function cleanClone(clone: HTMLElement, dataTemplate?: string) {
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
  clone.querySelectorAll("[data-drag-handle], .ProseMirror-selectednode").forEach((el) => {
    el.removeAttribute("data-drag-handle");
    el.classList.remove("ProseMirror-selectednode");
  });

  // Preserve image dimensions from the editor
  clone.querySelectorAll("img").forEach((img) => {
    const el = img as HTMLImageElement;
    // Ensure max-width doesn't break layout
    if (!el.style.maxWidth) el.style.maxWidth = "100%";
    if (!el.style.height || el.style.height === "0px") el.style.height = "auto";
  });

  // Ensure table borders are visible
  clone.querySelectorAll("table").forEach((table) => {
    (table as HTMLElement).setAttribute("border", "1");
    (table as HTMLElement).setAttribute("cellpadding", "4");
    (table as HTMLElement).setAttribute("cellspacing", "0");
    (table as HTMLElement).style.borderCollapse = "collapse";
  });
  clone.querySelectorAll("td, th").forEach((cell) => {
    const el = cell as HTMLElement;
    if (!el.style.border && !el.style.borderTop) {
      el.style.border = "1px solid #999";
    }
  });

  // Strip baked column-count/column-gap from tiptap container so CSS rules control columns
  clone.querySelectorAll(".tiptap, .ProseMirror").forEach((el) => {
    const style = (el as HTMLElement).style;
    style.removeProperty("column-count");
    style.removeProperty("column-gap");
    style.removeProperty("column-rule");
  });

  // When a template is active, strip baked properties that conflict with template CSS
  // but KEEP border properties on table elements so they export correctly
  if (dataTemplate) {
    const TEMPLATE_PROPS = [
      "font-family", "font-size", "text-align", "line-height", "color",
      "margin", "padding", "text-indent", "text-transform", "background-color",
      "background",
    ];
    const TEMPLATE_PROPS_WITH_BORDER = [
      ...TEMPLATE_PROPS, "border",
    ];
    // For non-table elements, also strip border
    clone.querySelectorAll("h1, h2, h3, h4, p, blockquote, ol, ul, li, small, figcaption, img").forEach((el) => {
      const style = (el as HTMLElement).style;
      for (const prop of TEMPLATE_PROPS_WITH_BORDER) {
        style.removeProperty(prop);
      }
    });
    // For table elements, keep borders intact
    clone.querySelectorAll("table, td, th").forEach((el) => {
      const style = (el as HTMLElement).style;
      for (const prop of TEMPLATE_PROPS) {
        style.removeProperty(prop);
      }
    });
  }
}

function cloneAndBake(): { html: string; dataColumns: string; dataTemplate: string } | null {
  const examElement = document.querySelector('.exam-page') as HTMLElement | null;
  if (!examElement) {
    const editorEl = document.querySelector(".ProseMirror") || document.querySelector(".tiptap");
    if (!editorEl) return null;
    const clone = editorEl.cloneNode(true) as HTMLElement;
    bakeStyles(editorEl as HTMLElement, clone);
    cleanClone(clone);
    return { html: clone.innerHTML, dataColumns: "1", dataTemplate: "" };
  }

  const clone = examElement.cloneNode(true) as HTMLElement;
  bakeStyles(examElement, clone);

  // Read data attributes from wrapper
  const wrapperEl = document.querySelector('.exam-wrapper') as HTMLElement | null;
  const dataColumns = wrapperEl?.getAttribute("data-columns") || "1";
  const dataTemplate = wrapperEl?.getAttribute("data-template") || "";

  cleanClone(clone, dataTemplate);

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

/** CSS rules extracted from index.css for template support in exports.
 *  All rules use !important to override baked inline styles from cloneAndBake. */
const TEMPLATE_CSS = `
  /* Multi-column support */
  .exam-wrapper[data-columns="2"] .exam-page .tiptap {
    column-count: 2 !important;
    column-gap: 24px !important;
  }
  .exam-wrapper[data-columns="3"] .exam-page .tiptap {
    column-count: 3 !important;
    column-gap: 24px !important;
  }

  /* CSS custom property support for font family/size */
  .exam-wrapper {
    --exam-font-family: inherit;
    --exam-font-size: inherit;
  }
  .exam-wrapper .tiptap {
    font-family: var(--exam-font-family, inherit) !important;
    font-size: var(--exam-font-size, inherit) !important;
  }

  /* Template "Personalizado" */
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap {
    text-align: justify !important;
    font-family: 'Arial', 'Helvetica', sans-serif !important;
    font-size: 10pt !important;
    line-height: 1.45 !important;
    color: #1a1a1a !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4 {
    background: #d1d1d1 !important;
    padding: 3px 8px !important;
    margin: 14px 0 6px 0 !important;
    font-size: 10pt !important;
    font-weight: 700 !important;
    border: none !important;
    break-inside: avoid;
    break-after: avoid;
    text-align: left !important;
    text-indent: 0 !important;
    line-height: 1.5 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2:first-child,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3:first-child,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4:first-child {
    margin-top: 0 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h1 {
    font-size: 11pt !important;
    font-weight: 700 !important;
    text-align: left !important;
    text-transform: uppercase !important;
    margin: 8px 0 4px 0 !important;
    padding: 0 !important;
    border: none !important;
    background: none !important;
    text-indent: 0 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p {
    text-indent: 0 !important;
    text-align: justify !important;
    line-height: 1.45 !important;
    margin: 0 0 4px 0 !important;
    break-inside: avoid;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2 + p,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3 + p,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4 + p {
    text-indent: 0.5cm !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap blockquote {
    font-style: italic !important;
    margin: 6px 0 6px 1em !important;
    padding-left: 0.5em !important;
    border-left: 2px solid #b3b3b3 !important;
    text-indent: 0 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ol,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ul {
    padding-left: 0 !important;
    margin: 4px 0 4px 0 !important;
    text-indent: 0 !important;
    list-style: none !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ol li,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ul li {
    text-indent: 0 !important;
    padding-left: 0 !important;
    margin-bottom: 1px !important;
    line-height: 1.45 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap img {
    display: block !important;
    margin: 8px auto !important;
    max-width: 100% !important;
    height: auto !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table {
    font-size: 9pt !important;
    margin: 6px 0 !important;
    border-collapse: collapse !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table td,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table th {
    border: 1px solid #b3b3b3 !important;
    padding: 2px 6px !important;
  }
  /* References / Sources */
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p > small,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap small {
    font-size: 8pt !important;
    font-style: italic !important;
    display: block !important;
    text-align: right !important;
    line-height: 1.35 !important;
    margin-top: 2px !important;
    color: #4d4d4d !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p:has(> em:only-child) {
    font-size: 8pt !important;
    font-style: italic !important;
    text-align: right !important;
    line-height: 1.35 !important;
    margin-top: 2px !important;
    text-indent: 0 !important;
    color: #4d4d4d !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap figcaption {
    font-size: 8pt !important;
    font-style: italic !important;
    text-align: right !important;
    line-height: 1.35 !important;
    color: #4d4d4d !important;
  }
`;

const PRINT_STYLES = `
  html, body {
    margin: 0; padding: 0;
    background: #fff !important;
    color: #000 !important;
    font-family: 'Arial', 'Helvetica', sans-serif;
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
  /* Preserve image dimensions */
  img { max-width: 100%; height: auto; }
  /* Table borders */
  table { border-collapse: collapse; width: auto; }
  td, th { 
    padding: 4px 8px; 
    border: 1px solid #999;
    vertical-align: top;
  }
  /* Typography */
  p { margin: 0 0 4px 0; }
  h1 { font-size: 18pt; font-weight: bold; margin: 0 0 6pt 0; }
  h2 { font-size: 15pt; font-weight: bold; margin: 0 0 5pt 0; }
  h3 { font-size: 13pt; font-weight: bold; margin: 0 0 4pt 0; }
  strong, b { font-weight: bold; }
  em, i { font-style: italic; }
  u { text-decoration: underline; }
  hr { border: none; border-top: 1px solid #999; margin: 8pt 0; }
  sub { vertical-align: sub; font-size: 0.8em; }
  sup { vertical-align: super; font-size: 0.8em; }
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
