import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { currentUser } from "@/data/mockData";

export function useChatUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    // Count unread messages where current user is a participant but not the sender
    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("id")
      .or(`participant_1.eq.${currentUser.id},participant_2.eq.${currentUser.id}`);

    if (!convs?.length) { setUnreadCount(0); return; }

    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convs.map(c => c.id))
      .neq("sender", currentUser.id)
      .eq("read", false);

    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    const channel = supabase
      .channel("sidebar-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchUnreadCount]);

  return unreadCount;
}
