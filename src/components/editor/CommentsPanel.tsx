import { useState, useEffect, useRef } from "react";
import { X, Send, MessageSquareText, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  resolved?: boolean;
}

interface CommentsPanelProps {
  comments: Comment[];
  onAddComment: (text: string) => void;
  onDeleteComment: (id: string) => void;
  onResolveComment: (id: string) => void;
  onClose: () => void;
}

export function CommentsPanel({ comments, onAddComment, onDeleteComment, onResolveComment, onClose }: CommentsPanelProps) {
  const [newComment, setNewComment] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSubmit = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setNewComment("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  return (
    <div className="w-[320px] flex-shrink-0 glass-card rounded-lg overflow-hidden animate-slide-in-left flex flex-col h-[calc(100vh-220px)] max-h-[700px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Comentários</h3>
          {comments.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {comments.filter(c => !c.resolved).length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquareText className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-xs font-medium">Nenhum comentário ainda</p>
              <p className="text-[10px] mt-1">Adicione um comentário abaixo</p>
            </div>
          )}
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                "rounded-lg border p-3 text-xs transition-all",
                comment.resolved
                  ? "bg-muted/30 border-border/50 opacity-60"
                  : "bg-card border-border hover:shadow-sm"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-primary">
                      {comment.author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-semibold text-foreground">{comment.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onResolveComment(comment.id)}
                    title={comment.resolved ? "Reabrir" : "Resolver"}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      comment.resolved ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    title="Excluir"
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className={cn("text-foreground/90 leading-relaxed", comment.resolved && "line-through")}>
                {comment.text}
              </p>
              <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                <span className="text-[10px]">{formatTime(comment.timestamp)}</span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3 bg-muted/10">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva um comentário..."
            rows={2}
            className="text-xs resize-none flex-1"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim()}
            className="h-auto px-3 self-end"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">Enter para enviar, Shift+Enter para nova linha</p>
      </div>
    </div>
  );
}
