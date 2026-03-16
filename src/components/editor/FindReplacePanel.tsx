import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Search, Replace, X, ChevronUp, ChevronDown, CaseSensitive, WholeWord } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FindReplacePanelProps {
  editor: Editor;
  onClose: () => void;
  initialMode?: "find" | "replace";
}

export function FindReplacePanel({ editor, onClose, initialMode = "find" }: FindReplacePanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [showReplace, setShowReplace] = useState(initialMode === "replace");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Focus input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
    // Prefill with selected text
    const { from, to } = editor.state.selection;
    if (from !== to) {
      const text = editor.state.doc.textBetween(from, to);
      if (text.length < 100) setSearchTerm(text);
    }
  }, [editor]);

  // Cleanup highlights on unmount
  useEffect(() => {
    return () => {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
      // Remove highlight marks
      const pm = document.querySelector('.ProseMirror') as HTMLElement;
      if (pm) {
        pm.querySelectorAll('mark[data-find-highlight]').forEach(el => {
          const parent = el.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(el.textContent || ''), el);
            parent.normalize();
          }
        });
      }
    };
  }, []);

  const getMatches = useCallback((term: string): { index: number; length: number }[] => {
    if (!term) return [];
    const text = editor.getText();
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
    const regex = new RegExp(pattern, flags);
    const matches: { index: number; length: number }[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({ index: match.index, length: match[0].length });
    }
    return matches;
  }, [editor, caseSensitive, wholeWord]);

  // Highlight matches using CSS custom highlights or inline style
  useEffect(() => {
    const matches = getMatches(searchTerm);
    setMatchCount(matches.length);
    if (currentMatch > matches.length) setCurrentMatch(matches.length > 0 ? 1 : 0);
    if (matches.length > 0 && currentMatch === 0) setCurrentMatch(1);

    // Use a style tag for highlighting via decorations
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      styleRef.current.id = 'find-replace-highlights';
      document.head.appendChild(styleRef.current);
    }

    if (searchTerm && matches.length > 0) {
      styleRef.current.textContent = `
        .find-highlight { background-color: hsl(48 96% 70% / 0.6); border-radius: 2px; }
        .find-highlight-active { background-color: hsl(25 95% 60% / 0.7); border-radius: 2px; color: white; }
      `;
    } else {
      styleRef.current.textContent = '';
    }
  }, [searchTerm, caseSensitive, wholeWord, getMatches, currentMatch]);

  const navigateMatch = useCallback((direction: 'next' | 'prev') => {
    const matches = getMatches(searchTerm);
    if (matches.length === 0) return;

    let next = direction === 'next' ? currentMatch + 1 : currentMatch - 1;
    if (next > matches.length) next = 1;
    if (next < 1) next = matches.length;
    setCurrentMatch(next);

    // Find position in doc
    const match = matches[next - 1];
    if (!match) return;

    // Map text offset to doc position
    let textOffset = 0;
    let targetPos = 0;
    editor.state.doc.descendants((node, pos) => {
      if (targetPos > 0) return false;
      if (node.isText) {
        const nodeText = node.text || '';
        if (textOffset + nodeText.length > match.index) {
          targetPos = pos + (match.index - textOffset);
          return false;
        }
        textOffset += nodeText.length;
      } else if (node.isBlock && textOffset > 0) {
        textOffset += 1; // newline separator
      }
    });

    if (targetPos > 0) {
      editor.chain().focus().setTextSelection({ from: targetPos, to: targetPos + match.length }).run();
      // Scroll into view
      const domAtPos = editor.view.domAtPos(targetPos);
      if (domAtPos?.node) {
        const el = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [editor, searchTerm, currentMatch, getMatches]);

  const replaceOne = useCallback(() => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    const termToCompare = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    const selectedToCompare = caseSensitive ? selectedText : selectedText.toLowerCase();

    if (selectedToCompare === termToCompare) {
      editor.chain().focus().insertContentAt({ from, to }, replaceTerm).run();
      toast.success("Substituído!");
      navigateMatch('next');
    } else {
      navigateMatch('next');
    }
  }, [editor, searchTerm, replaceTerm, caseSensitive, navigateMatch]);

  const replaceAll = useCallback(() => {
    const html = editor.getHTML();
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
    const regex = new RegExp(pattern, flags);
    const count = (editor.getText().match(regex) || []).length;

    if (count === 0) {
      toast.info("Nenhuma ocorrência encontrada.");
      return;
    }

    // Replace in text nodes only (avoid replacing inside HTML tags)
    const newHtml = html.replace(
      /(<[^>]*>)|([^<]+)/g,
      (match, tag, text) => {
        if (tag) return tag;
        return text.replace(regex, replaceTerm);
      }
    );
    editor.commands.setContent(newHtml);
    toast.success(`${count} ocorrência(s) substituída(s).`);
    setMatchCount(0);
    setCurrentMatch(0);
  }, [editor, searchTerm, replaceTerm, caseSensitive, wholeWord]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) navigateMatch('prev');
      else navigateMatch('next');
    } else if (e.key === 'F3') {
      e.preventDefault();
      if (e.shiftKey) navigateMatch('prev');
      else navigateMatch('next');
    }
  };

  return (
    <div className="absolute top-1 right-2 z-50 bg-card border border-border rounded-lg shadow-xl p-3 min-w-[340px] animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 mb-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-foreground">
          {showReplace ? "Localizar e Substituir" : "Localizar"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setShowReplace(!showReplace)}
            className={cn("p-1 rounded text-xs transition-colors", showReplace ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
            title="Mostrar/Ocultar Substituir"
          >
            <Replace className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-1.5">
        <Input
          ref={searchInputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Localizar..."
          className="h-7 text-xs flex-1"
        />
        <button
          onClick={() => setCaseSensitive(!caseSensitive)}
          className={cn("p-1 rounded transition-colors shrink-0", caseSensitive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted")}
          title="Diferenciar maiúsculas/minúsculas"
        >
          <CaseSensitive className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setWholeWord(!wholeWord)}
          className={cn("p-1 rounded transition-colors shrink-0", wholeWord ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted")}
          title="Palavra inteira"
        >
          <WholeWord className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] text-muted-foreground tabular-nums min-w-[60px]">
          {matchCount > 0 ? `${currentMatch} de ${matchCount}` : searchTerm ? "Sem resultados" : ""}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={() => navigateMatch('prev')} disabled={matchCount === 0} className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => navigateMatch('next')} disabled={matchCount === 0} className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showReplace && (
        <>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Input
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Substituir por..."
              className="h-7 text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={replaceOne} disabled={matchCount === 0} className="h-6 text-[10px] px-2">
              Substituir
            </Button>
            <Button variant="outline" size="sm" onClick={replaceAll} disabled={matchCount === 0} className="h-6 text-[10px] px-2">
              Substituir tudo
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
