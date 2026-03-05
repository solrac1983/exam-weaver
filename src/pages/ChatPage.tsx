import { useState, useRef, useEffect } from "react";
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
    sendMessage,
    loading,
    myStatus,
    updateMyStatus,
    contactStatuses,
    groupParticipants,
    unreadByConversation,
  } = useChat();

  const [text, setText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [sending, setSending] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const activeOtherId = activeConversationId && !isGroupConv
    ? (() => {
        if (!activeConv) return null;
        return activeConv.participant_1 === userId ? activeConv.participant_2 : activeConv.participant_1;
      })()
    : null;

  // Build sidebar items: contacts + group conversations
  const filteredContacts = contacts.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const groupConversations = conversations.filter((c) => c.is_group && (c.group_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try { await sendMessage(text.trim()); setText(""); }
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
    } else {
      toast.error("Erro ao criar grupo");
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
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
      <a
        href={msg.attachment_url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "flex items-center gap-3 mt-1.5 p-2.5 rounded-xl transition-colors border",
          isMine ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20" : "bg-background/60 border-border hover:bg-background"
        )}
      >
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

  // Group messages by date
  let lastDate = "";
  const groupedMessages: { type: "date" | "msg"; date?: string; msg?: ChatMessage }[] = [];
  messages.forEach((msg) => {
    const d = formatMessageDate(msg.created_at);
    if (d !== lastDate) { groupedMessages.push({ type: "date", date: d }); lastDate = d; }
    groupedMessages.push({ type: "msg", msg });
  });

  // Get group member names for header
  const activeGroupMembers = isGroupConv && activeConversationId
    ? (groupParticipants[activeConversationId] ?? []).filter((id) => id !== userId)
    : [];

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Chat</h1>
          <p className="text-xs text-muted-foreground">Comunicação entre professores e coordenação</p>
        </div>
        <div className="flex items-center gap-2">
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
                  <StatusDot status={s} />
                  <span>{statusConfig[s].label}</span>
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
              <Input
                placeholder="Buscar contato ou grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm bg-background/80 rounded-xl border-0 focus-visible:ring-1"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {/* Group conversations */}
              {groupConversations.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Grupos</p>
                  {groupConversations.map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    const memberCount = (groupParticipants[conv.id] ?? []).length;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => openGroupConversation(conv.id)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200",
                          isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted/60"
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-11 w-11">
                            <AvatarFallback className={cn("text-xs font-bold", isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-accent text-accent-foreground")}>
                              <Users className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={cn("text-sm font-semibold truncate", isActive ? "text-primary-foreground" : "text-foreground")}>
                              {conv.group_name}
                            </p>
                            {conv.last_message_at && (
                              <span className={cn("text-[10px] flex-shrink-0 ml-2", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                {isToday(new Date(conv.last_message_at)) ? format(new Date(conv.last_message_at), "HH:mm") : format(new Date(conv.last_message_at), "dd/MM")}
                              </span>
                            )}
                          </div>
                          <p className={cn("text-[11px] truncate mt-0.5", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {conv.last_message_text || <span className="italic">{memberCount} participantes</span>}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Direct contacts */}
              {filteredContacts.length > 0 && (
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Contatos</p>
              )}
              {filteredContacts.map((contact) => {
                const conv = conversations.find(
                  (c) => !c.is_group && ((c.participant_1 === userId && c.participant_2 === contact.id) || (c.participant_1 === contact.id && c.participant_2 === userId))
                );
                const isActive = conv?.id === activeConversationId;
                const cStatus = contactStatuses[contact.id] || "offline";
                return (
                  <button
                    key={contact.id}
                    onClick={() => openConversation(contact.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200",
                      isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted/60"
                    )}
                  >
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
                      <p className={cn("text-[11px] truncate mt-0.5", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {conv?.last_message_text || <span className="italic">{statusConfig[cStatus].label} · {contact.role}</span>}
                      </p>
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
        {activeConversationId && (activeOtherId || isGroupConv) ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat Header */}
            <div className="h-16 border-b flex items-center justify-between px-5 bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {isGroupConv ? <Users className="h-5 w-5" /> : getInitials(getContactName(activeOtherId!))}
                    </AvatarFallback>
                  </Avatar>
                  {!isGroupConv && activeOtherId && (
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={contactStatuses[activeOtherId] || "offline"} />
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {isGroupConv ? activeConv?.group_name : getContactName(activeOtherId!)}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    {isGroupConv ? (
                      <span>{activeGroupMembers.map((id) => getContactName(id)).join(", ")}{activeGroupMembers.length > 0 ? " e você" : "Você"}</span>
                    ) : (
                      <>
                        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", statusConfig[contactStatuses[activeOtherId!] || "offline"].dotClass)} />
                        {statusConfig[contactStatuses[activeOtherId!] || "offline"].label} · {getContactRole(activeOtherId!)}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isGroupConv && (
                  <>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-full"><Phone className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-full"><Video className="h-4 w-4" /></Button>
                  </>
                )}
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-full"><MoreVertical className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-5 py-4 space-y-1 max-w-4xl mx-auto">
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
                  return (
                    <div key={msg.id} className={cn("flex mb-1", isMine ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[65%] px-4 py-2.5 text-sm relative group transition-shadow",
                        isMine ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-md" : "bg-muted/80 text-foreground rounded-2xl rounded-bl-md shadow-sm"
                      )}>
                        {/* Show sender name in groups */}
                        {isGroupConv && !isMine && (
                          <p className="text-[11px] font-bold text-primary mb-0.5">{getContactName(msg.sender)}</p>
                        )}
                        {msg.text && <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.text}</p>}
                        {renderAttachment(msg)}
                        <div className={cn("flex items-center justify-end gap-1 mt-1", isMine ? "text-primary-foreground/50" : "text-muted-foreground/70")}>
                          <span className="text-[10px]">{format(new Date(msg.created_at), "HH:mm")}</span>
                          <MessageCheckmarks msg={msg} userId={userId} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-3 bg-card/80 backdrop-blur-sm">
              <div className="max-w-4xl mx-auto">
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
                          <div key={i} className="h-3 w-1 rounded-full bg-destructive/40" style={{ height: `${Math.random() * 16 + 6}px`, animationDelay: `${i * 50}ms` }} />
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
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        className="pr-3 h-10 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                        disabled={sending}
                      />
                    </div>
                    <Button
                      size="icon"
                      className={cn("h-10 w-10 rounded-full flex-shrink-0 transition-all shadow-md", text.trim() ? "bg-primary hover:bg-primary/90 scale-100" : "bg-muted text-muted-foreground scale-95 shadow-none")}
                      onClick={handleSend}
                      disabled={!text.trim() || sending}
                    >
                      <Send className="h-4 w-4" />
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
                  Selecione um contato ou grupo na lista ao lado para iniciar uma conversa.
                </p>
              </div>
              <Button variant="outline" className="gap-2 rounded-full" onClick={() => setShowCreateGroup(true)}>
                <Plus className="h-4 w-4" /> Criar Grupo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Criar Grupo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do grupo</label>
              <Input
                placeholder="Ex: Coordenação Matemática"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Participantes {selectedMembers.length > 0 && <Badge variant="secondary" className="ml-2">{selectedMembers.length}</Badge>}
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contato..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedMembers.map((id) => (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1 rounded-full">
                      {getContactName(id)}
                      <button onClick={() => toggleMember(id)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="h-48 border rounded-xl">
                <div className="p-1.5 space-y-0.5">
                  {contacts
                    .filter((c) => c.name.toLowerCase().includes(memberSearch.toLowerCase()))
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => toggleMember(c.id)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          selectedMembers.includes(c.id) ? "bg-primary/10" : "hover:bg-muted/60"
                        )}
                      >
                        <Checkbox checked={selectedMembers.includes(c.id)} className="pointer-events-none" />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {getInitials(c.name)}
                          </AvatarFallback>
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
    </div>
  );
}
