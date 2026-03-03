import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Persistent AudioContext – created once, resumed on first user gesture
let _audioCtx: AudioContext | null = null;
let _audioResumed = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

// Resume audio context on very first user interaction (click/keydown)
function ensureAudioResumed() {
  if (_audioResumed) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
  _audioResumed = true;
}

if (typeof window !== "undefined") {
  const resumeOnce = () => {
    ensureAudioResumed();
    window.removeEventListener("click", resumeOnce);
    window.removeEventListener("keydown", resumeOnce);
    window.removeEventListener("touchstart", resumeOnce);
  };
  window.addEventListener("click", resumeOnce);
  window.addEventListener("keydown", resumeOnce);
  window.addEventListener("touchstart", resumeOnce);
}

function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

function showDesktopNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      }
    });
  }
}

export type UserStatus = "online" | "busy" | "offline";

export interface ChatContact {
  id: string;
  name: string;
  role: string;
}

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

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  coordinator: "Coordenador(a)",
  professor: "Professor(a)",
};

export function useChat() {
  const { user, profile, role } = useAuth();
  const userId = user?.id ?? "";

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [myStatus, setMyStatus] = useState<UserStatus>("online");
  const [contactStatuses, setContactStatuses] = useState<Record<string, UserStatus>>({});
  const presenceChannelRef = useState<ReturnType<typeof supabase.channel> | null>(null);

  const updateMyStatus = useCallback((status: UserStatus) => {
    setMyStatus(status);
    // Update presence with new status
    const channel = presenceChannelRef[0];
    if (channel) {
      channel.track({ user_id: userId, status });
    }
  }, [userId, presenceChannelRef]);

  // Realtime Presence for online status
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
          if (key !== userId && presences.length > 0) {
            statuses[key] = (presences[0] as any).status || "online";
          }
        });
        setContactStatuses(statuses);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, status: myStatus });
        }
      });

    presenceChannelRef[0] = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      presenceChannelRef[0] = null;
    };
  }, [userId]); // intentionally exclude myStatus to avoid re-subscribing

  // Fetch company contacts — batch role lookup instead of N+1 individual RPCs
  const fetchContacts = useCallback(async () => {
    if (!userId) return;

    let query = supabase
      .from("profiles")
      .select("id, full_name, email")
      .neq("id", userId)
      .order("full_name");

    if (role !== "super_admin" && profile?.company_id) {
      query = query.eq("company_id", profile.company_id);
    } else if (role !== "super_admin") {
      return;
    }

    const { data } = await query;
    if (!data || data.length === 0) return;

    // Batch fetch all roles in a single query instead of N individual RPC calls
    const userIds = data.map((p) => p.id);
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const roleMap = new Map<string, string>();
    rolesData?.forEach((r) => roleMap.set(r.user_id, r.role));

    const contactsWithRoles = data.map((p) => ({
      id: p.id,
      name: p.full_name || p.email,
      role: roleLabels[roleMap.get(p.id) ?? "professor"] ?? "Usuário",
    }));
    setContacts(contactsWithRoles);
  }, [userId, role, profile?.company_id]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order("last_message_at", { ascending: false });
    if (data) setConversations(data);
  }, [userId]);

  // Fetch unread count
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

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!userId) return;
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
      .neq("sender", userId)
      .eq("read", false);
    fetchUnreadCount();
  }, [userId, fetchUnreadCount]);

  // Open or create conversation with contact
  const openConversation = useCallback(async (contactId: string) => {
    if (!userId) return null;
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("*")
      .or(
        `and(participant_1.eq.${userId},participant_2.eq.${contactId}),and(participant_1.eq.${contactId},participant_2.eq.${userId})`
      )
      .maybeSingle();

    if (existing) {
      setActiveConversationId(existing.id);
      await fetchMessages(existing.id);
      return existing.id;
    }

    const { data: newConv } = await supabase
      .from("chat_conversations")
      .insert({ participant_1: userId, participant_2: contactId })
      .select()
      .single();

    if (newConv) {
      setActiveConversationId(newConv.id);
      setMessages([]);
      fetchConversations();
      return newConv.id;
    }
    return null;
  }, [userId, fetchConversations, fetchMessages]);

  // Send message
  const sendMessage = useCallback(async (text?: string, file?: File) => {
    if (!activeConversationId || !userId) return;

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
      sender: userId,
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
  }, [activeConversationId, userId, fetchConversations]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Keep contacts ref for notification lookup
  const contactsRef = useRef<ChatContact[]>([]);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  // Realtime subscription with debounced side-fetches
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as ChatMessage;
            if (newMsg.sender !== userId) {
              playNotificationSound();
              const senderName = contactsRef.current.find(c => c.id === newMsg.sender)?.name || "Nova mensagem";
              showDesktopNotification(senderName, newMsg.text || "📎 Anexo");
            }
            if (newMsg.conversation_id === activeConversationId) {
              setMessages((prev) => [...prev, newMsg]);
              if (newMsg.sender !== userId) {
                supabase
                  .from("chat_messages")
                  .update({ read: true })
                  .eq("id", newMsg.id);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as ChatMessage;
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, read: updated.read } : m))
            );
          }
          debouncedConvRefetch();
        }
      )
      .subscribe();

    return () => {
      if (convDebounce) clearTimeout(convDebounce);
      supabase.removeChannel(channel);
    };
  }, [userId, activeConversationId, fetchContacts, fetchConversations, fetchUnreadCount]);

  return {
    contacts,
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
