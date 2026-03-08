/**
 * Exports HTML content as a .docx file using the Word-compatible HTML format.
 * This approach wraps HTML in MS Word XML headers so Word opens it natively.
 */
export function exportToDocx(htmlContent: string, filename: string = "documento") {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9À-ú\s\-_]/g, "");

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
        body {
          font-family: 'Arial', sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          margin: 2.5cm;
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
        @page {
          size: A4;
          margin: 2.5cm;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
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
