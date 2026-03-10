import { Editor } from "@tiptap/react";
import { useState } from "react";
import { Smile, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const iconCategories = [
  { label: "Educação", icons: ["📚", "📖", "📝", "✏️", "🎓", "📐", "📏", "🔬", "🔭", "🧪", "🧮", "🗂️", "📋", "📎", "🖊️", "🖋️"] },
  { label: "Símbolos", icons: ["✅", "❌", "⚠️", "ℹ️", "❓", "❗", "💡", "⭐", "🔑", "🎯", "🏆", "🔔", "📌", "🔗", "💬", "📢"] },
  { label: "Setas", icons: ["➡️", "⬅️", "⬆️", "⬇️", "↩️", "↪️", "🔄", "▶️", "◀️", "🔼", "🔽", "☑️", "🔲", "🔳"] },
  { label: "Números", icons: ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "Ⓐ", "Ⓑ", "Ⓒ", "Ⓓ"] },
  { label: "Ciências", icons: ["⚛️", "🧬", "🌡️", "💊", "🦠", "🌍", "🌙", "☀️", "⚡", "🔥", "💧", "🌿", "🧲", "🔋", "⚙️", "🛠️"] },
  { label: "Expressões", icons: ["😊", "🤔", "😮", "👍", "👎", "👏", "🙋", "✋", "💪", "🤝", "🎉", "❤️", "🧠", "👤"] },
];

export function IconsDropdown({ editor }: { editor: Editor }) {
  const [search, setSearch] = useState("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Smile className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px] max-h-[380px] overflow-y-auto p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input placeholder="Buscar ícone..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs rounded border border-input bg-background focus:ring-1 focus:ring-primary outline-none" />
        </div>
        {iconCategories.map((cat) => {
          const filtered = search ? cat.icons.filter(() => cat.label.toLowerCase().includes(search.toLowerCase())) : cat.icons;
          if (filtered.length === 0) return null;
          return (
            <div key={cat.label}>
              <p className="text-[10px] font-semibold text-muted-foreground px-1 pt-1.5 pb-1">{cat.label}</p>
              <div className="grid grid-cols-8 gap-0.5">
                {filtered.map((icon, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <button type="button" onClick={() => editor.chain().focus().insertContent(icon).run()}
                        className="w-8 h-8 rounded hover:bg-muted border border-transparent hover:border-border transition-colors flex items-center justify-center text-base">
                        {icon}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px]">{icon}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
