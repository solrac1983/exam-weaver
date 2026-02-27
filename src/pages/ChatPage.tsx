import { useState, useRef, useEffect } from "react";
import { useChat, ChatMessage, UserStatus, ChatContact } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Paperclip,
  Image,
  Mic,
  MicOff,
  FileText,
  MessageSquare,
  Search,
  CheckCheck,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

const statusConfig: Record<UserStatus, { label: string; color: string; dotClass: string }> = {
  online: { label: "Online", color: "hsl(var(--success))", dotClass: "bg-success" },
  busy: { label: "Ocupado", color: "hsl(var(--warning))", dotClass: "bg-warning" },
  offline: { label: "Offline", color: "hsl(var(--muted-foreground))", dotClass: "bg-muted-foreground" },
};

function StatusDot({ status, size = "sm" }: { status: UserStatus; size?: "sm" | "md" }) {
  const s = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span
      className={cn(
        "rounded-full border-2 border-card block flex-shrink-0",
        statusConfig[status].dotClass,
        s
      )}
    />
  );
}

function formatMessageDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM/yyyy");
}

function MessageCheckmarks({ msg, userId }: { msg: ChatMessage; userId: string }) {
  const isMine = msg.sender === userId;
  if (!isMine) return null;

  if (msg.read) {
    return <CheckCheck className="h-3.5 w-3.5 text-success flex-shrink-0" />;
  }
  return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />;
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
    sendMessage,
    loading,
    myStatus,
    updateMyStatus,
    contactStatuses,
  } = useChat();

  const [text, setText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContactName = (id: string) => contacts.find((c) => c.id === id)?.name ?? id;
  const getContactRole = (id: string) => contacts.find((c) => c.id === id)?.role ?? "";

  const activeOtherId = activeConversationId
    ? (() => {
        const conv = conversations.find((c) => c.id === activeConversationId);
        if (!conv) return null;
        return conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;
      })()
    : null;

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage(text.trim());
    setText("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await sendMessage(undefined, file);
    e.target.value = "";
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        await sendMessage(undefined, file);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      console.error("Mic access denied");
    }
  };

  const handleStopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const renderAttachment = (msg: ChatMessage) => {
    if (!msg.attachment_url) return null;
    if (msg.attachment_type === "image") {
      return (
        <img
          src={msg.attachment_url}
          alt={msg.attachment_name || "imagem"}
          className="max-w-[220px] rounded-lg mt-1.5 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(msg.attachment_url!, "_blank")}
        />
      );
    }
    if (msg.attachment_type === "audio") {
      return (
        <audio controls className="mt-1.5 max-w-[240px]">
          <source src={msg.attachment_url} />
        </audio>
      );
    }
    return (
      <a
        href={msg.attachment_url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 mt-1.5 text-xs hover:underline"
      >
        <FileText className="h-4 w-4" />
        {msg.attachment_name || "Arquivo"}
      </a>
    );
  };

  // Group messages by date
  let lastDate = "";
  const groupedMessages: { type: "date" | "msg"; date?: string; msg?: ChatMessage }[] = [];
  messages.forEach((msg) => {
    const d = formatMessageDate(msg.created_at);
    if (d !== lastDate) {
      groupedMessages.push({ type: "date", date: d });
      lastDate = d;
    }
    groupedMessages.push({ type: "msg", msg });
  });

  return (
    <div className="space-y-4">
      {/* Header with status selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chat</h1>
          <p className="text-sm text-muted-foreground">Comunicação entre professores e coordenação</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
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

      <div className="flex h-[calc(100vh-180px)] rounded-xl border bg-card overflow-hidden shadow-sm">
        {/* Sidebar */}
        <div className="w-80 border-r flex flex-col bg-muted/20">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm bg-background"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1.5 space-y-0.5">
              {filteredContacts.map((contact) => {
                const conv = conversations.find(
                  (c) =>
                    (c.participant_1 === userId && c.participant_2 === contact.id) ||
                    (c.participant_1 === contact.id && c.participant_2 === userId)
                );
                const isActive = conv?.id === activeConversationId;
                const cStatus = contactStatuses[contact.id] || "offline";

                return (
                  <button
                    key={contact.id}
                    onClick={() => openConversation(contact.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                      isActive
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-accent/50 border border-transparent"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={cn(
                          "text-xs font-semibold",
                          isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <StatusDot status={cStatus} />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate text-foreground">{contact.name}</p>
                        {conv?.last_message_at && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                            {isToday(new Date(conv.last_message_at))
                              ? format(new Date(conv.last_message_at), "HH:mm")
                              : format(new Date(conv.last_message_at), "dd/MM")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] text-muted-foreground truncate">
                          {conv?.last_message_text || (
                            <span className="italic">{statusConfig[cStatus].label} · {contact.role}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredContacts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum contato encontrado</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        {activeConversationId && activeOtherId ? (
          <div className="flex-1 flex flex-col bg-background">
            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {getInitials(getContactName(activeOtherId))}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <StatusDot status={contactStatuses[activeOtherId] || "offline"} />
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{getContactName(activeOtherId)}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: statusConfig[contactStatuses[activeOtherId] || "offline"].color }}
                    />
                    {statusConfig[contactStatuses[activeOtherId] || "offline"].label} · {getContactRole(activeOtherId)}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-1.5 max-w-3xl mx-auto">
                {groupedMessages.map((item, idx) => {
                  if (item.type === "date") {
                    return (
                      <div key={`date-${idx}`} className="flex justify-center py-2">
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                          {item.date}
                        </span>
                      </div>
                    );
                  }
                  const msg = item.msg!;
                  const isMine = msg.sender === userId;
                  return (
                    <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm relative group",
                          isMine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                        {renderAttachment(msg)}
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-0.5",
                          isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                        )}>
                          <span className="text-[10px]">
                            {format(new Date(msg.created_at), "HH:mm")}
                          </span>
                          <MessageCheckmarks msg={msg} userId={userId} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-3 bg-card">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => imageInputRef.current?.click()}
                  title="Enviar imagem"
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 flex-shrink-0",
                    isRecording
                      ? "text-destructive animate-pulse"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  title={isRecording ? "Parar gravação" : "Gravar áudio"}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>

                <Input
                  placeholder="Digite sua mensagem..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1 h-9"
                />
                <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleSend} disabled={!text.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
            <div className="text-center space-y-3">
              <MessageSquare className="h-12 w-12 mx-auto opacity-20" />
              <p className="text-sm">Selecione um contato para iniciar uma conversa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
