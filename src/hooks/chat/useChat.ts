import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessage } from "./types";
import { playNotificationSound, showDesktopNotification } from "./useChatNotifications";
import { useChatData } from "./useChatData";
import { useChatActions } from "./useChatActions";
import { useChatPresence } from "./useChatPresence";

export function useChat() {
  const { user, profile, role } = useAuth();
  const userId = user?.id ?? "";

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConvIdRef = useRef<string | null>(null);
  useEffect(() => { activeConvIdRef.current = activeConversationId; }, [activeConversationId]);

  const {
    contacts, setContacts,
    conversations, setConversations,
    messages, setMessages,
    loading,
    unreadCount,
    unreadByConversation,
    groupParticipants,
    fetchContacts,
    fetchConversations,
    fetchUnreadCount,
    fetchMessages,
  } = useChatData(userId, role, profile?.company_id ?? undefined);

  const actions = useChatActions({
    userId,
    activeConversationId,
    setActiveConversationId,
    setMessages,
    setConversations,
    fetchConversations,
    fetchMessages,
  });

  const {
    myStatus,
    updateMyStatus,
    contactStatuses,
    typingUsers,
    sendTypingEvent,
  } = useChatPresence(userId);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  }, []);

  const contactsRef = useRef(contacts);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    fetchContacts();
    fetchConversations();
    fetchUnreadCount();

    let convDebounce: ReturnType<typeof setTimeout> | null = null;
    const debouncedConvRefetch = () => {
      if (convDebounce) clearTimeout(convDebounce);
      convDebounce = setTimeout(() => {
        fetchConversations();
        fetchUnreadCount();
      }, 300);
    };

    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.sender !== userId) {
            playNotificationSound();
            const senderName = contactsRef.current.find((c) => c.id === newMsg.sender)?.name || "Nova mensagem";
            showDesktopNotification(senderName, newMsg.text || "📎 Anexo");
          }
          const currentActiveId = activeConvIdRef.current;
          if (newMsg.conversation_id === currentActiveId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.sender !== userId) {
              supabase.from("chat_messages").update({ read: true }).eq("id", newMsg.id);
            }
          }
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
        debouncedConvRefetch();
      })
      .subscribe();

    return () => {
      if (convDebounce) clearTimeout(convDebounce);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchContacts, fetchConversations, fetchUnreadCount]);

  return {
    contacts,
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    loading,
    unreadCount,
    ...actions,
    myStatus,
    updateMyStatus,
    contactStatuses,
    groupParticipants,
    unreadByConversation,
    typingUsers,
    sendTypingEvent,
    fetchMessages,
  };
}
