import { marked } from "marked";
import JSZip from "jszip";

/**
 * Convert a Markdown file to HTML suitable for the Tiptap editor.
 */
export async function importMarkdownFile(file: File): Promise<string> {
  const text = await file.text();
  marked.setOptions({ gfm: true, breaks: false });
  const html = await marked.parse(text);
  return wrapInProseMirrorParagraphs(html);
}

/**
 * Convert an ODT (OpenDocument Text) file to simplified HTML.
 * Extracts content.xml, walks paragraphs/headings/lists/tables and produces
 * Tiptap-compatible HTML. Does not preserve advanced styling (colors, tables widths).
 */
export async function importOdtFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const contentFile = zip.file("content.xml");
  if (!contentFile) throw new Error("Arquivo ODT inválido (sem content.xml).");
  const xmlText = await contentFile.async("string");
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const officeBody = doc.getElementsByTagName("office:text")[0];
  if (!officeBody) return "<p></p>";

  const html = walkOdt(officeBody);
  return html || "<p></p>";
}

function walkOdt(node: Element): string {
  let out = "";
  for (const child of Array.from(node.children)) {
    const local = child.localName;
    switch (local) {
      case "h": {
        const level = clampInt(child.getAttribute("text:outline-level") || "1", 1, 6);
        out += `<h${level}>${escapeHtml(child.textContent || "")}</h${level}>`;
        break;
      }
      case "p": {
        const txt = (child.textContent || "").trim();
        out += `<p>${escapeHtml(txt)}</p>`;
        break;
      }
      case "list": {
        out += renderOdtList(child);
        break;
      }
      case "table": {
        out += renderOdtTable(child);
        break;
      }
      default:
        // Recurse to capture nested sections
        out += walkOdt(child);
    }
  }
  return out;
}

function renderOdtList(listEl: Element): string {
  const items = Array.from(listEl.children).filter((c) => c.localName === "list-item");
  const inner = items
    .map((it) => `<li>${escapeHtml((it.textContent || "").trim())}</li>`)
    .join("");
  return `<ul>${inner}</ul>`;
}

function renderOdtTable(tableEl: Element): string {
  const rows = Array.from(tableEl.getElementsByTagName("table:table-row"));
  if (!rows.length) return "";
  const tr = rows
    .map((row) => {
      const cells = Array.from(row.getElementsByTagName("table:table-cell"));
      const td = cells.map((c) => `<td>${escapeHtml((c.textContent || "").trim())}</td>`).join("");
      return `<tr>${td}</tr>`;
    })
    .join("");
  return `<table><tbody>${tr}</tbody></table>`;
}

function clampInt(v: string, min: number, max: number): number {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrapInProseMirrorParagraphs(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "<p></p>";
  // marked already produces block-level HTML; just return as-is.
  return trimmed;
}

/**
 * Dispatch the imported HTML into the active editor via a custom event.
 * The RichEditor listens for `editor-import-html` and replaces content.
 */
export function dispatchImportedHtml(html: string) {
  window.dispatchEvent(new CustomEvent("editor-import-html", { detail: { html } }));
}
