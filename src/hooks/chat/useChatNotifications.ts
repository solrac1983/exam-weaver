// ── Audio helpers ──────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
let _audioResumed = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return _audioCtx;
  } catch { return null; }
}

function ensureAudioResumed() {
  if (_audioResumed) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") ctx.resume();
  _audioResumed = true;
}

if (typeof window !== "undefined") {
  const resumeOnce = () => {
    ensureAudioResumed();
    window.removeEventListener("click", resumeOnce);
    window.removeEventListener("keydown", resumeOnce);
    window.removeEventListener("touchstart", resumeOnce);
  };
  window.addEventListener("click", resumeOnce);
  window.addEventListener("keydown", resumeOnce);
  window.addEventListener("touchstart", resumeOnce);
}

export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export function showDesktopNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") new Notification(title, { body, icon: "/favicon.ico" });
    });
  }
}
