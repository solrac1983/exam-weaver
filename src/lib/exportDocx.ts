/**
 * Exports HTML content as a .docx file using the Word-compatible HTML format.
 * This approach wraps HTML in MS Word XML headers so Word opens it natively.
 *
 * Strategy: Instead of using the raw TipTap HTML string (which may lack visual
 * context), we read the *rendered* DOM from the editor so every computed style
 * (bold, colors, font-size set via textStyle, alignment, etc.) is captured as
 * inline styles that Word understands.
 */
export function exportToDocx(
  _htmlContent: string,
  filename: string = "documento",
  formatConfig?: { fontFamily?: string; fontSize?: number; columns?: number }
) {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9À-ú\s\-_]/g, "");

  // ── 1. Build font / column overrides ────────────────────────────────
  const fontFamily = formatConfig?.fontFamily || "Arial";
  const fontFallback = fontFamily === "Times New Roman" ? "serif" : "sans-serif";
  const fontSize = formatConfig?.fontSize || 12;
  const columns = formatConfig?.columns && formatConfig.columns > 1 ? formatConfig.columns : 0;

  // ── 2. Get rendered content from the live editor DOM ─────────────────
  let renderedHtml = "";
  const editorEl =
    document.querySelector(".ProseMirror") ||
    document.querySelector(".tiptap") ||
    document.querySelector(".exam-page");

  if (editorEl) {
    // Deep-clone so we don't mutate the live DOM
    const clone = editorEl.cloneNode(true) as HTMLElement;

    // Bake key computed styles into inline styles for every element
    bakeStyles(editorEl as HTMLElement, clone);

    // Remove editor-only artifacts
    clone.querySelectorAll("[data-page-break]").forEach((el) => {
      const br = document.createElement("br");
      br.style.pageBreakAfter = "always";
      el.replaceWith(br);
    });
    clone.querySelectorAll(".blank-page-spacer").forEach((el) => {
      const br = document.createElement("br");
      br.style.pageBreakAfter = "always";
      el.replaceWith(br);
    });
    clone.querySelectorAll("[contenteditable]").forEach((el) =>
      el.removeAttribute("contenteditable")
    );
    clone.querySelectorAll(".ProseMirror-gapcursor, .ProseMirror-separator, .ProseMirror-trailingBreak").forEach((el) => el.remove());

    renderedHtml = clone.innerHTML;
  } else {
    // Fallback: use the raw HTML string
    renderedHtml = _htmlContent
      .replace(/<!-- FORMATTING_CONFIG:.*? -->/, "")
      .replace(/\s*contenteditable="[^"]*"/gi, "");
  }

  // ── 3. Assemble Word-compatible HTML ─────────────────────────────────
  const columnCss = columns
    ? `column-count: ${columns}; column-gap: 24px; -moz-column-count: ${columns}; -webkit-column-count: ${columns};`
    : "";

  const wordHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${sanitizedFilename}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { size: A4; margin: 2cm 1.5cm; }
    body {
      font-family: '${fontFamily}', ${fontFallback};
      font-size: ${fontSize}pt;
      line-height: 1.5;
      color: #000;
      margin: 0; padding: 0;
      ${columnCss}
    }
    /* Strip editor chrome */
    .page, .exam-page, .tiptap, .ProseMirror, .page-content {
      height: auto !important; width: 100% !important;
      min-height: auto !important; max-width: 100% !important;
      margin: 0 !important; padding: 0 !important;
      box-shadow: none !important; border: none !important;
      background: none !important;
    }
    p { margin: 0 0 4pt 0; }
    ul, ol { margin: 0 0 6pt 0; padding-left: 24pt; }
    li { margin-bottom: 2pt; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; }
    td, th { border: 1px solid #000; padding: 4px 8px; vertical-align: top; }
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
    /* Text alignment classes from TipTap */
    [style*="text-align: center"], .text-center { text-align: center; }
    [style*="text-align: right"], .text-right { text-align: right; }
    [style*="text-align: justify"], .text-justify { text-align: justify; }
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>`;

  // ── 4. Download ──────────────────────────────────────────────────────
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

/* ────────────────────────────────────────────────────────────────────────────
 * bakeStyles – walks two parallel DOM trees (source = live, target = clone)
 * and copies the computed styles that matter for Word onto the clone as
 * inline styles, so the exported HTML is self-contained.
 * ──────────────────────────────────────────────────────────────────────── */
const BAKE_PROPS = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-align",
  "color",
  "background-color",
  "margin",
  "padding",
  "border",
  "line-height",
  "vertical-align",
  "width",
  "column-count",
  "column-gap",
  "column-rule",
] as const;

function bakeStyles(source: HTMLElement, target: HTMLElement) {
  if (source.nodeType !== Node.ELEMENT_NODE) return;

  const computed = window.getComputedStyle(source);
  const parts: string[] = [];

  for (const prop of BAKE_PROPS) {
    const val = computed.getPropertyValue(prop);
    if (!val || val === "initial" || val === "inherit") continue;
    // Skip transparent/white backgrounds (noise)
    if (prop === "background-color" && (val === "rgba(0, 0, 0, 0)" || val === "transparent" || val === "rgb(255, 255, 255)")) continue;
    // Skip default black text
    if (prop === "color" && val === "rgb(0, 0, 0)") continue;
    // Skip auto/0 widths on inline elements
    if (prop === "width" && (val === "auto" || val === "0px")) continue;
    parts.push(`${prop}: ${val}`);
  }

  if (parts.length > 0) {
    // Merge with any existing inline style on the clone
    const existing = target.getAttribute("style") || "";
    target.setAttribute("style", existing + (existing ? "; " : "") + parts.join("; "));
  }

  // Recurse children (only element nodes)
  const srcChildren = source.children;
  const tgtChildren = target.children;
  const len = Math.min(srcChildren.length, tgtChildren.length);
  for (let i = 0; i < len; i++) {
    bakeStyles(srcChildren[i] as HTMLElement, tgtChildren[i] as HTMLElement);
  }
}
