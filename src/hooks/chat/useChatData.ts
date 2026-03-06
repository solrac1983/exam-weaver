import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatContact, ChatConversation, ChatMessage } from "./types";
import { roleLabels } from "./types";

export function useChatData(userId: string, role: string | undefined, companyId: string | undefined) {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  const [groupParticipants, setGroupParticipants] = useState<Record<string, string[]>>({});

  const fetchContacts = useCallback(async () => {
    if (!userId) return;
    let query = supabase.from("profiles").select("id, full_name, email").neq("id", userId).order("full_name");
    if (role !== "super_admin" && companyId) {
      query = query.eq("company_id", companyId);
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
  }, [userId, role, companyId]);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    const { data: directConvs } = await supabase
      .from("chat_conversations")
      .select("*")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order("last_message_at", { ascending: false });

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

    const allMap = new Map<string, ChatConversation>();
    [...(directConvs ?? []), ...groupConvs].forEach((c) => allMap.set(c.id, c as ChatConversation));
    const all = Array.from(allMap.values()).sort(
      (a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
    );
    setConversations(all);

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

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

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

    if (allIds.size === 0) { setUnreadCount(0); setUnreadByConversation({}); return; }

    const { data: unreadMsgs } = await supabase
      .from("chat_messages")
      .select("conversation_id")
      .in("conversation_id", Array.from(allIds))
      .neq("sender", userId)
      .eq("read", false);

    const perConv: Record<string, number> = {};
    let total = 0;
    unreadMsgs?.forEach((m) => {
      perConv[m.conversation_id] = (perConv[m.conversation_id] || 0) + 1;
      total++;
    });
    setUnreadCount(total);
    setUnreadByConversation(perConv);
  }, [userId]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
    setLoading(false);

    await supabase
      .from("chat_messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender", userId)
      .eq("read", false);
    fetchUnreadCount();
  }, [userId, fetchUnreadCount]);

  return {
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
  };
}
