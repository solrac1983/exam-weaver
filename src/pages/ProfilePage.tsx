import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Camera, User, Mail, Shield, Key, School, BookOpen, Users, FileText, ClipboardList, MessageSquare } from "lucide-react";

interface TeacherInfo {
  subjects: string[];
  classGroups: string[];
}

interface CompanyInfo {
  name: string;
}

interface ChatInfo {
  id: string;
  otherName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export default function ProfilePage() {
  const { user, profile, role } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  const roleLabel: Record<string, string> = {
    super_admin: "Super Administrador",
    admin: "Administrador",
    coordinator: "Coordenador(a)",
    professor: "Professor(a)",
  };

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Fetch extra data for teacher profile
  useEffect(() => {
    if (!user || !profile) return;
    const load = async () => {
      setLoadingExtra(true);
      try {
        const companyRes = profile.company_id
          ? await supabase.from("companies").select("name").eq("id", profile.company_id).single()
          : { data: null };

        const teacherRes = await supabase.from("teachers").select("subjects, class_groups").eq("email", profile.email).maybeSingle();

        const chatsRes = await supabase
          .from("chat_conversations")
          .select("id, participant_1, participant_2, last_message_text, last_message_at")
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
          .order("last_message_at", { ascending: false })
          .limit(5);

        if (companyRes.data) setCompany({ name: companyRes.data.name });

        if (teacherRes.data) {
          setTeacherInfo({
            subjects: teacherRes.data.subjects || [],
            classGroups: teacherRes.data.class_groups || [],
          });
        }

        if (chatsRes.data && chatsRes.data.length > 0) {
          // Get other participant names
          const otherIds = chatsRes.data.map((c: any) =>
            c.participant_1 === user.id ? c.participant_2 : c.participant_1
          );
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", otherIds);

          const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

          setChats(
            chatsRes.data.map((c: any) => {
              const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
              return {
                id: c.id,
                otherName: nameMap.get(otherId) || "Usuário",
                lastMessage: c.last_message_text,
                lastMessageAt: c.last_message_at,
              };
            })
          );
        }
      } catch (err) {
        console.error("Error loading profile extras:", err);
      } finally {
        setLoadingExtra(false);
      }
    };
    load();
  }, [user, profile]);

  // Update state when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, avatar_url: avatarUrl || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar perfil: " + error.message);
    } else {
      toast.success("Perfil atualizado com sucesso!");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast.error("Erro ao enviar imagem: " + uploadError.message);
      setUploadingAvatar(false);
      return;
    }
    const { data } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);
    setAvatarUrl(data.publicUrl);
    setUploadingAvatar(false);
    toast.success("Foto atualizada! Clique em Salvar para confirmar.");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie suas informações pessoais e segurança</p>
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Informações Pessoais
          </CardTitle>
          <CardDescription>Atualize seu nome e foto de perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-5">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative group h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xl font-bold text-primary overflow-hidden border-2 border-border/50 hover:border-primary/30 transition-colors"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <div>
              <p className="font-medium">{profile?.full_name || "Usuário"}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                {roleLabel[role || "professor"]}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" value={user?.email || ""} disabled className="pl-10 bg-muted/50" />
              </div>
              <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar alterações
          </Button>
        </CardContent>
      </Card>

      {/* School */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <School className="h-5 w-5 text-primary" /> Escola
          </CardTitle>
          <CardDescription>Instituição de ensino vinculada</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingExtra ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : company ? (
            <p className="font-medium text-foreground">{company.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma escola vinculada ao seu perfil.</p>
          )}
        </CardContent>
      </Card>

      {/* Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Disciplinas
          </CardTitle>
          <CardDescription>Disciplinas que você leciona</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingExtra ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : teacherInfo && teacherInfo.subjects.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teacherInfo.subjects.map((s, i) => (
                <Badge key={i} variant="secondary">{s}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma disciplina vinculada.</p>
          )}
        </CardContent>
      </Card>

      {/* Class Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Turmas
          </CardTitle>
          <CardDescription>Turmas sob sua responsabilidade</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingExtra ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : teacherInfo && teacherInfo.classGroups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teacherInfo.classGroups.map((g, i) => (
                <Badge key={i} variant="outline">{g}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma turma vinculada.</p>
          )}
        </CardContent>
      </Card>

      {/* Exams / Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Atividades e Provas
          </CardTitle>
          <CardDescription>Avaliações que você aplica</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Acesse suas provas e atividades pela página de <a href="/provas" className="text-primary underline hover:no-underline">Provas</a>.
          </p>
        </CardContent>
      </Card>

      {/* Simulados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Simulados
          </CardTitle>
          <CardDescription>Simulados que você organiza</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Acesse seus simulados pela página de <a href="/simulados" className="text-primary underline hover:no-underline">Simulados</a>.
          </p>
        </CardContent>
      </Card>

      {/* Chats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Conversas
          </CardTitle>
          <CardDescription>Seus chats recentes</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingExtra ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : chats.length > 0 ? (
            <div className="space-y-3">
              {chats.map((c) => (
                <a key={c.id} href="/chat" className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{c.otherName}</p>
                    {c.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate max-w-[250px]">{c.lastMessage}</p>
                    )}
                  </div>
                  {c.lastMessageAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.lastMessageAt).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
          )}
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" /> Alterar Senha
          </CardTitle>
          <CardDescription>Atualize sua senha de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" required minLength={6} />
            </div>
            <Button type="submit" variant="outline" disabled={changingPassword}>
              {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
