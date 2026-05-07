/**
 * StyleManager — named paragraph/run styles, mirroring Word's Style gallery.
 *
 * Styles are pure data; mapping to CSS classes lives in `index.css`
 * (`.exam-style-questao`, `.exam-style-alternativa`, …) and to Tiptap
 * attributes via the `paragraphStyle` mark (added in Phase 2).
 */

export interface RunStyle {
  fontFamily?: string;
  fontSize?: number; // pt
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
}

export interface ParagraphStyle {
  align?: "left" | "center" | "right" | "justify";
  indent?: number;        // mm — left indent
  firstLineIndent?: number; // mm
  spacingBefore?: number; // pt
  spacingAfter?: number;  // pt
  lineHeight?: number;    // multiplier
}

export interface NamedStyle {
  id: string;
  name: string;
  basedOn?: string;
  builtIn: boolean;
  run: RunStyle;
  paragraph: ParagraphStyle;
  /** CSS class that materialises this style in the DOM. */
  cssClass: string;
}

export type StyleRegistry = Record<string, NamedStyle>;

export const STYLE_IDS = {
  normal: "normal",
  heading1: "heading1",
  heading2: "heading2",
  questao: "questao",
  alternativa: "alternativa",
  textoApoio: "textoApoio",
  gabarito: "gabarito",
  cabecalhoProva: "cabecalhoProva",
} as const;

export function defaultStyleRegistry(): StyleRegistry {
  const styles: NamedStyle[] = [
    {
      id: STYLE_IDS.normal,
      name: "Normal",
      builtIn: true,
      run: { fontFamily: "Arial", fontSize: 11 },
      paragraph: { align: "left", lineHeight: 1.5 },
      cssClass: "exam-style-normal",
    },
    {
      id: STYLE_IDS.heading1,
      name: "Título 1",
      basedOn: STYLE_IDS.normal,
      builtIn: true,
      run: { fontFamily: "Arial", fontSize: 18, bold: true },
      paragraph: { align: "left", spacingBefore: 12, spacingAfter: 6 },
      cssClass: "exam-style-h1",
    },
    {
      id: STYLE_IDS.heading2,
      name: "Título 2",
      basedOn: STYLE_IDS.normal,
      builtIn: true,
      run: { fontFamily: "Arial", fontSize: 14, bold: true },
      paragraph: { align: "left", spacingBefore: 10, spacingAfter: 4 },
      cssClass: "exam-style-h2",
    },
    {
      id: STYLE_IDS.questao,
      name: "Questão",
      basedOn: STYLE_IDS.normal,
      builtIn: true,
      run: { fontFamily: "Arial", fontSize: 11, bold: true },
      paragraph: { align: "justify", spacingBefore: 8, spacingAfter: 4 },
      cssClass: "exam-style-questao",
    },
    {
      id: STYLE_IDS.alternativa,
      name: "Alternativa",
      basedOn: STYLE_IDS.normal,
      builtIn: true,
      run: { fontFamily: "Arial", fontSize: 11 },
      paragraph: { align: "justify", indent: 8, spacingAfter: 2 },
      cssClass: "exam-style-alternativa",
    },
    {
      id: STYLE_IDS.textoApoio,
      name: "Texto de Apoio",
      basedOn: STYLE_IDS.normal,
      builtIn: true,
      run: { fontFamily: "Arial", fontSize: 10, italic: true },
      paragraph: { align: "justify", indent: 6, spacingBefore: 4, spacingAfter: 4 },
      cssClass: "exam-style-apoio",
    },
    {
      id: STYLE_IDS.gabarito,
      name: "Gabarito",
      basedOn: STYLE_IDS.normal,
      builtIn: true,
      run: { fontFamily: "Arial", fontSize: 10, bold: true, color: "hsl(var(--primary))" },
      paragraph: { align: "left", spacingBefore: 4, spacingAfter: 2 },
      cssClass: "exam-style-gabarito",
    },
    {
      id: STYLE_IDS.cabecalhoProva,
      name: "Cabeçalho de Prova",
      basedOn: STYLE_IDS.normal,
      builtIn: true,
      run: { fontFamily: "Arial", fontSize: 12, bold: true },
      paragraph: { align: "center", spacingAfter: 8 },
      cssClass: "exam-style-cabecalho",
    },
  ];
  return Object.fromEntries(styles.map((s) => [s.id, s]));
}

/** Resolve a style chain (handles `basedOn`) into flat run/paragraph blocks. */
export function resolveStyle(
  registry: StyleRegistry,
  id: string,
): { run: RunStyle; paragraph: ParagraphStyle } | null {
  const style = registry[id];
  if (!style) return null;
  const base = style.basedOn ? resolveStyle(registry, style.basedOn) : null;
  return {
    run: { ...(base?.run ?? {}), ...style.run },
    paragraph: { ...(base?.paragraph ?? {}), ...style.paragraph },
  };
}

/** Convert a style to inline CSS (used by exporters and previews). */
export function styleToCss(
  registry: StyleRegistry,
  id: string,
): React.CSSProperties {
  const r = resolveStyle(registry, id);
  if (!r) return {};
  const css: React.CSSProperties = {};
  if (r.run.fontFamily) css.fontFamily = r.run.fontFamily;
  if (r.run.fontSize) css.fontSize = `${r.run.fontSize}pt`;
  if (r.run.bold) css.fontWeight = "bold";
  if (r.run.italic) css.fontStyle = "italic";
  if (r.run.underline) css.textDecoration = "underline";
  if (r.run.color) css.color = r.run.color;
  if (r.run.backgroundColor) css.backgroundColor = r.run.backgroundColor;
  if (r.paragraph.align) css.textAlign = r.paragraph.align;
  if (r.paragraph.indent) css.marginLeft = `${r.paragraph.indent}mm`;
  if (r.paragraph.firstLineIndent) css.textIndent = `${r.paragraph.firstLineIndent}mm`;
  if (r.paragraph.spacingBefore) css.marginTop = `${r.paragraph.spacingBefore}pt`;
  if (r.paragraph.spacingAfter) css.marginBottom = `${r.paragraph.spacingAfter}pt`;
  if (r.paragraph.lineHeight) css.lineHeight = r.paragraph.lineHeight;
  return css;
}
