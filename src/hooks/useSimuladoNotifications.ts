import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

/**
 * Listens for simulado_subjects status changes to "submitted"
 * and notifies coordinators in real time.
 */
export function useSimuladoNotifications() {
  const { role } = useAuth();
  const isCoordinator = role === "admin" || role === "coordinator" || role === "super_admin";
  const initialized = useRef(false);

  // Request notification permission once
  useEffect(() => {
    if (isCoordinator && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isCoordinator]);

  useEffect(() => {
    if (!isCoordinator) return;
    // Avoid double-subscribe in strict mode
    if (initialized.current) return;
    initialized.current = true;

    const channel = supabase
      .channel("simulado-submissions-notify")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "simulado_subjects",
        },
        async (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          // Only notify when status changes TO "submitted"
          if (newRow.status === "submitted" && oldRow.status !== "submitted") {
            const teacherName = await getTeacherName(newRow.teacher_id);
            const message = `${teacherName} enviou as questões de ${newRow.subject_name}`;

            playNotificationSound();
            showDesktopNotification("Simulado – Questões Enviadas", message);
            toast({
              title: "📩 Questões enviadas!",
              description: message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      initialized.current = false;
      supabase.removeChannel(channel);
    };
  }, [isCoordinator]);
}

async function getTeacherName(teacherId: string | null): Promise<string> {
  if (!teacherId) return "Um professor";
  const { data } = await supabase.from("teachers").select("name").eq("id", teacherId).single();
  return data?.name || "Um professor";
}
