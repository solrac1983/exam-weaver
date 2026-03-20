/**
 * Lightweight spreadsheet utilities replacing the xlsx package.
 * Supports reading CSV/Excel-like files and generating CSV templates for download.
 */

/** Parse a CSV string into a 2D array */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === "," || ch === ";") {
        row.push(current);
        current = "";
      } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        row.push(current);
        current = "";
        rows.push(row);
        row = [];
        if (ch === "\r") i++;
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

/** Read a file (CSV or Excel) and return rows as a 2D string array */
export async function readSpreadsheetFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const text = await file.text();
    return parseCSV(text);
  }

  // For .xlsx/.xls files, use a dynamic import of xlsx
  // Since we removed xlsx, we parse as CSV if possible, or throw
  // Actually let's try reading as text first (many "Excel" exports are CSV)
  try {
    const text = await file.text();
    // Check if it looks like CSV (has commas/semicolons and no binary chars in first 100 chars)
    const sample = text.substring(0, 200);
    if (!sample.includes("\0") && (sample.includes(",") || sample.includes(";"))) {
      return parseCSV(text);
    }
  } catch {
    // ignore
  }

  throw new Error(
    "Formato não suportado. Por favor, salve o arquivo como CSV (.csv) antes de importar."
  );
}

/** Escape a value for CSV output */
function escapeCSV(val: string | number): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Generate and download a CSV file from a 2D array of data */
export function downloadCSVTemplate(data: (string | number)[][], filename: string) {
  const csv = data.map((row) => row.map(escapeCSV).join(",")).join("\r\n");
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
