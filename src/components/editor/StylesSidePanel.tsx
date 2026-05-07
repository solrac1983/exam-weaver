/**
 * StylesSidePanel — Word-like Styles gallery. Lists the named styles from
 * StyleManager and lets the user apply a style to the current selection.
 *
 * For now applies the style as inline CSS via Tiptap's TextStyle marks plus
 * paragraph alignment / line height. Future Phase 6 will wire a true
 * `paragraphStyle` attribute to make the style persistent.
 */
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import {
  defaultStyleRegistry,
  resolveStyle,
  type NamedStyle,
} from "./core/StyleManager";

interface StylesSidePanelProps {
  editor: Editor;
  onClose: () => void;
}

export function StylesSidePanel({ editor, onClose }: StylesSidePanelProps) {
  const registry = defaultStyleRegistry();
  const styles = Object.values(registry);

  const applyStyle = (style: NamedStyle) => {
    const r = resolveStyle(registry, style.id);
    if (!r) return;
    const chain = editor.chain().focus();
    if (r.run.fontFamily) chain.setFontFamily(r.run.fontFamily);
    if (r.run.fontSize) (chain as any).setFontSize?.(`${r.run.fontSize}pt`);
    if (r.run.bold) chain.setBold(); else chain.unsetBold();
    if (r.run.italic) chain.setItalic(); else chain.unsetItalic();
    if (r.run.underline) chain.setUnderline(); else chain.unsetUnderline();
    if (r.run.color) chain.setColor(r.run.color);
    if (r.paragraph.align) chain.setTextAlign(r.paragraph.align);
    if (r.paragraph.lineHeight) (chain as any).setLineHeight?.(String(r.paragraph.lineHeight));
    chain.run();
  };

  return (
    <aside className="w-[260px] shrink-0 border-l bg-background flex flex-col h-full">
      <header className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">Estilos</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </header>
      <ScrollArea className="flex-1">
        <ul className="p-2 space-y-1">
          {styles.map((s) => {
            const r = resolveStyle(registry, s.id);
            const preview: React.CSSProperties = {
              fontFamily: r?.run.fontFamily,
              fontSize: r?.run.fontSize ? `${Math.min(r.run.fontSize, 14)}pt` : undefined,
              fontWeight: r?.run.bold ? 700 : 400,
              fontStyle: r?.run.italic ? "italic" : "normal",
              textAlign: r?.paragraph.align as any,
            };
            return (
              <li key={s.id}>
                <button
                  className="w-full text-left rounded px-2 py-1.5 hover:bg-accent/50 transition-colors border border-transparent hover:border-border"
                  onClick={() => applyStyle(s)}
                  title={`Aplicar estilo "${s.name}" à seleção`}
                >
                  <div className="text-[11px] text-muted-foreground mb-0.5">{s.name}</div>
                  <div style={preview} className="truncate">
                    {s.name === "Normal" ? "Texto de exemplo" : s.name}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      <div className="border-t p-2 text-[11px] text-muted-foreground">
        Selecione o texto e clique em um estilo para aplicar.
      </div>
    </aside>
  );
}
