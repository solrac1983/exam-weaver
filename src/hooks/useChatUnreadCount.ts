import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useChatUnreadCount() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("id")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

    if (!convs?.length) { setUnreadCount(0); return; }

    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convs.map(c => c.id))
      .neq("sender", userId)
      .eq("read", false);

    setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchUnreadCount();

    // Debounce to avoid hammering DB on burst of messages
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fetchUnreadCount, 500);
    };

    const channel = supabase
      .channel("sidebar-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, debouncedFetch)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCount]);

  return unreadCount;
}
