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

export function SimuladoNotificationsProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const isCoordinator = role === "admin" || role === "super_admin";
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
    if (isCoordinator && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isCoordinator]);

  // Listen for submissions
  useEffect(() => {
    if (!isCoordinator) return;
    if (initialized.current) return;
    initialized.current = true;

    const channel = supabase
      .channel("simulado-submissions-notify")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "simulado_subjects" },
        async (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          if (newRow.status === "submitted" && oldRow.status !== "submitted") {
            const teacherName = await getTeacherName(newRow.teacher_id);
            const message = `${teacherName} enviou as questões de ${newRow.subject_name}`;

            const notification: SimuladoNotification = {
              id: `notif-${Date.now()}-${newRow.id}`,
              teacherName,
              subjectName: newRow.subject_name,
              simuladoId: newRow.simulado_id,
              timestamp: new Date(),
              read: false,
            };

            setNotifications((prev) => [notification, ...prev].slice(0, 50));

            playNotificationSound();
            showDesktopNotification("Simulado – Questões Enviadas", message);
            toast({ title: "📩 Questões enviadas!", description: message });
          }
        }
      )
      .subscribe();

    return () => {
      initialized.current = false;
      supabase.removeChannel(channel);
    };
  }, [isCoordinator]);

  return React.createElement(
    NotificationsContext.Provider,
    { value: { notifications, unreadCount, markAllRead, markRead, clearAll } },
    children
  );
}

export const useSimuladoNotifications = () => useContext(NotificationsContext);
