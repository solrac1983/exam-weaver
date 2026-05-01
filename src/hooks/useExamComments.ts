import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Comment } from "@/components/editor/CommentsPanel";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

export function useExamComments(demandId: string | undefined, currentAuthor: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  // Load comments from DB
  useEffect(() => {
    if (!demandId) return;
    setLoading(true);
    supabase
      .from("exam_comments")
      .select("*")
      .eq("demand_id", demandId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setComments(
            data.map((c: any) => ({
              id: c.id,
              author: c.author,
              text: c.text,
              timestamp: c.created_at,
              resolved: c.resolved,
            }))
          );
        }
        setLoading(false);
        initialLoadDone.current = true;
      });
  }, [demandId]);

  // Realtime subscription — notify on new comments from others
  useEffect(() => {
    if (!demandId) return;
    const channel = supabase
      .channel(`exam-comments-${demandId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "exam_comments",
          filter: `demand_id=eq.${demandId}`,
        },
        (payload) => {
          const c = payload.new as any;
          const newComment: Comment = {
            id: c.id,
            author: c.author,
            text: c.text,
            timestamp: c.created_at,
            resolved: c.resolved,
          };
          // Only add if not already in state (avoid duplicates from own inserts)
          setComments((prev) => {
            if (prev.some((x) => x.id === newComment.id)) return prev;
            return [...prev, newComment];
          });
          // Notify if comment is from someone else
          if (c.author !== currentAuthor && initialLoadDone.current) {
            toast.info(`💬 Novo comentário de ${c.author}`, {
              description: c.text.length > 80 ? c.text.slice(0, 80) + "…" : c.text,
              duration: 6000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "exam_comments",
          filter: `demand_id=eq.${demandId}`,
        },
        (payload) => {
          const c = payload.new as any;
          setComments((prev) =>
            prev.map((x) =>
              x.id === c.id ? { ...x, resolved: c.resolved, text: c.text } : x
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "exam_comments",
          filter: `demand_id=eq.${demandId}`,
        },
        (payload) => {
          const id = (payload.old as any).id;
          setComments((prev) => prev.filter((x) => x.id !== id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [demandId, currentAuthor]);

  const addComment = useCallback(
    async (text: string) => {
      if (!demandId) return;
      const { data, error } = await supabase
        .from("exam_comments")
        .insert({ demand_id: demandId, author: currentAuthor, text })
        .select()
        .single();
      if (data) {
        const newComment: Comment = {
          id: data.id,
          author: data.author,
          text: data.text,
          timestamp: data.created_at,
          resolved: data.resolved,
        };
        setComments((prev) => {
          if (prev.some((x) => x.id === newComment.id)) return prev;
          return [...prev, newComment];
        });
      }
      if (error) showInvokeError("Erro ao salvar comentário");
    },
    [demandId, currentAuthor]
  );

  const deleteComment = useCallback(async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("exam_comments").delete().eq("id", id);
  }, []);

  const resolveComment = useCallback(async (id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))
    );
    const comment = comments.find((c) => c.id === id);
    if (comment) {
      await supabase
        .from("exam_comments")
        .update({ resolved: !comment.resolved })
        .eq("id", id);
    }
  }, [comments]);

  return { comments, loading, addComment, deleteComment, resolveComment };
}
