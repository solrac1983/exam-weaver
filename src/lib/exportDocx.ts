/**
 * Exports HTML content as a .docx file using the Word-compatible HTML format.
 * This approach wraps HTML in MS Word XML headers so Word opens it natively.
 */
export function exportToDocx(
  htmlContent: string,
  filename: string = "documento",
  formatConfig?: { fontFamily?: string; fontSize?: number; columns?: number }
) {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9À-ú\s\-_]/g, "");

  // Extract formatting config: prefer explicit param, fallback to HTML comment
  let fontStyles = "";
  let columnStyles = "";

  if (formatConfig) {
    if (formatConfig.fontFamily) fontStyles += `font-family: '${formatConfig.fontFamily}', ${formatConfig.fontFamily === 'Times New Roman' ? 'serif' : 'sans-serif'} !important; `;
    if (formatConfig.fontSize) fontStyles += `font-size: ${formatConfig.fontSize}pt !important; `;
    if (formatConfig.columns && formatConfig.columns > 1) {
      columnStyles = `column-count: ${formatConfig.columns}; column-gap: 24px;`;
    }
  } else {
    const match = htmlContent.match(/<!-- FORMATTING_CONFIG:(.*?) -->/);
    if (match) {
      try {
        const config = JSON.parse(match[1]);
        if (config.fontFamily) fontStyles += `font-family: '${config.fontFamily}', sans-serif !important; `;
        if (config.fontSize) fontStyles += `font-size: ${config.fontSize}pt !important; `;
        if (config.columns && config.columns > 1) {
          columnStyles = `column-count: ${config.columns}; column-gap: 24px;`;
        }
      } catch (e) {
        console.error("Error parsing formatting config:", e);
      }
    }
  }

  // Clean the HTML — remove the config comment and inline editor styles
  let cleanHtml = htmlContent.replace(/<!-- FORMATTING_CONFIG:.*? -->/, "");
  // Strip inline styles from editor wrapper elements that constrain layout
  cleanHtml = cleanHtml.replace(/(<div[^>]*class="[^"]*(?:tiptap|ProseMirror)[^"]*"[^>]*)style="[^"]*"/gi, '$1');
  // Also strip style from contenteditable elements
  cleanHtml = cleanHtml.replace(/\s*contenteditable="[^"]*"/gi, '');

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
        @page {
          size: A4;
          margin: 2.5cm;
        }
        body {
          font-family: 'Arial', sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          margin: 2.5cm;
          ${fontStyles}
        }
        /* Remove fixed constraints from editor page wrappers */
        .page, .exam-page, .tiptap, .ProseMirror {
          height: auto !important;
          width: 100% !important;
          min-height: auto !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
        }
        .page-content {
          height: auto !important;
          width: 100% !important;
          min-height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          ${fontStyles}
          ${columnStyles}
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        td, th {
          border: 1px solid #000;
          padding: 6px 8px;
          font-size: 11pt;
        }
        h1 { font-size: 18pt; margin-bottom: 6pt; }
        h2 { font-size: 14pt; margin-bottom: 4pt; }
        h3 { font-size: 12pt; margin-bottom: 4pt; }
        img { max-width: 100%; }
      </style>
    </head>
    <body>
      ${cleanHtml}
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", wordHtml], {
    type: "application/msword",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizedFilename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
