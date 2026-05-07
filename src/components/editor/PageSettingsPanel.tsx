import { useEffect, useMemo, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FileText, Ruler, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type PaperSize = "a4" | "letter" | "legal";

export interface PageSettings {
  paper: PaperSize;
  orientation: "portrait" | "landscape";
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  pageGapPx: number;
}

const PAPER_DIMENSIONS: Record<PaperSize, { w: string; h: string; label: string }> = {
  a4: { w: "210mm", h: "297mm", label: "A4 (210 × 297 mm)" },
  letter: { w: "216mm", h: "279mm", label: "Carta (216 × 279 mm)" },
  legal: { w: "216mm", h: "356mm", label: "Ofício (216 × 356 mm)" },
};

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  paper: "a4",
  orientation: "portrait",
  marginTopMm: 25,
  marginBottomMm: 25,
  marginLeftMm: 30,
  marginRightMm: 30,
  pageGapPx: 20,
};

const MARGIN_PRESETS: Record<string, { label: string; values: Pick<PageSettings, "marginTopMm" | "marginBottomMm" | "marginLeftMm" | "marginRightMm"> & Partial<PageSettings> }> = {
  abnt: { label: "ABNT (3/2/3/2 cm)", values: { paper: "a4", orientation: "portrait", marginTopMm: 30, marginBottomMm: 20, marginLeftMm: 30, marginRightMm: 20 } },
  normal: { label: "Normal", values: { marginTopMm: 25, marginBottomMm: 25, marginLeftMm: 30, marginRightMm: 30 } },
  estreita: { label: "Estreita", values: { marginTopMm: 12, marginBottomMm: 12, marginLeftMm: 12, marginRightMm: 12 } },
  moderada: { label: "Moderada", values: { marginTopMm: 25, marginBottomMm: 25, marginLeftMm: 19, marginRightMm: 19 } },
  larga: { label: "Larga", values: { marginTopMm: 25, marginBottomMm: 25, marginLeftMm: 50, marginRightMm: 50 } },
};

const mmToPx = (mm: number) => Math.round(mm * 3.7795);

export function getPageSettingsKey(scopeId?: string | null) {
  return `page-settings:${scopeId || "global"}`;
}

export function loadPageSettings(scopeId?: string | null): PageSettings {
  try {
    const raw = localStorage.getItem(getPageSettingsKey(scopeId));
    if (raw) return { ...DEFAULT_PAGE_SETTINGS, ...JSON.parse(raw) };
    const userRaw = localStorage.getItem(getPageSettingsKey("user-default"));
    if (userRaw) return { ...DEFAULT_PAGE_SETTINGS, ...JSON.parse(userRaw) };
  } catch {}
  return DEFAULT_PAGE_SETTINGS;
}

export async function loadPageSettingsFromDB(scopeId?: string | null): Promise<PageSettings> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return loadPageSettings(scopeId);
    const { data } = await supabase
      .from("page_settings" as any)
      .select("scope_id, settings")
      .eq("user_id", user.id)
      .in("scope_id", [scopeId ?? "__user_default__", "__user_default__"]);
    const rows = (data as any[]) || [];
    const scoped = rows.find((r) => r.scope_id === (scopeId ?? "__user_default__"));
    const fallback = rows.find((r) => r.scope_id === "__user_default__");
    const chosen = scoped?.settings || fallback?.settings;
    if (chosen) {
      try { localStorage.setItem(getPageSettingsKey(scopeId), JSON.stringify(chosen)); } catch {}
      return { ...DEFAULT_PAGE_SETTINGS, ...chosen };
    }
  } catch {}
  return loadPageSettings(scopeId);
}

async function savePageSettingsToDB(scopeId: string | null | undefined, settings: PageSettings, asUserDefault = false) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const scope = asUserDefault ? "__user_default__" : (scopeId ?? "__user_default__");
  const { error } = await supabase
    .from("page_settings" as any)
    .upsert({ user_id: user.id, scope_id: scope, settings: settings as any, updated_at: new Date().toISOString() } as any, { onConflict: "user_id,scope_id" });
  return !error;
}

export function applyPageSettings(s: PageSettings) {
  const page = document.querySelector(".exam-page") as HTMLElement | null;
  if (!page) return;
  const shell = page.querySelector(".editor-page-shell") as HTMLElement | null;
  const editor = page.querySelector(".tiptap, .ProseMirror") as HTMLElement | null;
  const dim = PAPER_DIMENSIONS[s.paper];
  const w = s.orientation === "portrait" ? dim.w : dim.h;
  const h = s.orientation === "portrait" ? dim.h : dim.w;
  const targets = [page, shell, editor].filter(Boolean) as HTMLElement[];
  targets.forEach((target) => {
    target.style.setProperty("--page-w", w);
    target.style.setProperty("--page-h", h);
    target.style.setProperty("--page-gap", `${s.pageGapPx}px`);
    target.style.setProperty("--page-pad-top", `${mmToPx(s.marginTopMm)}px`);
    target.style.setProperty("--page-pad-bottom", `${mmToPx(s.marginBottomMm)}px`);
    target.style.setProperty("--page-pad-left", `${mmToPx(s.marginLeftMm)}px`);
    target.style.setProperty("--page-pad-right", `${mmToPx(s.marginRightMm)}px`);
  });
  page.style.width = w;
  page.style.minHeight = h;
  if (shell) shell.style.width = w;
  if (editor) {
    editor.style.width = w;
    editor.style.minHeight = h;
  }
  window.dispatchEvent(new CustomEvent("editor-margins-change", {
    detail: {
      top: mmToPx(s.marginTopMm),
      bottom: mmToPx(s.marginBottomMm),
      left: mmToPx(s.marginLeftMm),
      right: mmToPx(s.marginRightMm),
    },
  }));
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scopeId?: string | null;
}

const MARGIN_FIELDS: ReadonlyArray<readonly [string, keyof PageSettings]> = [
  ["Superior", "marginTopMm"],
  ["Inferior", "marginBottomMm"],
  ["Esquerda", "marginLeftMm"],
  ["Direita", "marginRightMm"],
] as const;

function PaperPreview({ settings }: { settings: PageSettings }) {
  const dim = PAPER_DIMENSIONS[settings.paper];
  const portrait = settings.orientation === "portrait";
  const wMm = parseInt(portrait ? dim.w : dim.h, 10);
  const hMm = parseInt(portrait ? dim.h : dim.w, 10);
  const scale = 0.45;
  const w = wMm * scale;
  const h = hMm * scale;
  const pt = settings.marginTopMm * scale;
  const pb = settings.marginBottomMm * scale;
  const pl = settings.marginLeftMm * scale;
  const pr = settings.marginRightMm * scale;
  return (
    <div className="flex items-center justify-center rounded-md border bg-muted/30 p-3">
      <div
        className="relative bg-background shadow-sm border"
        style={{ width: `${w}px`, height: `${h}px` }}
        aria-hidden
      >
        <div
          className="absolute border border-dashed border-primary/40"
          style={{ top: pt, bottom: pb, left: pl, right: pr }}
        />
      </div>
    </div>
  );
}

export function PageSettingsPanel({ open, onOpenChange, scopeId }: Props) {
  const [settings, setSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [tab, setTab] = useState("paper");

  useEffect(() => {
    if (!open) return;
    setSettings(loadPageSettings(scopeId));
    loadPageSettingsFromDB(scopeId).then((s) => {
      setSettings(s);
      applyPageSettings(s);
    });
  }, [open, scopeId]);

  const update = useCallback(<K extends keyof PageSettings>(k: K, v: PageSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [k]: v };
      applyPageSettings(next);
      return next;
    });
  }, []);

  const applyPreset = useCallback((preset: string) => {
    const p = MARGIN_PRESETS[preset]?.values;
    if (!p) return;
    setSettings((prev) => {
      const next = { ...prev, ...p } as PageSettings;
      applyPageSettings(next);
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    try {
      localStorage.setItem(getPageSettingsKey(scopeId), JSON.stringify(settings));
      applyPageSettings(settings);
      const ok = await savePageSettingsToDB(scopeId, settings, false);
      toast.success(ok ? "Configurações salvas" : "Salvas localmente (sem conexão)");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar");
    }
  }, [settings, scopeId, onOpenChange]);

  const saveAsUserDefault = useCallback(async () => {
    try {
      localStorage.setItem(getPageSettingsKey("user-default"), JSON.stringify(settings));
      const ok = await savePageSettingsToDB(scopeId, settings, true);
      toast.success(ok ? "Padrão do usuário definido" : "Padrão salvo localmente");
    } catch {
      toast.error("Falha ao salvar padrão");
    }
  }, [settings, scopeId]);

  const reset = useCallback(() => {
    setSettings(DEFAULT_PAGE_SETTINGS);
    applyPageSettings(DEFAULT_PAGE_SETTINGS);
  }, []);

  const summary = useMemo(() => {
    const dim = PAPER_DIMENSIONS[settings.paper];
    const orient = settings.orientation === "portrait" ? "Retrato" : "Paisagem";
    return `${dim.label} · ${orient}`;
  }, [settings.paper, settings.orientation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurações de Página</DialogTitle>
          <DialogDescription>
            {summary} · Salvo {scopeId ? "para esta prova" : "globalmente"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="paper" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Papel</TabsTrigger>
              <TabsTrigger value="margins" className="gap-1.5"><Ruler className="h-3.5 w-3.5" />Margens</TabsTrigger>
              <TabsTrigger value="layout" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Layout</TabsTrigger>
            </TabsList>

            <TabsContent value="paper" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Tamanho do papel</Label>
                <Select value={settings.paper} onValueChange={(v) => update("paper", v as PaperSize)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PAPER_DIMENSIONS) as [PaperSize, typeof PAPER_DIMENSIONS[PaperSize]][]).map(([k, info]) => (
                      <SelectItem key={k} value={k}>{info.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Orientação</Label>
                <Select value={settings.orientation} onValueChange={(v) => update("orientation", v as "portrait" | "landscape")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Retrato</SelectItem>
                    <SelectItem value="landscape">Paisagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="margins" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Predefinições</Label>
                <Select value="" onValueChange={applyPreset}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma predefinição" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MARGIN_PRESETS).map(([k, p]) => (
                      <SelectItem key={k} value={k}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                {MARGIN_FIELDS.map(([label, key]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">{label} (mm)</span>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={settings[key] as number}
                      onChange={(e) => update(key, Math.max(0, Math.min(60, Number(e.target.value) || 0)) as PageSettings[typeof key])}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="layout" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Espaçamento entre páginas (px)</Label>
                <Input
                  type="number"
                  min={0}
                  max={80}
                  value={settings.pageGapPx}
                  onChange={(e) => update("pageGapPx", Math.max(0, Math.min(80, Number(e.target.value) || 0)))}
                />
                <p className="text-[10px] text-muted-foreground">Apenas visual no editor — não afeta o PDF exportado.</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="hidden md:block">
            <Label className="text-xs mb-1 block">Pré-visualização</Label>
            <PaperPreview settings={settings} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={reset}>Restaurar</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveAsUserDefault}>Salvar como meu padrão</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
