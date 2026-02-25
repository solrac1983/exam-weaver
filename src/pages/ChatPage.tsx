import { useState, useRef, useEffect } from "react";
import { useChat, chatContacts, ChatMessage } from "@/hooks/useChat";
import { currentUser } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Send,
  Paperclip,
  Image,
  Mic,
  MicOff,
  FileText,
  Play,
  Pause,
  MessageSquare,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getContactName(id: string) {
  return chatContacts.find((c) => c.id === id)?.name ?? id;
}
function getContactRole(id: string) {
  return chatContacts.find((c) => c.id === id)?.role ?? "";
}
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

export default function ChatPage() {
  const {
    conversations,
    messages,
    activeConversationId,
    openConversation,
    sendMessage,
    loading,
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

  const otherContacts = chatContacts.filter((c) => c.id !== currentUser.id);
  const filteredContacts = otherContacts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeOtherId = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId)
      ? (() => {
          const conv = conversations.find((c) => c.id === activeConversationId)!;
          return conv.participant_1 === currentUser.id ? conv.participant_2 : conv.participant_1;
        })()
      : null
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
          className="max-w-[240px] rounded-lg mt-1 cursor-pointer hover:opacity-90"
          onClick={() => window.open(msg.attachment_url!, "_blank")}
        />
      );
    }
    if (msg.attachment_type === "audio") {
      return (
        <audio controls className="mt-1 max-w-[260px]">
          <source src={msg.attachment_url} />
        </audio>
      );
    }
    return (
      <a
        href={msg.attachment_url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 mt-1 text-xs text-primary hover:underline"
      >
        <FileText className="h-4 w-4" />
        {msg.attachment_name || "Arquivo"}
      </a>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Chat</h1>
        <p className="text-sm text-muted-foreground">Comunicação entre professores e coordenação</p>
      </div>

      <div className="flex h-[calc(100vh-180px)] rounded-xl border bg-card overflow-hidden">
        {/* Sidebar - Contacts */}
        <div className="w-80 border-r flex flex-col bg-muted/30">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {filteredContacts.map((contact) => {
                const conv = conversations.find(
                  (c) =>
                    (c.participant_1 === currentUser.id && c.participant_2 === contact.id) ||
                    (c.participant_1 === contact.id && c.participant_2 === currentUser.id)
                );
                const isActive = conv?.id === activeConversationId;

                return (
                  <button
                    key={contact.id}
                    onClick={() => openConversation(contact.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent text-foreground"
                    )}
                  >
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {conv?.last_message_text || contact.role}
                      </p>
                    </div>
                    {conv?.last_message_at && (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {format(new Date(conv.last_message_at), "HH:mm")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        {activeConversationId && activeOtherId ? (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="h-14 border-b flex items-center gap-3 px-4 bg-background">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {getInitials(getContactName(activeOtherId))}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">{getContactName(activeOtherId)}</p>
                <p className="text-[11px] text-muted-foreground">{getContactRole(activeOtherId)}</p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.sender === currentUser.id;
                  return (
                    <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                          isMine
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        )}
                      >
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        {renderAttachment(msg)}
                        <p className={cn(
                          "text-[10px] mt-1",
                          isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {format(new Date(msg.created_at), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-3 bg-background">
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => imageInputRef.current?.click()}
                  title="Enviar imagem"
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9",
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
                <Button size="icon" className="h-9 w-9" onClick={handleSend} disabled={!text.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-3">
              <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-sm">Selecione um contato para iniciar uma conversa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
