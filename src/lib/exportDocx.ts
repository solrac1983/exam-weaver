/**
 * Exports HTML content as a .docx file using the Word-compatible HTML format.
 * This approach wraps HTML in MS Word XML headers so Word opens it natively.
 *
 * Strategy: Instead of using the raw TipTap HTML string (which may lack visual
 * context), we read the *rendered* DOM from the editor so every computed style
 * (bold, colors, font-size set via textStyle, alignment, etc.) is captured as
 * inline styles that Word understands.
 */

// ── Bake styles ────────────────────────────────────────────────────────
const BAKE_PROPS = [
  "font-family", "font-size", "font-weight", "font-style",
  "text-decoration", "text-align", "color", "background-color",
  "margin", "padding", "border", "line-height", "vertical-align",
  "width", "letter-spacing", "text-indent", "text-transform",
  "column-count", "column-gap", "column-rule",
] as const;

/** Classes whose width should NOT be baked inline */
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
    if (prop === "background-color" && (val === "rgba(0, 0, 0, 0)" || val === "transparent" || val === "rgb(255, 255, 255)")) continue;
    if (prop === "color" && val === "rgb(0, 0, 0)") continue;
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

// ── Clone and bake from live DOM ──────────────────────────────────────
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

  const wrapperEl = document.querySelector('.exam-wrapper') as HTMLElement | null;
  const dataColumns = wrapperEl?.getAttribute("data-columns") || "1";
  const dataTemplate = wrapperEl?.getAttribute("data-template") || "";

  cleanClone(clone, dataTemplate);

  const wrapClone = document.createElement("div");
  wrapClone.className = "exam-wrapper";
  wrapClone.setAttribute("data-columns", dataColumns);
  if (dataTemplate) wrapClone.setAttribute("data-template", dataTemplate);
  if (wrapperEl) {
    const inlineStyle = wrapperEl.getAttribute("style") || "";
    if (inlineStyle) wrapClone.setAttribute("style", inlineStyle);
  }

  const pageWrap = document.createElement("div");
  pageWrap.className = "exam-page";
  clone.classList.add("tiptap");
  pageWrap.appendChild(clone);
  wrapClone.appendChild(pageWrap);

  return { html: wrapClone.outerHTML, dataColumns, dataTemplate };
}

function cleanClone(clone: HTMLElement, dataTemplate?: string) {
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

  // Ensure table borders are set via HTML attributes for Word compatibility
  clone.querySelectorAll("table").forEach((table) => {
    (table as HTMLElement).setAttribute("border", "1");
    (table as HTMLElement).setAttribute("cellpadding", "4");
    (table as HTMLElement).setAttribute("cellspacing", "0");
    (table as HTMLElement).style.borderCollapse = "collapse";
  });
  clone.querySelectorAll("td, th").forEach((cell) => {
    const el = cell as HTMLElement;
    // Only add border if not already explicitly set
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

/** CSS for template support — !important to override baked inline styles */
const TEMPLATE_CSS = `
  .exam-wrapper[data-columns="2"] .exam-page .tiptap {
    column-count: 2 !important; column-gap: 24px !important;
  }
  .exam-wrapper[data-columns="3"] .exam-page .tiptap {
    column-count: 3 !important; column-gap: 24px !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap {
    text-align: justify !important; font-family: 'Arial', 'Helvetica', sans-serif !important;
    font-size: 10pt !important; line-height: 1.45 !important; color: #1a1a1a !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4 {
    background: #d1d1d1 !important; padding: 3px 8px !important; margin: 14px 0 6px 0 !important;
    font-size: 10pt !important; font-weight: 700 !important; border: none !important;
    text-align: left !important; line-height: 1.5 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h1 {
    font-size: 11pt !important; font-weight: 700 !important; text-align: left !important;
    text-transform: uppercase !important; margin: 8px 0 4px 0 !important;
    padding: 0 !important; border: none !important; background: none !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p {
    text-indent: 0 !important; text-align: justify !important;
    line-height: 1.45 !important; margin: 0 0 4px 0 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2 + p,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3 + p,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4 + p {
    text-indent: 0.5cm !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap blockquote {
    font-style: italic !important; margin: 6px 0 6px 1em !important;
    padding-left: 0.5em !important; border-left: 2px solid #b3b3b3 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ol,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ul {
    padding-left: 0 !important; margin: 4px 0 !important; list-style: none !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ol li,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ul li {
    padding-left: 0 !important; margin-bottom: 1px !important; line-height: 1.45 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table {
    font-size: 9pt !important; margin: 6px 0 !important; border-collapse: collapse !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table td,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table th {
    border: 1px solid #b3b3b3 !important; padding: 2px 6px !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap small {
    font-size: 8pt !important; font-style: italic !important; display: block !important;
    text-align: right !important; color: #4d4d4d !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap img {
    display: block !important; margin: 8px auto !important; max-width: 100% !important;
    height: auto !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p:has(> em:only-child) {
    font-size: 8pt !important; font-style: italic !important; text-align: right !important;
    line-height: 1.35 !important; margin-top: 2px !important; text-indent: 0 !important;
    color: #4d4d4d !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap figcaption {
    font-size: 8pt !important; font-style: italic !important; text-align: right !important;
    line-height: 1.35 !important; color: #4d4d4d !important;
  }
`;

// ── Word section XML for columns ──────────────────────────────────────
function buildWordSectionXml(columns: number): string {
  if (columns <= 1) return "";
  return `
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <xml>
    <w:Section>
      <w:SectPr>
        <w:cols w:num="${columns}" w:space="720" w:equalWidth="true"/>
      </w:SectPr>
    </w:Section>
  </xml>
  <![endif]-->`;
}

// ── Main export function ───────────────────────────────────────────────
export function exportToDocx(
  _htmlContent: string,
  filename: string = "documento",
  _formatConfig?: { fontFamily?: string; fontSize?: number; columns?: number; template?: string }
) {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9À-ú\s\-_]/g, "");

  const result = cloneAndBake();
  const renderedHtml = result?.html || _htmlContent
    .replace(/<!-- FORMATTING_CONFIG:.*? -->/, "")
    .replace(/\s*contenteditable="[^"]*"/gi, "");

  const columnCount = parseInt(result?.dataColumns || String(_formatConfig?.columns || 1), 10);
  const wordSectionXml = buildWordSectionXml(columnCount);

  const msoColumnsCss = columnCount > 1 ? `
    .exam-page .tiptap, .ProseMirror, .page-content, body > div:not(.exam-wrapper) {
      mso-columns: ${columnCount}; 
      column-count: ${columnCount} !important;
      column-gap: 24px !important;
    }
    /* Word-specific column support */
    <!--[if gte mso 9]>
    body { mso-columns: ${columnCount}; }
    <![endif]-->
  ` : "";

  // Determine font from config or template
  const fontFamily = _formatConfig?.fontFamily || "Arial";
  const fontSize = _formatConfig?.fontSize || 12;

  const wordHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${sanitizedFilename}</title>
  ${wordSectionXml}
  <style>
    @page { 
      size: A4; 
      margin: 2cm 1.5cm;
      mso-columns: ${columnCount};
    }
    body {
      font-family: '${fontFamily}', sans-serif;
      font-size: ${fontSize}pt;
      line-height: 1.5;
      color: #000;
      margin: 0; padding: 0;
    }
    /* Strip editor chrome */
    .page, .exam-page, .tiptap, .ProseMirror, .page-content, .editor-page-shell {
      height: auto !important; width: 100% !important;
      min-height: auto !important; max-width: 100% !important;
      margin: 0 !important; padding: 0 !important;
      box-shadow: none !important; border: none !important;
      background: none !important;
    }
    .exam-wrapper {
      width: 100% !important; margin: 0 !important; padding: 0 !important;
    }
    p { margin: 0 0 4pt 0; }
    ul, ol { margin: 0 0 6pt 0; padding-left: 24pt; }
    li { margin-bottom: 2pt; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; }
    td, th { 
      padding: 4px 8px; vertical-align: top; 
      border: 1px solid #999 !important;
      mso-border-alt: solid #999 .5pt;
    }
    h1 { font-size: 18pt; font-weight: bold; margin: 0 0 6pt 0; }
    h2 { font-size: 15pt; font-weight: bold; margin: 0 0 5pt 0; }
    h3 { font-size: 13pt; font-weight: bold; margin: 0 0 4pt 0; }
    img { max-width: 100%; height: auto; }
    strong, b { font-weight: bold; }
    em, i { font-style: italic; }
    u { text-decoration: underline; }
    s { text-decoration: line-through; }
    sub { vertical-align: sub; font-size: 0.8em; }
    sup { vertical-align: super; font-size: 0.8em; }
    hr { border: none; border-top: 1px solid #999; margin: 8pt 0; }
    [style*="text-align: center"], .text-center { text-align: center; }
    [style*="text-align: right"], .text-right { text-align: right; }
    [style*="text-align: justify"], .text-justify { text-align: justify; }
    [style*="column-count"] { column-fill: auto; }
    /* Ensure all table borders are visible in Word */
    table, table td, table th {
      mso-border-alt: solid #999 .5pt;
      border: 1px solid #999 !important;
    }
    ${msoColumnsCss}
    ${TEMPLATE_CSS}
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>`;

  const blob = new Blob(["\ufeff", wordHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizedFilename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
