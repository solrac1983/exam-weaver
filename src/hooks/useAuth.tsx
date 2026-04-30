import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "admin" | "coordinator" | "professor";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  company_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  billingBlocked: boolean;
  loading: boolean;
  roleLoading: boolean;
  roleError: string | null;
  retryProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: null,
  billingBlocked: false,
  loading: true,
  roleLoading: true,
  roleError: null,
  retryProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [billingBlocked, setBillingBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  const fetchProfileAndRole = async (userId: string) => {
    setRoleLoading(true);
    setRoleError(null);
    try {
      const [profileRes, roleRes, blockedRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.rpc("is_company_blocked", { _user_id: userId }),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (roleRes.error) throw roleRes.error;
      setProfile((profileRes.data as Profile) ?? null);
      setRole(((roleRes.data?.role as AppRole) ?? null));
      setBillingBlocked(blockedRes.data === true);
      if (!roleRes.data) {
        setRoleError("Nenhum perfil de acesso atribuído. Contate o administrador.");
      }
    } catch (err: any) {
      console.error("Error fetching profile/role:", err);
      setRoleError(err?.message || "Não foi possível carregar suas permissões.");
      setRole(null);
    } finally {
      setRoleLoading(false);
    }
  };

  const retryProfile = async () => {
    if (user?.id) await fetchProfileAndRole(user.id);
  };

  useEffect(() => {
    let initialized = false;
    let lastUserId: string | null = null;

    const handleSession = (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      const uid = session?.user?.id ?? null;

      if (uid) {
        // Skip duplicate fetch if same user already loaded
        if (uid === lastUserId && initialized) {
          setLoading(false);
          return;
        }
        lastUserId = uid;
        initialized = true;
        // Defer to avoid deadlock with supabase-js internal lock
        setTimeout(() => {
          fetchProfileAndRole(uid).finally(() => setLoading(false));
        }, 0);
      } else {
        lastUserId = null;
        initialized = true;
        setProfile(null);
        setRole(null);
        setBillingBlocked(false);
        setRoleLoading(false);
        setRoleError(null);
        setLoading(false);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => handleSession(session)
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setBillingBlocked(false);
    setRoleError(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, billingBlocked, loading, roleLoading, roleError, retryProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
