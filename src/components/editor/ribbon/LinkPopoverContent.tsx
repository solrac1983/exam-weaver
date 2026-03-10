import { Editor } from "@tiptap/react";
import { useState, useEffect } from "react";
import { Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export function LinkPopoverContent({ editor }: { editor: Editor }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    if (selectedText) setText(selectedText);
    const linkMark = editor.getAttributes("link");
    if (linkMark?.href) setUrl(linkMark.href);
  }, [editor]);

  const handleInsert = () => {
    if (!url.trim()) return;
    const finalUrl = url.startsWith("http") ? url : `https://${url}`;
    if (text.trim()) {
      editor.chain().focus().insertContent(`<a href="${finalUrl}" target="_blank">${text}</a>`).run();
    } else {
      editor.chain().focus().setMark("link", { href: finalUrl, target: "_blank" }).run();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <LinkIcon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Inserir Link</span>
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-muted-foreground">Texto a exibir</label>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Texto do link" className="h-8 text-xs" />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-muted-foreground">URL</label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleInsert(); }} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleInsert} disabled={!url.trim()} className="flex-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">Inserir</button>
        <button onClick={() => editor.chain().focus().unsetMark("link").run()} className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Remover</button>
      </div>
    </div>
  );
}
