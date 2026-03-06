import { useState, useRef, useEffect, useCallback } from "react";
import { useChat, ChatMessage, ChatConversation, UserStatus } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Paperclip,
  ImageIcon,
  Mic,
  FileText,
  MessageSquare,
  Search,
  CheckCheck,
  ChevronDown,
  File,
  Download,
  X,
  Phone,
  Video,
  MoreVertical,
  Users,
  Plus,
  Pencil,
  Trash2,
  Forward,
  Ban,
  MessageCirclePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const statusConfig: Record<UserStatus, { label: string; color: string; dotClass: string }> = {
  online: { label: "Online", color: "hsl(var(--success))", dotClass: "bg-success" },
  busy: { label: "Ocupado", color: "hsl(var(--warning))", dotClass: "bg-warning" },
  offline: { label: "Offline", color: "hsl(var(--muted-foreground))", dotClass: "bg-muted-foreground" },
};

function StatusDot({ status, size = "sm" }: { status: UserStatus; size?: "sm" | "md" }) {
  const s = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return <span className={cn("rounded-full border-2 border-background block flex-shrink-0", statusConfig[status].dotClass, s)} />;
}

function formatMessageDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM/yyyy");
}

function MessageCheckmarks({ msg, userId }: { msg: ChatMessage; userId: string }) {
  if (msg.sender !== userId) return null;
  return <CheckCheck className={cn("h-3.5 w-3.5 flex-shrink-0", msg.read ? "text-success" : "text-primary-foreground/40")} />;
}

function getFileIcon(type: string | null) {
  switch (type) {
    case "pdf": return <FileText className="h-5 w-5 text-destructive" />;
    case "document": return <FileText className="h-5 w-5 text-primary" />;
    default: return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

export default function ChatPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const {
    contacts,
    conversations,
    messages,
    activeConversationId,
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
    loading,
    myStatus,
    updateMyStatus,
    contactStatuses,
    groupParticipants,
    unreadByConversation,
    typingUsers,
    sendTypingEvent,
  } = useChat();

  const [text, setText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [sending, setSending] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardingMsg, setForwardingMsg] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [groupName, setGroupName] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [newChatSearch, setNewChatSearch] = useState("");
  const [forwardSearch, setForwardSearch] = useState("");
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [msgSearchTerm, setMsgSearchTerm] = useState("");
  const [msgSearchIdx, setMsgSearchIdx] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgSearchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTypingRef = useRef(0);
  const [longPressMsg, setLongPressMsg] = useState<ChatMessage | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback((msg: ChatMessage) => {
    longPressTimerRef.current = setTimeout(() => {
      setLongPressMsg(msg);
      longPressTimerRef.current = null;
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const throttledTypingEvent = useCallback((convId: string) => {
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;
    sendTypingEvent(convId);
  }, [sendTypingEvent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => { if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); };
  }, []);

  const getContactName = (id: string) => contacts.find((c) => c.id === id)?.name ?? "Usuário";
  const getContactRole = (id: string) => contacts.find((c) => c.id === id)?.role ?? "";

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const isGroupConv = activeConv?.is_group ?? false;

  const activeOtherId = activeConversationId && activeConv && !isGroupConv
    ? (activeConv.participant_1 === userId ? activeConv.participant_2 : activeConv.participant_1)
    : null;

  // Track the partner ID independently to avoid race conditions with conversations state
  const [activePartnerIdState, setActivePartnerIdState] = useState<string | null>(null);
  const resolvedOtherId = activeOtherId || activePartnerIdState;

  const filteredContacts = contacts.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const groupConversations = conversations.filter((c) => c.is_group && (c.group_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      if (editingMsg) {
        await editMessage(editingMsg.id, text.trim());
        setEditingMsg(null);
        setText("");
      } else {
        await sendMessage(text.trim());
        setText("");
      }
    }
    catch { toast.error("Erro ao enviar mensagem"); }
    finally { setSending(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Arquivo muito grande. Máximo: 20MB"); e.target.value = ""; return; }
    setSending(true);
    try { await sendMessage(undefined, file); toast.success(`${file.name} enviado!`); }
    catch { toast.error("Erro ao enviar arquivo"); }
    finally { setSending(false); e.target.value = ""; }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new window.File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        setSending(true);
        try { await sendMessage(undefined, file); toast.success("Áudio enviado!"); }
        catch { toast.error("Erro ao enviar áudio"); }
        finally { setSending(false); }
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch { toast.error("Permissão de microfone negada"); }
  };

  const handleStopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setRecordingTime(0);
  };

  const handleCancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onstop = () => {};
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setMediaRecorder(null);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setRecordingTime(0);
  };

  const formatRecordingTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 1) {
      toast.error("Defina um nome e selecione pelo menos 1 participante");
      return;
    }
    const id = await createGroupConversation(groupName.trim(), selectedMembers);
    if (id) {
      toast.success("Grupo criado!");
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMembers([]);
      setMemberSearch("");
    } else { toast.error("Erro ao criar grupo"); }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsg(msg);
    setText(msg.text || "");
  };

  const handleCancelEdit = () => {
    setEditingMsg(null);
    setText("");
  };

  const handleDelete = async (msg: ChatMessage) => {
    await deleteMessage(msg.id);
    toast.success("Mensagem excluída");
  };

  const handleForward = (msg: ChatMessage) => {
    setForwardingMsg(msg);
    setForwardSearch("");
    setShowForwardDialog(true);
  };

  const handleForwardTo = async (targetConvId: string) => {
    if (!forwardingMsg) return;
    const senderName = getContactName(forwardingMsg.sender);
    await forwardMessage(forwardingMsg, targetConvId, senderName);
    setShowForwardDialog(false);
    setForwardingMsg(null);
    toast.success("Mensagem encaminhada!");
  };

  const handleNewChat = async (contactId: string) => {
    setShowNewChat(false);
    setNewChatSearch("");
    setActivePartnerIdState(contactId);
    await openConversation(contactId);
  };

  const renderAttachment = (msg: ChatMessage) => {
    if (!msg.attachment_url) return null;
    const isMine = msg.sender === userId;
    if (msg.attachment_type === "image") {
      return (
        <img
          src={msg.attachment_url}
          alt={msg.attachment_name || "imagem"}
          className="max-w-[260px] rounded-xl mt-1.5 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
          onClick={() => window.open(msg.attachment_url!, "_blank")}
          loading="lazy"
        />
      );
    }
    if (msg.attachment_type === "audio") {
      return (
        <div className="mt-1.5">
          <audio controls className="max-w-[280px] h-10" preload="metadata">
            <source src={msg.attachment_url} type="audio/webm" />
            <source src={msg.attachment_url} />
          </audio>
        </div>
      );
    }
    return (
      <a href={msg.attachment_url} target="_blank" rel="noreferrer"
        className={cn("flex items-center gap-3 mt-1.5 p-2.5 rounded-xl transition-colors border",
          isMine ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20" : "bg-background/60 border-border hover:bg-background"
        )}>
        {getFileIcon(msg.attachment_type)}
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-medium truncate", isMine ? "text-primary-foreground" : "text-foreground")}>{msg.attachment_name || "Arquivo"}</p>
          <p className={cn("text-[10px]", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
            {msg.attachment_type === "pdf" ? "PDF" : msg.attachment_type === "document" ? "Documento" : "Arquivo"}
          </p>
        </div>
        <Download className={cn("h-4 w-4 flex-shrink-0", isMine ? "text-primary-foreground/60" : "text-muted-foreground")} />
      </a>
    );
  };

  // Message search results
  const msgSearchResults = msgSearchTerm.trim()
    ? messages.filter((m) => !m.deleted && m.text?.toLowerCase().includes(msgSearchTerm.toLowerCase()))
    : [];

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "ring-offset-2");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2"), 2000);
    }
  };

  useEffect(() => {
    if (msgSearchResults.length > 0 && msgSearchIdx < msgSearchResults.length) {
      scrollToMessage(msgSearchResults[msgSearchIdx].id);
    }
  }, [msgSearchIdx, msgSearchResults.length, msgSearchTerm]);

  // Reset search when conversation changes
  useEffect(() => {
    setMsgSearchOpen(false);
    setMsgSearchTerm("");
    setMsgSearchIdx(0);
  }, [activeConversationId]);

  // Group messages by date
  let lastDate = "";
  const groupedMessages: { type: "date" | "msg"; date?: string; msg?: ChatMessage }[] = [];
  messages.forEach((msg) => {
    const d = formatMessageDate(msg.created_at);
    if (d !== lastDate) { groupedMessages.push({ type: "date", date: d }); lastDate = d; }
    groupedMessages.push({ type: "msg", msg });
  });

  const activeGroupMembers = isGroupConv && activeConversationId
    ? (groupParticipants[activeConversationId] ?? []).filter((id) => id !== userId)
    : [];

  // Conversations for forward dialog
  const forwardableConversations = conversations.filter((c) => {
    if (c.is_group) return (c.group_name ?? "").toLowerCase().includes(forwardSearch.toLowerCase());
    const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1;
    return getContactName(otherId).toLowerCase().includes(forwardSearch.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Chat</h1>
          <p className="text-xs text-muted-foreground">Comunicação entre professores e coordenação</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 rounded-full h-8 px-3" onClick={() => { setShowNewChat(true); setNewChatSearch(""); }}>
            <MessageCirclePlus className="h-3.5 w-3.5" />
            <span className="text-xs">Nova Conversa</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-full h-8 px-3" onClick={() => setShowCreateGroup(true)}>
            <Users className="h-3.5 w-3.5" />
            <span className="text-xs">Novo Grupo</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-full h-8 px-3">
                <StatusDot status={myStatus} />
                <span className="text-xs font-medium">{statusConfig[myStatus].label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["online", "busy", "offline"] as UserStatus[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => updateMyStatus(s)} className="gap-2">
                  <StatusDot status={s} /><span>{statusConfig[s].label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 rounded-2xl border bg-card overflow-hidden shadow-lg min-h-0">
        {/* Sidebar */}
        <div className="w-80 border-r flex flex-col bg-card">
          <div className="p-3 border-b bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar contato ou grupo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm bg-background/80 rounded-xl border-0 focus-visible:ring-1" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {groupConversations.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Grupos</p>
                  {groupConversations.map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    const memberCount = (groupParticipants[conv.id] ?? []).length;
                    const unreadN = unreadByConversation[conv.id] ?? 0;
                    return (
                      <button key={conv.id} onClick={() => openGroupConversation(conv.id)}
                        className={cn("w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200",
                          isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted/60")}>
                        <Avatar className="h-11 w-11 flex-shrink-0">
                          <AvatarFallback className={cn("text-xs font-bold", isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-accent text-accent-foreground")}>
                            <Users className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={cn("text-sm font-semibold truncate", isActive ? "text-primary-foreground" : "text-foreground")}>{conv.group_name}</p>
                            {conv.last_message_at && (
                              <span className={cn("text-[10px] flex-shrink-0 ml-2", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                {isToday(new Date(conv.last_message_at)) ? format(new Date(conv.last_message_at), "HH:mm") : format(new Date(conv.last_message_at), "dd/MM")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={cn("text-[11px] truncate mt-0.5 flex-1", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                              {conv.last_message_text || <span className="italic">{memberCount} participantes</span>}
                            </p>
                            {unreadN > 0 && !isActive && (
                              <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                                {unreadN > 99 ? "99+" : unreadN}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {filteredContacts.length > 0 && (
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Contatos</p>
              )}
              {filteredContacts.map((contact) => {
                const conv = conversations.find(
                  (c) => !c.is_group && ((c.participant_1 === userId && c.participant_2 === contact.id) || (c.participant_1 === contact.id && c.participant_2 === userId))
                );
                const isActive = conv?.id === activeConversationId;
                const cStatus = contactStatuses[contact.id] || "offline";
                const contactUnread = conv ? (unreadByConversation[conv.id] ?? 0) : 0;
                return (
                  <button key={contact.id} onClick={() => { setActivePartnerIdState(contact.id); openConversation(contact.id); }}
                    className={cn("w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200",
                      isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted/60")}>
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className={cn("text-xs font-bold", isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary")}>
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5"><StatusDot status={cStatus} /></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn("text-sm font-semibold truncate", isActive ? "text-primary-foreground" : "text-foreground")}>{contact.name}</p>
                        {conv?.last_message_at && (
                          <span className={cn("text-[10px] flex-shrink-0 ml-2", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {isToday(new Date(conv.last_message_at)) ? format(new Date(conv.last_message_at), "HH:mm") : format(new Date(conv.last_message_at), "dd/MM")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={cn("text-[11px] truncate mt-0.5 flex-1", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {conv?.last_message_text || <span className="italic">{statusConfig[cStatus].label} · {contact.role}</span>}
                        </p>
                        {contactUnread > 0 && !isActive && (
                          <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                            {contactUnread > 99 ? "99+" : contactUnread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredContacts.length === 0 && groupConversations.length === 0 && (
                <div className="text-center py-10">
                  <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhum contato ou grupo encontrado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        {(activeConversationId || resolvedOtherId) && (resolvedOtherId || isGroupConv) ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat Header */}
            <div className="h-16 border-b flex items-center justify-between px-5 bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {isGroupConv ? <Users className="h-5 w-5" /> : getInitials(getContactName(resolvedOtherId!))}
                    </AvatarFallback>
                  </Avatar>
                  {!isGroupConv && resolvedOtherId && (
                    <span className="absolute -bottom-0.5 -right-0.5"><StatusDot status={contactStatuses[resolvedOtherId] || "offline"} /></span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{isGroupConv ? activeConv?.group_name : getContactName(resolvedOtherId!)}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    {isGroupConv ? (
                      <span>{activeGroupMembers.map((id) => getContactName(id)).join(", ")}{activeGroupMembers.length > 0 ? " e você" : "Você"}</span>
                    ) : (
                      <>
                        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", statusConfig[contactStatuses[resolvedOtherId!] || "offline"].dotClass)} />
                        {statusConfig[contactStatuses[resolvedOtherId!] || "offline"].label} · {getContactRole(resolvedOtherId!)}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-full", msgSearchOpen ? "text-primary bg-primary/10" : "text-muted-foreground")}
                  onClick={() => { setMsgSearchOpen((v) => !v); setMsgSearchTerm(""); setMsgSearchIdx(0); setTimeout(() => msgSearchInputRef.current?.focus(), 100); }}>
                  <Search className="h-4 w-4" />
                </Button>
                {!isGroupConv && (
                  <>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-full"><Phone className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-full"><Video className="h-4 w-4" /></Button>
                  </>
                )}
                {isGroupConv ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditGroupName(activeConv?.group_name ?? ""); setShowManageMembers(true); }} className="gap-2">
                        <Users className="h-4 w-4" /> Gerenciar membros
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                )}
              </div>
            </div>

            {/* Message Search Bar */}
            {msgSearchOpen && (
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  ref={msgSearchInputRef}
                  placeholder="Buscar na conversa..."
                  value={msgSearchTerm}
                  onChange={(e) => { setMsgSearchTerm(e.target.value); setMsgSearchIdx(0); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && msgSearchResults.length > 0) {
                      setMsgSearchIdx((i) => (i + 1) % msgSearchResults.length);
                    } else if (e.key === "Escape") {
                      setMsgSearchOpen(false); setMsgSearchTerm("");
                    }
                  }}
                  className="h-8 text-sm bg-background/80 rounded-lg border-0 focus-visible:ring-1 flex-1"
                />
                {msgSearchTerm && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {msgSearchResults.length > 0 ? `${msgSearchIdx + 1}/${msgSearchResults.length}` : "0 resultados"}
                  </span>
                )}
                {msgSearchResults.length > 1 && (
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setMsgSearchIdx((i) => (i - 1 + msgSearchResults.length) % msgSearchResults.length)}>
                      <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setMsgSearchIdx((i) => (i + 1) % msgSearchResults.length)}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => { setMsgSearchOpen(false); setMsgSearchTerm(""); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Messages - WhatsApp-style patterned background */}
            <ScrollArea className="flex-1 min-h-0 bg-accent/20 relative">
              <div className="absolute inset-0 pointer-events-none opacity-[0.04]" aria-hidden="true"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cdefs%3E%3Cstyle%3E.i%7Bfill:currentColor;opacity:.5%7D%3C/style%3E%3C/defs%3E%3Cg fill='%23888'%3E%3Cpath d='M20 10c0 5.5-4.5 10-10 10S0 15.5 0 10 4.5 0 10 0s10 4.5 10 10zm-3 0a7 7 0 10-14 0 7 7 0 0014 0zM12 8l-4 4-2-2' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3Cpath d='M60 30a4 4 0 01-4 4H44a4 4 0 01-4-4V18a4 4 0 014-4h12a4 4 0 014 4v12zm-3-9l-4-3-3 2-2-1-3 4v5h12V21z'/%3E%3Ccircle cx='48' cy='20' r='2'/%3E%3Cpath d='M100 5v6h-3V5h-6V2h6V-4h3v6h6v3h-6zM140 20c0 1.1-.9 2-2 2h-16c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2h3l2-3h6l2 3h3c1.1 0 2 .9 2 2v12zm-10-2a5 5 0 100-10 5 5 0 000 10z'/%3E%3Cpath d='M170 8h10v2h-10v10h-2V10h-10V8h10V-2h2v10zM25 60a8 8 0 01-8 8H9a8 8 0 01-8-8v-4a8 8 0 018-8h8a8 8 0 018 8v4zm-4-4v-1H5v1l3 5h1V57h2v4h1l3-5zm-12 0h8v-3H9v3z'/%3E%3Cpath d='M70 55l-5 8H55l-5-8 5-8h10l5 8zm-5 0a5 5 0 10-10 0 5 5 0 0010 0z'/%3E%3Cpath d='M110 48h6v2h-6v6h-2v-6h-6v-2h6v-6h2v6zM150 58a7 7 0 01-7 7h-6a7 7 0 01-7-7v-8a7 7 0 017-7h6a7 7 0 017 7v8zm-4-8a3 3 0 10-6 0v8a3 3 0 106 0v-8z'/%3E%3Cpath d='M185 45c3 0 5 2 5 5v10c0 3-2 5-5 5h-10c-3 0-5-2-5-5V50c0-3 2-5 5-5h10zm-2 5h-6v3h4v2h-4v3h6v2h-8V48h8v2z'/%3E%3Cpath d='M20 90l8 5-8 5V90zM55 85h14c1.7 0 3 1.3 3 3v14c0 1.7-1.3 3-3 3H55c-1.7 0-3-1.3-3-3V88c0-1.7 1.3-3 3-3zm1 4v5l4-2.5L56 89zm0 7l4-2.5L64 96v-3l-4-2.5L56 93v3z'/%3E%3Cpath d='M105 88a7 7 0 11-14 0 7 7 0 0114 0zm-7 12a7 7 0 110-14 7 7 0 010 14zm-4-10h8v-1h-8v1zm1 3h6v-1h-6v1z'/%3E%3Ccircle cx='148' cy='92' r='8' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3Cpath d='M145 92l2 2 4-4' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3Cpath d='M182 85a3 3 0 013 3v14a3 3 0 01-3 3h-14a3 3 0 01-3-3V88a3 3 0 013-3h14zm-7 4l-5 5h3v4h4v-4h3l-5-5z'/%3E%3Cpath d='M15 130c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8zm8-4c-1.1 0-2 .9-2 2v4l3 2 1-1.7-2-1.3v-3c0-1.1-.9-2-2-2z'/%3E%3Cpath d='M55 125h10v2H55v8h-2v-8h-10v-2h10v-8h2v8zM100 120h12c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-12c-1.1 0-2-.9-2-2v-12c0-1.1.9-2 2-2zm1 3v10h10v-10h-10zm2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2z'/%3E%3Cpath d='M148 120a8 8 0 110 16 8 8 0 010-16zm0 3a5 5 0 100 10 5 5 0 000-10zm-2 4h4v1h-4v-1z'/%3E%3Cpath d='M180 118l8 14h-16l8-14zm0 4l-4 7h8l-4-7z'/%3E%3Cpath d='M10 165a5 5 0 015-5h10a5 5 0 015 5v5a5 5 0 01-5 5H15a5 5 0 01-5-5v-5zm7 0v8h3v-3h3v-2h-3v-1h3v-2h-6z'/%3E%3Ccircle cx='60' cy='170' r='8' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3Cpath d='M57 170h6M60 167v6' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3Cpath d='M98 160h12l2 3v12l-2 3H98l-2-3v-12l2-3zm6 4a4 4 0 100 8 4 4 0 000-8z'/%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '200px 200px',
                }}
              />
              <div className="px-5 py-4 space-y-1 max-w-4xl mx-auto relative">
                {groupedMessages.map((item, idx) => {
                  if (item.type === "date") {
                    return (
                      <div key={`date-${idx}`} className="flex justify-center py-3">
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted/80 px-4 py-1 rounded-full uppercase tracking-wider">{item.date}</span>
                      </div>
                    );
                  }
                  const msg = item.msg!;
                  const isMine = msg.sender === userId;

                  // Deleted message
                  if (msg.deleted) {
                    return (
                      <div key={msg.id} className={cn("flex mb-1", isMine ? "justify-end" : "justify-start")}>
                        <div className="max-w-[65%] px-4 py-2 text-sm rounded-2xl bg-muted/40 border border-border/50">
                          <p className="text-muted-foreground italic flex items-center gap-1.5">
                            <Ban className="h-3.5 w-3.5" /> Mensagem excluída
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} id={`msg-${msg.id}`} className={cn("flex mb-1 group/msg transition-all duration-300 rounded-xl", isMine ? "justify-end" : "justify-start")}>
                      {/* Message actions - appears on hover */}
                      {isMine && (
                        <div className="flex items-center mr-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground">
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[140px]">
                              {msg.text && (
                                <DropdownMenuItem onClick={() => handleStartEdit(msg)} className="gap-2 text-xs">
                                  <Pencil className="h-3.5 w-3.5" /> Editar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleForward(msg)} className="gap-2 text-xs">
                                <Forward className="h-3.5 w-3.5" /> Encaminhar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(msg)} className="gap-2 text-xs text-destructive focus:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      <div
                        onTouchStart={() => handleTouchStart(msg)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                        className={cn(
                        "max-w-[65%] px-4 py-2.5 text-sm relative transition-shadow select-none",
                        isMine ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-md" : "bg-card text-foreground rounded-2xl rounded-bl-md shadow-sm border border-border/50"
                      )}>
                        {/* Forwarded indicator */}
                        {msg.is_forwarded && (
                          <p className={cn("text-[10px] italic mb-1 flex items-center gap-1",
                            isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
                            <Forward className="h-3 w-3" /> Encaminhada{msg.forwarded_from_name ? ` de ${msg.forwarded_from_name}` : ""}
                          </p>
                        )}
                        {/* Sender name in groups */}
                        {isGroupConv && !isMine && (
                          <p className="text-[11px] font-bold text-primary mb-0.5">{getContactName(msg.sender)}</p>
                        )}
                        {msg.text && <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.text}</p>}
                        {renderAttachment(msg)}
                        <div className={cn("flex items-center justify-end gap-1 mt-1", isMine ? "text-primary-foreground/50" : "text-muted-foreground/70")}>
                          {msg.is_edited && <span className="text-[9px] italic mr-0.5">editada</span>}
                          <span className="text-[10px]">{format(new Date(msg.created_at), "HH:mm")}</span>
                          <MessageCheckmarks msg={msg} userId={userId} />
                        </div>
                      </div>

                      {/* Actions for received messages */}
                      {!isMine && (
                        <div className="flex items-center ml-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground">
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[140px]">
                              <DropdownMenuItem onClick={() => handleForward(msg)} className="gap-2 text-xs">
                                <Forward className="h-3.5 w-3.5" /> Encaminhar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                )}
                {/* Typing indicator */}
                {(() => {
                  const typingNames = Object.keys(typingUsers)
                    .filter((uid) => uid !== userId)
                    .map((uid) => getContactName(uid));
                  if (typingNames.length === 0) return null;
                  const label = typingNames.length === 1
                    ? `${typingNames[0]} está digitando`
                    : `${typingNames.join(", ")} estão digitando`;
                  return (
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className="flex gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-[11px] text-muted-foreground italic">{label}...</span>
                    </div>
                  );
                })()}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-3 bg-card/80 backdrop-blur-sm">
              <div className="max-w-4xl mx-auto">
                {/* Edit indicator */}
                {editingMsg && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-accent/50 rounded-xl border border-accent">
                    <Pencil className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <p className="text-xs text-foreground truncate flex-1">Editando: {editingMsg.text}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handleCancelEdit}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {isRecording ? (
                  <div className="flex items-center gap-3 bg-destructive/10 rounded-2xl px-4 py-3 border border-destructive/20">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive rounded-full" onClick={handleCancelRecording}>
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                      <span className="text-sm font-mono font-medium text-destructive">{formatRecordingTime(recordingTime)}</span>
                      <div className="flex-1 flex items-center gap-0.5">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} className="h-3 w-1 rounded-full bg-destructive/40" style={{ height: `${Math.random() * 16 + 6}px` }} />
                        ))}
                      </div>
                    </div>
                    <Button size="sm" className="rounded-full px-4 h-9 bg-primary" onClick={handleStopRecording}>
                      <Send className="h-4 w-4 mr-1" /> Enviar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" className="hidden" onChange={handleFileUpload} />
                    {!editingMsg && (
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary rounded-full transition-colors" onClick={() => imageInputRef.current?.click()} disabled={sending} title="Enviar imagem">
                          <ImageIcon className="h-[18px] w-[18px]" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary rounded-full transition-colors" onClick={() => fileInputRef.current?.click()} disabled={sending} title="Anexar arquivo">
                          <Paperclip className="h-[18px] w-[18px]" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary rounded-full transition-colors" onClick={handleStartRecording} disabled={sending} title="Gravar áudio">
                          <Mic className="h-[18px] w-[18px]" />
                        </Button>
                      </div>
                    )}
                    <div className="flex-1 relative">
                      <Input
                        placeholder={editingMsg ? "Editar mensagem..." : "Digite sua mensagem..."}
                        value={text}
                        onChange={(e) => { setText(e.target.value); if (activeConversationId) throttledTypingEvent(activeConversationId); }}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        className="pr-3 h-10 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                        disabled={sending}
                      />
                    </div>
                    <Button
                      size="icon"
                      className={cn("h-10 w-10 rounded-full flex-shrink-0 transition-all shadow-md",
                        text.trim() ? "bg-primary hover:bg-primary/90 scale-100" : "bg-muted text-muted-foreground scale-95 shadow-none")}
                      onClick={handleSend}
                      disabled={!text.trim() || sending}
                    >
                      {editingMsg ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center space-y-4 px-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <MessageSquare className="h-10 w-10 text-primary/50" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Suas conversas</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  Selecione um contato ou grupo, ou inicie uma nova conversa.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" className="gap-2 rounded-full" onClick={() => { setShowNewChat(true); setNewChatSearch(""); }}>
                  <MessageCirclePlus className="h-4 w-4" /> Nova Conversa
                </Button>
                <Button variant="outline" className="gap-2 rounded-full" onClick={() => setShowCreateGroup(true)}>
                  <Plus className="h-4 w-4" /> Criar Grupo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCirclePlus className="h-5 w-5 text-primary" />
              Nova Conversa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar contato..." value={newChatSearch} onChange={(e) => setNewChatSearch(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <ScrollArea className="h-64 border rounded-xl">
              <div className="p-1.5 space-y-0.5">
                {contacts
                  .filter((c) => c.name.toLowerCase().includes(newChatSearch.toLowerCase()))
                  .map((c) => (
                    <button key={c.id} onClick={() => handleNewChat(c.id)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/60 transition-colors">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{getInitials(c.name)}</AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5"><StatusDot status={contactStatuses[c.id] || "offline"} /></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.role}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forward Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Forward className="h-5 w-5 text-primary" />
              Encaminhar mensagem
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar conversa..." value={forwardSearch} onChange={(e) => setForwardSearch(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <ScrollArea className="h-64 border rounded-xl">
              <div className="p-1.5 space-y-0.5">
                {forwardableConversations.map((conv) => {
                  const isGroup = conv.is_group;
                  const otherId = !isGroup ? (conv.participant_1 === userId ? conv.participant_2 : conv.participant_1) : null;
                  const name = isGroup ? conv.group_name : getContactName(otherId!);
                  return (
                    <button key={conv.id} onClick={() => handleForwardTo(conv.id)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/60 transition-colors">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                          {isGroup ? <Users className="h-4 w-4" /> : getInitials(name!)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-[11px] text-muted-foreground">{isGroup ? "Grupo" : "Conversa direta"}</p>
                      </div>
                      <Forward className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
                {forwardableConversations.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Nenhuma conversa encontrada</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Criar Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do grupo</label>
              <Input placeholder="Ex: Coordenação Matemática" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Participantes {selectedMembers.length > 0 && <Badge variant="secondary" className="ml-2">{selectedMembers.length}</Badge>}
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar contato..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="pl-9 rounded-xl" />
              </div>
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedMembers.map((id) => (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1 rounded-full">
                      {getContactName(id)}
                      <button onClick={() => toggleMember(id)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="h-48 border rounded-xl">
                <div className="p-1.5 space-y-0.5">
                  {contacts.filter((c) => c.name.toLowerCase().includes(memberSearch.toLowerCase())).map((c) => (
                    <button key={c.id} onClick={() => toggleMember(c.id)}
                      className={cn("w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                        selectedMembers.includes(c.id) ? "bg-primary/10" : "hover:bg-muted/60")}>
                      <Checkbox checked={selectedMembers.includes(c.id)} className="pointer-events-none" />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{getInitials(c.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGroup(false)}>Cancelar</Button>
            <Button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedMembers.length < 1} className="gap-2">
              <Users className="h-4 w-4" /> Criar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Group Members Dialog */}
      <Dialog open={showManageMembers} onOpenChange={setShowManageMembers}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Gerenciar Grupo</DialogTitle>
          </DialogHeader>
          {activeConversationId && isGroupConv && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do grupo</label>
                <div className="flex gap-2">
                  <Input value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} className="rounded-xl" />
                  <Button size="sm" disabled={!editGroupName.trim() || editGroupName === activeConv?.group_name}
                    onClick={async () => { await renameGroup(activeConversationId, editGroupName.trim()); toast.success("Nome atualizado!"); }}>
                    Salvar
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Membros atuais <Badge variant="secondary" className="ml-2">{(groupParticipants[activeConversationId] ?? []).length}</Badge>
                </label>
                <ScrollArea className="h-40 border rounded-xl">
                  <div className="p-1.5 space-y-0.5">
                    {(groupParticipants[activeConversationId] ?? []).map((memberId) => {
                      const isMe = memberId === userId;
                      return (
                        <div key={memberId} className="flex items-center gap-3 rounded-lg px-3 py-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{getInitials(getContactName(memberId))}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{isMe ? "Você" : getContactName(memberId)}</p>
                            <p className="text-[11px] text-muted-foreground">{getContactRole(memberId)}</p>
                          </div>
                          {!isMe && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                              onClick={async () => { await removeGroupMember(activeConversationId, memberId); toast.success("Membro removido"); }}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Adicionar membro</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar contato..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="pl-9 rounded-xl" />
                </div>
                <ScrollArea className="h-32 border rounded-xl">
                  <div className="p-1.5 space-y-0.5">
                    {contacts
                      .filter((c) => c.name.toLowerCase().includes(memberSearch.toLowerCase()) && !(groupParticipants[activeConversationId] ?? []).includes(c.id))
                      .map((c) => (
                        <button key={c.id}
                          onClick={async () => { await addGroupMember(activeConversationId, c.id); toast.success(`${c.name} adicionado ao grupo`); }}
                          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted/60 transition-colors">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{getInitials(c.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground">{c.role}</p>
                          </div>
                          <Plus className="h-4 w-4 text-primary" />
                        </button>
                      ))}
                    {contacts.filter((c) => c.name.toLowerCase().includes(memberSearch.toLowerCase()) && !(groupParticipants[activeConversationId] ?? []).includes(c.id)).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Todos os contatos já são membros</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setShowManageMembers(false); setMemberSearch(""); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Long Press Context Menu (Mobile) */}
      <Dialog open={!!longPressMsg} onOpenChange={(open) => { if (!open) setLongPressMsg(null); }}>
        <DialogContent className="sm:max-w-[280px] p-0 rounded-2xl overflow-hidden">
          <div className="py-2">
            {longPressMsg && longPressMsg.sender === userId && (
              <>
                {longPressMsg.text && (
                  <button
                    onClick={() => { handleStartEdit(longPressMsg); setLongPressMsg(null); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/60 transition-colors text-foreground"
                  >
                    <Pencil className="h-4 w-4 text-primary" /> Editar
                  </button>
                )}
                <button
                  onClick={() => { handleForward(longPressMsg); setLongPressMsg(null); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/60 transition-colors text-foreground"
                >
                  <Forward className="h-4 w-4 text-muted-foreground" /> Encaminhar
                </button>
                <div className="mx-4 border-t border-border" />
                <button
                  onClick={() => { handleDelete(longPressMsg); setLongPressMsg(null); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm hover:bg-destructive/10 transition-colors text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              </>
            )}
            {longPressMsg && longPressMsg.sender !== userId && (
              <button
                onClick={() => { handleForward(longPressMsg); setLongPressMsg(null); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/60 transition-colors text-foreground"
              >
                <Forward className="h-4 w-4 text-muted-foreground" /> Encaminhar
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
