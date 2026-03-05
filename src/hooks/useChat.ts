import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Audio helpers ──────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
let _audioResumed = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return _audioCtx;
  } catch { return null; }
}

function ensureAudioResumed() {
  if (_audioResumed) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") ctx.resume();
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
    if (ctx.state === "suspended") ctx.resume();
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
  } catch {}
}

function showDesktopNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") new Notification(title, { body, icon: "/favicon.ico" });
    });
  }
}

// ── Types ──────────────────────────────────────────────────
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
  is_group: boolean;
  group_name: string | null;
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

export interface GroupParticipant {
  conversation_id: string;
  user_id: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  professor: "Professor(a)",
};

// ── Hook ───────────────────────────────────────────────────
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
  const [groupParticipants, setGroupParticipants] = useState<Record<string, string[]>>({});
  const presenceChannelRef = useState<ReturnType<typeof supabase.channel> | null>(null);

  const updateMyStatus = useCallback((status: UserStatus) => {
    setMyStatus(status);
    const channel = presenceChannelRef[0];
    if (channel) channel.track({ user_id: userId, status });
  }, [userId, presenceChannelRef]);

  // Presence
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
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ user_id: userId, status: myStatus });
      });
    presenceChannelRef[0] = channel;
    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      presenceChannelRef[0] = null;
    };
  }, [userId]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!userId) return;
    let query = supabase.from("profiles").select("id, full_name, email").neq("id", userId).order("full_name");
    if (role !== "super_admin" && profile?.company_id) {
      query = query.eq("company_id", profile.company_id);
    } else if (role !== "super_admin") return;

    const { data } = await query;
    if (!data || data.length === 0) return;

    const userIds = data.map((p) => p.id);
    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
    const roleMap = new Map<string, string>();
    rolesData?.forEach((r) => roleMap.set(r.user_id, r.role));

    setContacts(data.map((p) => ({
      id: p.id,
      name: p.full_name || p.email,
      role: roleLabels[roleMap.get(p.id) ?? "professor"] ?? "Usuário",
    })));
  }, [userId, role, profile?.company_id]);

  // Fetch conversations (including groups)
  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    // Fetch direct conversations
    const { data: directConvs } = await supabase
      .from("chat_conversations")
      .select("*")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    // Fetch group conversation IDs the user participates in
    const { data: participantRows } = await supabase
      .from("chat_conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    const groupIds = participantRows?.map((r) => r.conversation_id) ?? [];
    let groupConvs: any[] = [];
    if (groupIds.length > 0) {
      const { data } = await supabase
        .from("chat_conversations")
        .select("*")
        .in("id", groupIds)
        .eq("is_group", true)
        .order("last_message_at", { ascending: false });
      groupConvs = data ?? [];
    }

    // Merge and deduplicate
    const allMap = new Map<string, ChatConversation>();
    [...(directConvs ?? []), ...groupConvs].forEach((c) => allMap.set(c.id, c as ChatConversation));
    const all = Array.from(allMap.values()).sort(
      (a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
    );
    setConversations(all);

    // Fetch participants for group conversations
    const gIds = all.filter((c) => c.is_group).map((c) => c.id);
    if (gIds.length > 0) {
      const { data: allParts } = await supabase
        .from("chat_conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", gIds);
      const map: Record<string, string[]> = {};
      allParts?.forEach((p) => {
        if (!map[p.conversation_id]) map[p.conversation_id] = [];
        map[p.conversation_id].push(p.user_id);
      });
      setGroupParticipants(map);
    }
  }, [userId]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    // Get all conversation IDs (direct + group)
    const { data: directConvs } = await supabase
      .from("chat_conversations")
      .select("id")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

    const { data: groupParts } = await supabase
      .from("chat_conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    const allIds = new Set<string>();
    directConvs?.forEach((c) => allIds.add(c.id));
    groupParts?.forEach((p) => allIds.add(p.conversation_id));

    if (allIds.size === 0) { setUnreadCount(0); return; }

    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", Array.from(allIds))
      .neq("sender", userId)
      .eq("read", false);
    setUnreadCount(count ?? 0);
  }, [userId]);

  // Fetch messages for a conversation
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

    await supabase
      .from("chat_messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender", userId)
      .eq("read", false);
    fetchUnreadCount();
  }, [userId, fetchUnreadCount]);

  // Open or create 1:1 conversation
  const openConversation = useCallback(async (contactId: string) => {
    if (!userId) return null;
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("is_group", false)
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
      .insert({ participant_1: userId, participant_2: contactId, is_group: false })
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

  // Create group conversation
  const createGroupConversation = useCallback(async (name: string, memberIds: string[]) => {
    if (!userId || memberIds.length < 2) return null;

    const { data: newConv } = await supabase
      .from("chat_conversations")
      .insert({
        participant_1: userId,
        participant_2: userId, // placeholder for groups
        is_group: true,
        group_name: name,
      })
      .select()
      .single();

    if (!newConv) return null;

    // Insert all members (including creator)
    const allMembers = Array.from(new Set([userId, ...memberIds]));
    const rows = allMembers.map((uid) => ({
      conversation_id: newConv.id,
      user_id: uid,
    }));

    await supabase.from("chat_conversation_participants").insert(rows);

    setActiveConversationId(newConv.id);
    setMessages([]);
    await fetchConversations();
    return newConv.id;
  }, [userId, fetchConversations]);

  // Open existing group conversation
  const openGroupConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    await fetchMessages(conversationId);
  }, [fetchMessages]);

  // Send message
  const sendMessage = useCallback(async (text?: string, file?: File) => {
    if (!activeConversationId || !userId) return;

    let attachment_url: string | null = null;
    let attachment_type: string | null = null;
    let attachment_name: string | null = null;

    if (file) {
      if (file.size > 20 * 1024 * 1024) throw new Error("Arquivo muito grande");
      const path = `${activeConversationId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
        attachment_url = urlData.publicUrl;
        attachment_type = file.type.startsWith("image/") ? "image"
          : file.type.startsWith("audio/") ? "audio"
          : file.type === "application/pdf" ? "pdf"
          : (file.type.includes("word") || file.type.includes("document") || file.type.includes("spreadsheet") || file.type.includes("presentation")) ? "document"
          : "file";
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

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  }, []);

  const contactsRef = useRef<ChatContact[]>([]);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  // Realtime
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
          if (newMsg.conversation_id === activeConversationId) {
            setMessages((prev) => [...prev, newMsg]);
            if (newMsg.sender !== userId) {
              supabase.from("chat_messages").update({ read: true }).eq("id", newMsg.id);
            }
          }
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, read: updated.read } : m)));
        }
        debouncedConvRefetch();
      })
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
    createGroupConversation,
    openGroupConversation,
    sendMessage,
    fetchMessages,
    myStatus,
    updateMyStatus,
    contactStatuses,
    groupParticipants,
  };
}
