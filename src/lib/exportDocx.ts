import HTMLtoDOCX from "html-to-docx";

export async function exportToDocx(htmlContent: string, filename: string = "documento") {
  try {
    // Wrap content in a proper HTML structure for better conversion
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; font-size: 12pt;">
          ${htmlContent}
        </body>
      </html>
    `;

    const blob = await HTMLtoDOCX(fullHtml, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
      margins: {
        top: 720,    // ~1.27cm
        right: 720,
        bottom: 720,
        left: 720,
      },
    });

    // Download the file
    const url = URL.createObjectURL(blob as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename.replace(/[^a-zA-Z0-9À-ú\s\-_]/g, "")}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error exporting to DOCX:", err);
    throw err;
  }
}
