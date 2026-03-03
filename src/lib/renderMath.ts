let katexModule: typeof import("katex") | null = null;

async function getKatex() {
  if (!katexModule) {
    katexModule = await import("katex");
  }
  return katexModule.default;
}

/**
 * Processes HTML string and renders all <span data-type="math" data-formula="..."> tags
 * into rendered KaTeX HTML. Also handles $...$ and $$...$$ inline/block notation.
 * Now async to support dynamic import of katex.
 */
export async function renderMathInHTML(html: string): Promise<string> {
  if (!html) return html;

  const katex = await getKatex();

  // 1. Process <span data-type="math" data-formula="..."> tags
  let result = html.replace(
    /<span[^>]*data-type=["']math["'][^>]*data-formula=["']([^"']+)["'][^>]*>.*?<\/span>/gi,
    (_, formula) => {
      try {
        const decoded = formula
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        return katex.renderToString(decoded, { throwOnError: false, displayMode: false });
      } catch {
        return `<code>${formula}</code>`;
      }
    }
  );

  // Also handle data-formula before data-type order
  result = result.replace(
    /<span[^>]*data-formula=["']([^"']+)["'][^>]*data-type=["']math["'][^>]*>.*?<\/span>/gi,
    (_, formula) => {
      try {
        const decoded = formula
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        return katex.renderToString(decoded, { throwOnError: false, displayMode: false });
      } catch {
        return `<code>${formula}</code>`;
      }
    }
  );

  // 2. Process $$...$$ block math
  result = result.replace(/\$\$([^$]+)\$\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: true });
    } catch {
      return `<code>${formula}</code>`;
    }
  });

  // 3. Process $...$ inline math (but not $$)
  result = result.replace(/(?<!\$)\$(?!\$)([^$]+)\$(?!\$)/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), { throwOnError: false, displayMode: false });
    } catch {
      return `<code>${formula}</code>`;
    }
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
