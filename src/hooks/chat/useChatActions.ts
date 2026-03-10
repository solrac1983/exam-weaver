import { useCallback, type MutableRefObject, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatConversation, ChatMessage } from "./types";

interface UseChatActionsParams {
  userId: string;
  activeConversationId: string | null;
  setActiveConversationId: Dispatch<SetStateAction<string | null>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setConversations: Dispatch<SetStateAction<ChatConversation[]>>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
}

export function useChatActions({
  userId,
  activeConversationId,
  setActiveConversationId,
  setMessages,
  setConversations,
  fetchConversations,
  fetchMessages,
}: UseChatActionsParams) {

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
      setConversations((prev) => {
        if (prev.some((c) => c.id === existing.id)) return prev;
        return [existing as ChatConversation, ...prev];
      });
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
      setConversations((prev) => [newConv as ChatConversation, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      fetchConversations();
      return newConv.id;
    }
    return null;
  }, [userId, fetchConversations, fetchMessages, setActiveConversationId, setConversations, setMessages]);

  const createGroupConversation = useCallback(async (name: string, memberIds: string[]) => {
    if (!userId || memberIds.length < 1) return null;

    const { data: newConv } = await supabase
      .from("chat_conversations")
      .insert({
        participant_1: userId,
        participant_2: userId,
        is_group: true,
        group_name: name,
      })
      .select()
      .single();

    if (!newConv) return null;

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
  }, [userId, fetchConversations, setActiveConversationId, setMessages]);

  const openGroupConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    await fetchMessages(conversationId);
  }, [fetchMessages, setActiveConversationId]);

  const addGroupMember = useCallback(async (conversationId: string, memberId: string) => {
    await supabase.from("chat_conversation_participants").insert({
      conversation_id: conversationId,
      user_id: memberId,
    });
    await fetchConversations();
  }, [fetchConversations]);

  const removeGroupMember = useCallback(async (conversationId: string, memberId: string) => {
    await supabase
      .from("chat_conversation_participants")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", memberId);
    await fetchConversations();
  }, [fetchConversations]);

  const renameGroup = useCallback(async (conversationId: string, newName: string) => {
    await supabase
      .from("chat_conversations")
      .update({ group_name: newName })
      .eq("id", conversationId);
    await fetchConversations();
  }, [fetchConversations]);

  const sendMessage = useCallback(async (text?: string, file?: File) => {
    if (!activeConversationId || !userId) {
      console.error("sendMessage: no activeConversationId or userId", { activeConversationId, userId });
      return;
    }

    let attachment_url: string | null = null;
    let attachment_type: string | null = null;
    let attachment_name: string | null = null;

    if (file) {
      if (file.size > 20 * 1024 * 1024) throw new Error("Arquivo muito grande");
      const path = `${activeConversationId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("chat-attachments").upload(path, file);
      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw new Error(uploadError.message);
      }
      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      attachment_url = urlData.publicUrl;
      attachment_type = file.type.startsWith("image/") ? "image"
        : file.type.startsWith("audio/") ? "audio"
        : file.type === "application/pdf" ? "pdf"
        : (file.type.includes("word") || file.type.includes("document") || file.type.includes("spreadsheet") || file.type.includes("presentation")) ? "document"
        : "file";
      attachment_name = file.name;
    }

    if (!text && !attachment_url) return;

    const { data: insertedMsg, error: insertError } = await supabase.from("chat_messages").insert({
      conversation_id: activeConversationId,
      sender: userId,
      text: text || null,
      attachment_url,
      attachment_type,
      attachment_name,
    }).select().single();

    if (insertError) {
      console.error("Error inserting chat message:", insertError);
      throw new Error(insertError.message);
    }

    if (insertedMsg) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === insertedMsg.id)) return prev;
        return [...prev, insertedMsg as ChatMessage];
      });
    }

    await supabase
      .from("chat_conversations")
      .update({
        last_message_text: text || (attachment_name ? `📎 ${attachment_name}` : null),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", activeConversationId);

    fetchConversations();
  }, [activeConversationId, userId, fetchConversations, setMessages]);

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    await supabase
      .from("chat_messages")
      .update({ text: newText, is_edited: true })
      .eq("id", messageId)
      .eq("sender", userId);
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, text: newText, is_edited: true } : m));
  }, [userId, setMessages]);

  const deleteMessage = useCallback(async (messageId: string) => {
    await supabase
      .from("chat_messages")
      .update({ deleted: true, text: null, attachment_url: null, attachment_name: null, attachment_type: null })
      .eq("id", messageId)
      .eq("sender", userId);
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted: true, text: null, attachment_url: null } : m));
  }, [userId, setMessages]);

  const forwardMessage = useCallback(async (msg: ChatMessage, targetConversationId: string, senderName: string) => {
    if (!userId) return;
    await supabase.from("chat_messages").insert({
      conversation_id: targetConversationId,
      sender: userId,
      text: msg.text,
      attachment_url: msg.attachment_url,
      attachment_type: msg.attachment_type,
      attachment_name: msg.attachment_name,
      is_forwarded: true,
      forwarded_from_name: senderName,
    });
    await supabase.from("chat_conversations").update({
      last_message_text: msg.text || (msg.attachment_name ? `📎 ${msg.attachment_name}` : "Mensagem encaminhada"),
      last_message_at: new Date().toISOString(),
    }).eq("id", targetConversationId);
    fetchConversations();
  }, [userId, fetchConversations]);

  const forwardMultipleMessages = useCallback(async (msgs: ChatMessage[], targetConversationId: string, getSenderName: (id: string) => string) => {
    if (!userId || msgs.length === 0) return;
    const sorted = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const rows = sorted.map((msg) => ({
      conversation_id: targetConversationId,
      sender: userId,
      text: msg.text,
      attachment_url: msg.attachment_url,
      attachment_type: msg.attachment_type,
      attachment_name: msg.attachment_name,
      is_forwarded: true,
      forwarded_from_name: getSenderName(msg.sender),
    }));
    await supabase.from("chat_messages").insert(rows);
    const last = sorted[sorted.length - 1];
    await supabase.from("chat_conversations").update({
      last_message_text: last.text || (last.attachment_name ? `📎 ${last.attachment_name}` : "Mensagem encaminhada"),
      last_message_at: new Date().toISOString(),
    }).eq("id", targetConversationId);
    fetchConversations();
  }, [userId, fetchConversations]);

  return {
    openConversation,
    createGroupConversation,
    openGroupConversation,
    addGroupMember,
    removeGroupMember,
    renameGroup,
    sendMessage,
    editMessage,
    deleteMessage,
    forwardMessage,
  };
}
