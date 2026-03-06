import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserStatus } from "./types";

export function useChatPresence(userId: string) {
  const [myStatus, setMyStatus] = useState<UserStatus>("online");
  const [contactStatuses, setContactStatuses] = useState<Record<string, UserStatus>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const updateMyStatus = useCallback((status: UserStatus) => {
    setMyStatus(status);
    if (channelRef.current) channelRef.current.track({ user_id: userId, status });
  }, [userId]);

  const sendTypingEvent = useCallback((conversationId: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId, conversation_id: conversationId },
      });
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("chat-presence", {
      config: { presence: { key: userId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const statuses: Record<string, UserStatus> = {};
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== userId && presences.length > 0)
            statuses[key] = (presences[0] as any).status || "online";
        });
        setContactStatuses(statuses);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const senderId = payload.user_id as string;
        if (senderId === userId) return;
        setTypingUsers((prev) => ({ ...prev, [senderId]: Date.now() }));
        if (typingTimeoutsRef.current[senderId]) clearTimeout(typingTimeoutsRef.current[senderId]);
        typingTimeoutsRef.current[senderId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[senderId];
            return next;
          });
        }, 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ user_id: userId, status: myStatus });
      });
    channelRef.current = channel;
    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [userId]);

  return {
    myStatus,
    updateMyStatus,
    contactStatuses,
    typingUsers,
    sendTypingEvent,
  };
}
