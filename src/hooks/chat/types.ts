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
  is_edited: boolean;
  is_forwarded: boolean;
  forwarded_from_name: string | null;
  deleted: boolean;
}

export interface GroupParticipant {
  conversation_id: string;
  user_id: string;
}

export const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  professor: "Professor(a)",
};
