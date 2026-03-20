import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import React from "react";

export interface SimuladoNotification {
  id: string;
  teacherName: string;
  subjectName: string;
  simuladoId: string;
  timestamp: Date;
  read: boolean;
  type?: "simulado_submission" | "simulado_approved" | "simulado_revision" | "demand_submitted" | "demand_approved" | "demand_revision";
  message?: string;
  /** Route to navigate to when clicking the notification */
  href?: string;
}

interface NotificationsContextType {
  notifications: SimuladoNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  clearAll: () => {},
});

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not available
  }
}

function showDesktopNotification(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

async function getTeacherName(teacherId: string | null): Promise<string> {
  if (!teacherId) return "Um professor";
  const { data } = await supabase.from("teachers").select("name").eq("id", teacherId).single();
  return data?.name || "Um professor";
}

async function getSubjectName(subjectId: string | null): Promise<string> {
  if (!subjectId) return "uma disciplina";
  const { data } = await supabase.from("subjects").select("name").eq("id", subjectId).single();
  return data?.name || "uma disciplina";
}

function pushNotification(
  setter: React.Dispatch<React.SetStateAction<SimuladoNotification[]>>,
  notification: SimuladoNotification,
  title: string,
  message: string
) {
  setter((prev) => [notification, ...prev].slice(0, 50));
  playNotificationSound();
  showDesktopNotification(title, message);
  toast({ title, description: message });
}

export function SimuladoNotificationsProvider({ children }: { children: ReactNode }) {
  const { role, user } = useAuth();
  const isCoordinator = role === "admin" || role === "coordinator" || role === "super_admin";
  const isProfessor = role === "professor";
  const [notifications, setNotifications] = useState<SimuladoNotification[]>([]);
  const initialized = useRef(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Request notification permission
  useEffect(() => {
    if ((isCoordinator || isProfessor) && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isCoordinator, isProfessor]);

  // Listen for simulado & demand submissions (coordinators)
  useEffect(() => {
    if (!isCoordinator) return;
    if (initialized.current) return;
    initialized.current = true;

    const channel = supabase
      .channel("coordinator-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "simulado_subjects" },
        async (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          if (newRow.status === "submitted" && oldRow.status !== "submitted") {
            const teacherName = await getTeacherName(newRow.teacher_id);
            const message = `${teacherName} enviou as questões de ${newRow.subject_name}`;

            pushNotification(setNotifications, {
              id: `notif-${Date.now()}-${newRow.id}`,
              teacherName,
              subjectName: newRow.subject_name,
              simuladoId: newRow.simulado_id,
              timestamp: new Date(),
              read: false,
              type: "simulado_submission",
              message,
              href: `/simulados`,
            }, "📩 Questões enviadas!", message);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "demands" },
        async (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          if (newRow.status === "submitted" && oldRow.status !== "submitted") {
            const subjectName = await getSubjectName(newRow.subject_id);
            const teacherName = await getTeacherName(newRow.teacher_id);
            const message = `${teacherName} enviou a avaliação de ${subjectName}`;

            pushNotification(setNotifications, {
              id: `notif-demand-sub-${Date.now()}-${newRow.id}`,
              teacherName,
              subjectName,
              simuladoId: newRow.id,
              timestamp: new Date(),
              read: false,
              type: "demand_submitted",
              message,
              href: `/demandas/${newRow.id}`,
            }, "📩 Avaliação enviada!", message);
          }
        }
      )
      .subscribe();

    return () => {
      initialized.current = false;
      supabase.removeChannel(channel);
    };
  }, [isCoordinator]);

  // Listen for demand & simulado approval/revision (professors only for their own items)
  useEffect(() => {
    if (!isProfessor || !user) return;

    // Get teacher record for this user to filter notifications
    let teacherId: string | null = null;
    let cancelled = false;

    const setup = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (cancelled || !profile?.email) return;

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("email", profile.email)
        .single();

      if (cancelled) return;
      teacherId = teacher?.id || null;

      const channel = supabase
        .channel("professor-notifications")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "demands" },
          async (payload) => {
            const newRow = payload.new as any;
            const oldRow = payload.old as any;

            // Only process notifications for this professor's demands
            if (teacherId && newRow.teacher_id !== teacherId) return;

            const statusChanged = newRow.status !== oldRow.status;
            if (!statusChanged) return;

            const isApproved = newRow.status === "approved";
            const isRevision = newRow.status === "revision_requested";
            if (!isApproved && !isRevision) return;

            const subjectName = await getSubjectName(newRow.subject_id);
            const message = isApproved
              ? `Sua prova de ${subjectName} foi aprovada! ✅`
              : `Ajustes solicitados na prova de ${subjectName}`;

            pushNotification(setNotifications, {
              id: `notif-demand-${Date.now()}-${newRow.id}`,
              teacherName: "",
              subjectName,
              simuladoId: newRow.id,
              timestamp: new Date(),
              read: false,
              type: isApproved ? "demand_approved" : "demand_revision",
              message,
              href: `/demandas/${newRow.id}`,
            }, isApproved ? "✅ Prova aprovada!" : "📝 Ajustes solicitados", message);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "simulado_subjects" },
          async (payload) => {
            const newRow = payload.new as any;
            const oldRow = payload.old as any;

            // Only process notifications for this professor's subjects
            if (teacherId && newRow.teacher_id !== teacherId) return;

            const statusChanged = newRow.status !== oldRow.status;
            if (!statusChanged) return;

            const isApproved = newRow.status === "approved";
            const isRevision = newRow.status === "revision_requested";
            if (!isApproved && !isRevision) return;

            const message = isApproved
              ? `Suas questões de ${newRow.subject_name} no simulado foram aprovadas! ✅`
              : `Ajustes solicitados nas questões de ${newRow.subject_name} no simulado`;

            pushNotification(setNotifications, {
              id: `notif-sim-subj-${Date.now()}-${newRow.id}`,
              teacherName: "",
              subjectName: newRow.subject_name,
              simuladoId: newRow.simulado_id,
              timestamp: new Date(),
              read: false,
              type: isApproved ? "simulado_approved" : "simulado_revision",
              message,
              href: `/simulados`,
            }, isApproved ? "✅ Simulado aprovado!" : "📝 Ajustes solicitados no simulado", message);
          }
        )
        .subscribe();

      // Store cleanup reference
      if (!cancelled) {
        cleanupRef.current = () => supabase.removeChannel(channel);
      } else {
        supabase.removeChannel(channel);
      }
    };

    const cleanupRef = { current: () => {} };
    setup();

    return () => {
      cancelled = true;
      cleanupRef.current();
    };
  }, [isProfessor, user]);

  return React.createElement(
    NotificationsContext.Provider,
    { value: { notifications, unreadCount, markAllRead, markRead, clearAll } },
    children
  );
}

export const useSimuladoNotifications = () => useContext(NotificationsContext);
