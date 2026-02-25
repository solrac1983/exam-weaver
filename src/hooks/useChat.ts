import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { currentUser } from "@/data/mockData";

export type UserStatus = "online" | "busy" | "offline";

export interface ChatConversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_text: string | null;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender: string;
  text: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  read: boolean;
  created_at: string;
}

// Mock contacts for the app
export const chatContacts = [
  { id: "coord-1", name: "Maria Silva", role: "Coordenadora" },
  { id: "prof-1", name: "Carlos Oliveira", role: "Professor" },
  { id: "prof-2", name: "Ana Santos", role: "Professora" },
  { id: "prof-3", name: "Roberto Lima", role: "Professor" },
  { id: "prof-4", name: "Fernanda Costa", role: "Professora" },
  { id: "prof-5", name: "Paulo Mendes", role: "Professor" },
];

export function useChat() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [myStatus, setMyStatus] = useState<UserStatus>("online");
  const [contactStatuses, setContactStatuses] = useState<Record<string, UserStatus>>({
    "coord-1": "online",
    "prof-1": "online",
    "prof-2": "busy",
    "prof-3": "offline",
    "prof-4": "online",
    "prof-5": "offline",
  });

  const updateMyStatus = useCallback((status: UserStatus) => {
    setMyStatus(status);
    // Update in the mock statuses map too
    setContactStatuses(prev => ({ ...prev, [currentUser.id]: status }));
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .or(`participant_1.eq.${currentUser.id},participant_2.eq.${currentUser.id}`)
      .order("last_message_at", { ascending: false });
    if (data) setConversations(data);
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .neq("sender", currentUser.id)
      .eq("read", false);
    setUnreadCount(count ?? 0);
  }, []);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
    setLoading(false);

    // Mark messages as read
    await supabase
      .from("chat_messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender", currentUser.id)
      .eq("read", false);
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Open or create conversation with contact
  const openConversation = useCallback(async (contactId: string) => {
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("*")
      .or(
        `and(participant_1.eq.${currentUser.id},participant_2.eq.${contactId}),and(participant_1.eq.${contactId},participant_2.eq.${currentUser.id})`
      )
      .maybeSingle();

    if (existing) {
      setActiveConversationId(existing.id);
      await fetchMessages(existing.id);
      return existing.id;
    }

    const { data: newConv } = await supabase
      .from("chat_conversations")
      .insert({ participant_1: currentUser.id, participant_2: contactId })
      .select()
      .single();

    if (newConv) {
      setActiveConversationId(newConv.id);
      setMessages([]);
      fetchConversations();
      return newConv.id;
    }
    return null;
  }, [fetchConversations, fetchMessages]);

  // Send message
  const sendMessage = useCallback(async (text?: string, file?: File) => {
    if (!activeConversationId) return;

    let attachment_url: string | null = null;
    let attachment_type: string | null = null;
    let attachment_name: string | null = null;

    if (file) {
      const path = `${activeConversationId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file);

      if (!error) {
        const { data: urlData } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(path);
        attachment_url = urlData.publicUrl;
        attachment_type = file.type.startsWith("image/") ? "image"
          : file.type.startsWith("audio/") ? "audio" : "file";
        attachment_name = file.name;
      }
    }

    if (!text && !attachment_url) return;

    await supabase.from("chat_messages").insert({
      conversation_id: activeConversationId,
      sender: currentUser.id,
      text: text || null,
      attachment_url,
      attachment_type,
      attachment_name,
    });

    await supabase
      .from("chat_conversations")
      .update({
        last_message_text: text || (attachment_name ? `📎 ${attachment_name}` : null),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", activeConversationId);

    fetchConversations();
  }, [activeConversationId, fetchConversations]);

  // Realtime subscription
  useEffect(() => {
    fetchConversations();
    fetchUnreadCount();

    const channel = supabase
      .channel("chat-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as ChatMessage;
            if (newMsg.conversation_id === activeConversationId) {
              setMessages((prev) => [...prev, newMsg]);
              if (newMsg.sender !== currentUser.id) {
                supabase
                  .from("chat_messages")
                  .update({ read: true })
                  .eq("id", newMsg.id);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            // Update read status in current messages
            const updated = payload.new as ChatMessage;
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, read: updated.read } : m))
            );
          }
          fetchConversations();
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, fetchConversations, fetchUnreadCount]);

  return {
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    loading,
    unreadCount,
    openConversation,
    sendMessage,
    fetchMessages,
    myStatus,
    updateMyStatus,
    contactStatuses,
  };
}
