import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Keyboard, Search } from "lucide-react";

type Shortcut = { label: string; keys: string };
type Section = { title: string; items: Shortcut[] };

const SECTIONS: Section[] = [
  {
    title: "Arquivo",
    items: [
      { label: "Novo documento", keys: "Ctrl+N" },
      { label: "Abrir (.docx)", keys: "Ctrl+O" },
      { label: "Salvar", keys: "Ctrl+S" },
      { label: "Imprimir / Pré-visualizar", keys: "Ctrl+P" },
    ],
  },
  {
    title: "Edição",
    items: [
      { label: "Desfazer", keys: "Ctrl+Z" },
      { label: "Refazer", keys: "Ctrl+Y" },
      { label: "Recortar", keys: "Ctrl+X" },
      { label: "Copiar", keys: "Ctrl+C" },
      { label: "Colar", keys: "Ctrl+V" },
      { label: "Selecionar tudo", keys: "Ctrl+A" },
      { label: "Localizar", keys: "Ctrl+F" },
      { label: "Substituir", keys: "Ctrl+H" },
    ],
  },
  {
    title: "Formatação de texto",
    items: [
      { label: "Negrito", keys: "Ctrl+B" },
      { label: "Itálico", keys: "Ctrl+I" },
      { label: "Sublinhado", keys: "Ctrl+U" },
      { label: "Tachado", keys: "Ctrl+Shift+X" },
      { label: "Sobrescrito", keys: "Ctrl+." },
      { label: "Subscrito", keys: "Ctrl+," },
      { label: "Limpar formatação", keys: "Ctrl+\\" },
    ],
  },
  {
    title: "Parágrafo",
    items: [
      { label: "Alinhar à esquerda", keys: "Ctrl+L" },
      { label: "Centralizar", keys: "Ctrl+E" },
      { label: "Alinhar à direita", keys: "Ctrl+R" },
      { label: "Justificar", keys: "Ctrl+J" },
      { label: "Aumentar recuo", keys: "Tab" },
      { label: "Diminuir recuo", keys: "Shift+Tab" },
      { label: "Lista com marcadores", keys: "Ctrl+Shift+8" },
      { label: "Lista numerada", keys: "Ctrl+Shift+7" },
    ],
  },
  {
    title: "Inserir",
    items: [
      { label: "Quebra de página", keys: "Ctrl+Enter" },
      { label: "Quebra de linha", keys: "Shift+Enter" },
      { label: "Link", keys: "Ctrl+K" },
      { label: "Comentário", keys: "Ctrl+Alt+M" },
    ],
  },
  {
    title: "Exibir",
    items: [
      { label: "Aumentar zoom", keys: "Ctrl++" },
      { label: "Diminuir zoom", keys: "Ctrl+−" },
      { label: "Zoom 100%", keys: "Ctrl+0" },
      { label: "Modo foco", keys: "F11" },
    ],
  },
];

function Kbd({ value }: { value: string }) {
  const parts = value.split("+");
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center">
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium leading-none rounded border border-border bg-muted text-foreground shadow-[0_1px_0_hsl(var(--border))] min-w-[20px] text-center">
            {p}
          </kbd>
          {i < parts.length - 1 && <span className="mx-0.5 text-[10px] text-muted-foreground">+</span>}
        </span>
      ))}
    </span>
  );
}

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (it) => it.label.toLowerCase().includes(q) || it.keys.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Atalhos de teclado
          </DialogTitle>
          <DialogDescription>
            Lista completa de atalhos do editor. Passe o mouse sobre qualquer ferramenta no menu para ver o atalho correspondente.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar atalho ou comando..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-8">
              Nenhum atalho encontrado para "{query}".
            </div>
          )}
          {filtered.map((section) => (
            <section key={section.title} className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                {section.title}
              </h3>
              <ul className="space-y-1.5">
                {section.items.map((it) => (
                  <li key={it.label} className="flex items-center justify-between gap-3 py-1 px-2 rounded-md hover:bg-muted/50 transition-colors">
                    <span className="text-sm text-foreground">{it.label}</span>
                    <Kbd value={it.keys} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
