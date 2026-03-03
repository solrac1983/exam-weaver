// katex is loaded lazily on first use and cached
let katexInstance: any = null;
let katexLoading: Promise<any> | null = null;

function getKatexSync() {
  if (katexInstance) return katexInstance;
  // Trigger lazy load for next call
  if (!katexLoading) {
    katexLoading = import("katex").then((m) => {
      katexInstance = m.default;
      return katexInstance;
    });
  }
  return null;
}

// Preload katex in background
import("katex").then((m) => {
  katexInstance = m.default;
});

function renderFormula(formula: string, displayMode: boolean): string {
  const katex = getKatexSync();
  if (!katex) return `<code>${formula}</code>`;
  try {
    return katex.renderToString(formula, { throwOnError: false, displayMode });
  } catch {
    return `<code>${formula}</code>`;
  }
}

/**
 * Processes HTML string and renders all <span data-type="math" data-formula="..."> tags
 * into rendered KaTeX HTML. Also handles $...$ and $$...$$ inline/block notation.
 */
export function renderMathInHTML(html: string): string {
  if (!html) return html;

  // 1. Process <span data-type="math" data-formula="..."> tags
  let result = html.replace(
    /<span[^>]*data-type=["']math["'][^>]*data-formula=["']([^"']+)["'][^>]*>.*?<\/span>/gi,
    (_, formula) => {
      const decoded = formula
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return renderFormula(decoded, false);
    }
  );

  // Also handle data-formula before data-type order
  result = result.replace(
    /<span[^>]*data-formula=["']([^"']+)["'][^>]*data-type=["']math["'][^>]*>.*?<\/span>/gi,
    (_, formula) => {
      const decoded = formula
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return renderFormula(decoded, false);
    }
  );

  // 2. Process $$...$$ block math
  result = result.replace(/\$\$([^$]+)\$\$/g, (_, formula) => {
    return renderFormula(formula.trim(), true);
  });

  // 3. Process $...$ inline math (but not $$)
  result = result.replace(/(?<!\$)\$(?!\$)([^$]+)\$(?!\$)/g, (_, formula) => {
    return renderFormula(formula.trim(), false);
  });

  return result;
}

/**
 * Renders math in a plain text string (for options/answers).
 */
export function renderMathInText(text: string): string {
  if (!text) return text;
  return renderMathInHTML(text);
}
