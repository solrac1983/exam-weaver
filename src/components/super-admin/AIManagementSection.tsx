import { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Brain, TrendingUp, Zap, DollarSign, Loader2, Plus, Pencil, Trash2,
  BarChart3, Activity, Hash, Calendar, Eye, EyeOff, Bell, BellRing,
  AlertTriangle, CheckCircle2, Settings2, Shield
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// ── Types ──
interface AIProvider {
  id: string;
  name: string;
  slug: string;
  api_key_encrypted: string;
  base_url: string;
  models: string[];
  is_active: boolean;
  created_at: string;
}

interface AIUsageLog {
  id: string;
  user_id: string;
  company_id: string | null;
  provider: string;
  model: string;
  feature: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_estimate: number;
  created_at: string;
}

interface AlertSetting {
  id: string;
  name: string;
  monthly_token_limit: number;
  daily_token_limit: number;
  alert_threshold_pct: number;
  alert_email: string;
  notify_in_app: boolean;
  is_active: boolean;
  last_alert_sent_at: string | null;
}

interface AlertNotification {
  id: string;
  alert_type: string;
  message: string;
  tokens_used: number;
  token_limit: number;
  percentage: number;
  read: boolean;
  created_at: string;
}

interface UsageStats {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  byProvider: Record<string, { tokens: number; requests: number; cost: number }>;
  byModel: Record<string, { tokens: number; requests: number }>;
  byFeature: Record<string, { tokens: number; requests: number }>;
  daily: { date: string; tokens: number; requests: number }[];
}

// ── Helper ──
function computeStats(logs: AIUsageLog[]): UsageStats {
  const stats: UsageStats = {
    totalTokens: 0, totalCost: 0, totalRequests: logs.length,
    byProvider: {}, byModel: {}, byFeature: {}, daily: [],
  };
  const dailyMap: Record<string, { tokens: number; requests: number }> = {};

  for (const log of logs) {
    stats.totalTokens += log.total_tokens;
    stats.totalCost += Number(log.cost_estimate);

    if (!stats.byProvider[log.provider]) stats.byProvider[log.provider] = { tokens: 0, requests: 0, cost: 0 };
    stats.byProvider[log.provider].tokens += log.total_tokens;
    stats.byProvider[log.provider].requests += 1;
    stats.byProvider[log.provider].cost += Number(log.cost_estimate);

    if (!stats.byModel[log.model]) stats.byModel[log.model] = { tokens: 0, requests: 0 };
    stats.byModel[log.model].tokens += log.total_tokens;
    stats.byModel[log.model].requests += 1;

    if (!stats.byFeature[log.feature]) stats.byFeature[log.feature] = { tokens: 0, requests: 0 };
    stats.byFeature[log.feature].tokens += log.total_tokens;
    stats.byFeature[log.feature].requests += 1;

    const day = log.created_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { tokens: 0, requests: 0 };
    dailyMap[day].tokens += log.total_tokens;
    dailyMap[day].requests += 1;
  }

  stats.daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, ...d }));

  return stats;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Main Component ──
export default function AIManagementSection() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [logs, setLogs] = useState<AIUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  // Provider dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", api_key: "", base_url: "", models: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Alert settings
  const [alertSettings, setAlertSettings] = useState<AlertSetting[]>([]);
  const [alertNotifications, setAlertNotifications] = useState<AlertNotification[]>([]);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertSetting | null>(null);
  const [alertForm, setAlertForm] = useState({
    name: "", monthly_token_limit: "1000000", daily_token_limit: "50000",
    alert_threshold_pct: "80", alert_email: "", notify_in_app: true, is_active: true,
  });
  const [savingAlert, setSavingAlert] = useState(false);
  const [checkingUsage, setCheckingUsage] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(period));

    const [provRes, logRes, alertRes, notifRes] = await Promise.all([
      supabase.from("ai_providers").select("*").order("created_at"),
      supabase.from("ai_usage_logs").select("*").gte("created_at", daysAgo.toISOString()).order("created_at", { ascending: false }),
      supabase.from("ai_alert_settings").select("*").order("created_at"),
      supabase.from("ai_alert_notifications").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    if (provRes.data) setProviders(provRes.data as any);
    if (logRes.data) setLogs(logRes.data as any);
    if (alertRes.data) setAlertSettings(alertRes.data as any);
    if (notifRes.data) setAlertNotifications(notifRes.data as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [period]);

  const stats = computeStats(logs);

  // ── Provider CRUD ──
  const openNewProvider = () => {
    setEditingProvider(null);
    setForm({ name: "", slug: "", api_key: "", base_url: "", models: "", is_active: true });
    setShowKey(false);
    setDialogOpen(true);
  };

  const openEditProvider = (p: AIProvider) => {
    setEditingProvider(p);
    setForm({
      name: p.name,
      slug: p.slug,
      api_key: p.api_key_encrypted,
      base_url: p.base_url,
      models: p.models.join(", "),
      is_active: p.is_active,
    });
    setShowKey(false);
    setDialogOpen(true);
  };

  const handleSaveProvider = async () => {
    if (!form.name || !form.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      api_key_encrypted: form.api_key,
      base_url: form.base_url,
      models: form.models.split(",").map(m => m.trim()).filter(Boolean),
      is_active: form.is_active,
    };

    if (editingProvider) {
      const { error } = await supabase.from("ai_providers").update(payload).eq("id", editingProvider.id);
      if (error) toast.error("Erro ao atualizar: " + error.message);
      else toast.success("Provedor atualizado");
    } else {
      const { error } = await supabase.from("ai_providers").insert(payload);
      if (error) toast.error("Erro ao criar: " + error.message);
      else toast.success("Provedor adicionado");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleToggleActive = async (p: AIProvider) => {
    const { error } = await supabase.from("ai_providers").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message);
    else fetchData();
  };

  const handleDeleteProvider = async (p: AIProvider) => {
    if (p.slug === "lovable") {
      toast.error("O provedor padrão não pode ser removido");
      return;
    }
    const { error } = await supabase.from("ai_providers").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else { toast.success("Provedor removido"); fetchData(); }
  };

  // ── Alert CRUD ──
  const openNewAlert = () => {
    setEditingAlert(null);
    setAlertForm({ name: "", monthly_token_limit: "1000000", daily_token_limit: "50000", alert_threshold_pct: "80", alert_email: "", notify_in_app: true, is_active: true });
    setAlertDialogOpen(true);
  };

  const openEditAlert = (a: AlertSetting) => {
    setEditingAlert(a);
    setAlertForm({
      name: a.name,
      monthly_token_limit: String(a.monthly_token_limit),
      daily_token_limit: String(a.daily_token_limit),
      alert_threshold_pct: String(a.alert_threshold_pct),
      alert_email: a.alert_email,
      notify_in_app: a.notify_in_app,
      is_active: a.is_active,
    });
    setAlertDialogOpen(true);
  };

  const handleSaveAlert = async () => {
    if (!alertForm.name) { toast.error("Nome é obrigatório"); return; }
    setSavingAlert(true);
    const payload = {
      name: alertForm.name,
      monthly_token_limit: Number(alertForm.monthly_token_limit) || 0,
      daily_token_limit: Number(alertForm.daily_token_limit) || 0,
      alert_threshold_pct: Number(alertForm.alert_threshold_pct) || 80,
      alert_email: alertForm.alert_email,
      notify_in_app: alertForm.notify_in_app,
      is_active: alertForm.is_active,
    };
    if (editingAlert) {
      const { error } = await supabase.from("ai_alert_settings").update(payload).eq("id", editingAlert.id);
      if (error) toast.error(error.message); else toast.success("Alerta atualizado");
    } else {
      const { error } = await supabase.from("ai_alert_settings").insert(payload);
      if (error) toast.error(error.message); else toast.success("Alerta criado");
    }
    setSavingAlert(false);
    setAlertDialogOpen(false);
    fetchData();
  };

  const handleDeleteAlert = async (a: AlertSetting) => {
    const { error } = await supabase.from("ai_alert_settings").delete().eq("id", a.id);
    if (error) toast.error(error.message);
    else { toast.success("Alerta removido"); fetchData(); }
  };

  const handleCheckUsageNow = async () => {
    setCheckingUsage(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-ai-usage");
      if (error) throw error;
      toast.success(`Verificação concluída. ${data?.alerts_generated || 0} alerta(s) gerado(s).`);
      fetchData();
    } catch (e: any) {
      toast.error("Erro ao verificar: " + (e.message || "Erro desconhecido"));
    }
    setCheckingUsage(false);
  };

  const handleMarkAlertRead = async (id: string) => {
    await supabase.from("ai_alert_notifications").update({ read: true }).eq("id", id);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tokens Totais</p>
                <p className="text-2xl font-bold">{formatTokens(stats.totalTokens)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Hash className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Requisições</p>
                <p className="text-2xl font-bold">{stats.totalRequests}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Custo Estimado</p>
                <p className="text-2xl font-bold">R$ {stats.totalCost.toFixed(2)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Provedores Ativos</p>
                <p className="text-2xl font-bold">{providers.filter(p => p.is_active).length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Period Filter ── */}
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Daily Usage Area Chart ── */}
      {stats.daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Uso Diário de Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.daily}>
                <defs>
                  <linearGradient id="gradTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradReqs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="tokens" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatTokens(v)} width={50} />
                <YAxis yAxisId="reqs" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={40} />
                <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} formatter={(value: number, name: string) => [name === "tokens" ? formatTokens(value) : value, name === "tokens" ? "Tokens" : "Requisições"]} labelFormatter={(l: string) => `Data: ${l}`} />
                <Legend formatter={(value: string) => value === "tokens" ? "Tokens" : "Requisições"} />
                <Area yAxisId="tokens" type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" fill="url(#gradTokens)" strokeWidth={2} />
                <Area yAxisId="reqs" type="monotone" dataKey="requests" stroke="hsl(var(--success))" fill="url(#gradReqs)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Provider & Feature Distribution Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Provider Pie Chart */}
        {Object.keys(stats.byProvider).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Distribuição por Provedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(220 70% 55%)", "hsl(35 90% 55%)", "hsl(280 60% 55%)", "hsl(0 70% 55%)"];
                const pieData = Object.entries(stats.byProvider).map(([name, d]) => ({ name, value: d.tokens }));
                return (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number) => formatTokens(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
                      {pieData.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-1.5 text-[11px]">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground truncate capitalize">{s.name}</span>
                          <span className="font-semibold text-foreground ml-auto">{formatTokens(s.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Feature Bar Chart */}
        {Object.keys(stats.byFeature).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Uso por Funcionalidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const barData = Object.entries(stats.byFeature)
                  .sort(([, a], [, b]) => b.tokens - a.tokens)
                  .map(([feature, d]) => ({ feature: feature.replace(/-/g, " "), tokens: d.tokens, requests: d.requests }));
                return (
                  <ResponsiveContainer width="100%" height={Math.max(220, barData.length * 40)}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatTokens(v)} />
                      <YAxis type="category" dataKey="feature" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={100} />
                      <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number, name: string) => [name === "tokens" ? formatTokens(value) : value, name === "tokens" ? "Tokens" : "Requisições"]} />
                      <Bar dataKey="tokens" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="tokens" />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── AI Providers Management ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Provedores de IA
          </CardTitle>
          <Button size="sm" onClick={openNewProvider}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar provedor
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Modelos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.slug}</code></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.models.slice(0, 3).map((m) => (
                        <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                      ))}
                      {p.models.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">+{p.models.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={() => handleToggleActive(p)}
                    />
                  </TableCell>
                  <TableCell>
                    {p.api_key_encrypted ? (
                      <Badge variant="outline" className="text-[10px] text-success">Configurada</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Não configurada</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProvider(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {p.slug !== "lovable" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteProvider(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Provider Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {editingProvider ? "Editar Provedor" : "Novo Provedor de IA"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Google Gemini" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Slug (identificador único) *</Label>
              <Input placeholder="Ex: gemini" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
            </div>
            <div className="space-y-2">
              <Label>URL Base da API</Label>
              <Input placeholder="https://api.provider.com/v1" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">A chave é armazenada de forma segura no banco de dados.</p>
            </div>
            <div className="space-y-2">
              <Label>Modelos disponíveis</Label>
              <Input placeholder="modelo-1, modelo-2, modelo-3" value={form.models} onChange={(e) => setForm({ ...form, models: e.target.value })} />
              <p className="text-xs text-muted-foreground">Separe os modelos por vírgula.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Ativo</Label>
            </div>
            <Button onClick={handleSaveProvider} className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingProvider ? "Salvar alterações" : "Adicionar provedor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Alert Settings ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Configurações de Alertas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCheckUsageNow} disabled={checkingUsage}>
              {checkingUsage ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
              Verificar agora
            </Button>
            <Button size="sm" onClick={openNewAlert}>
              <Plus className="h-4 w-4 mr-1" /> Novo alerta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alertSettings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma configuração de alerta criada.</p>
          ) : (
            <div className="space-y-4">
              {alertSettings.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {a.is_active ? <BellRing className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium">{a.name}</span>
                      <Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">
                        {a.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAlert(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAlert(a)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Limite mensal</p>
                      <p className="font-medium">{formatTokens(a.monthly_token_limit)} tokens</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Limite diário</p>
                      <p className="font-medium">{formatTokens(a.daily_token_limit)} tokens</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Alerta em</p>
                      <p className="font-medium">{a.alert_threshold_pct}% do limite</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Último alerta</p>
                      <p className="font-medium">{a.last_alert_sent_at ? new Date(a.last_alert_sent_at).toLocaleDateString("pt-BR") : "Nunca"}</p>
                    </div>
                  </div>
                  {/* Progress bars for current usage */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Uso mensal</span>
                        <span>{formatTokens(stats.totalTokens)} / {formatTokens(a.monthly_token_limit)}</span>
                      </div>
                      <Progress value={a.monthly_token_limit > 0 ? Math.min((stats.totalTokens / a.monthly_token_limit) * 100, 100) : 0} className="h-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Alert Notifications History ── */}
      {alertNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Histórico de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${n.read ? "bg-muted/30 border-border/50" : "bg-warning/5 border-warning/30"}`}
                >
                  {n.alert_type.includes("exceeded") ? (
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  ) : (
                    <Bell className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {!n.read && (
                    <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => handleMarkAlertRead(n.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Marcar lido
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Alert Settings Dialog ── */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              {editingAlert ? "Editar Alerta" : "Novo Alerta de Uso"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do alerta *</Label>
              <Input placeholder="Ex: Alerta principal" value={alertForm.name} onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Limite mensal (tokens)</Label>
                <Input type="number" value={alertForm.monthly_token_limit} onChange={(e) => setAlertForm({ ...alertForm, monthly_token_limit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Limite diário (tokens)</Label>
                <Input type="number" value={alertForm.daily_token_limit} onChange={(e) => setAlertForm({ ...alertForm, daily_token_limit: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alertar em (% do limite)</Label>
              <Input type="number" min="1" max="100" value={alertForm.alert_threshold_pct} onChange={(e) => setAlertForm({ ...alertForm, alert_threshold_pct: e.target.value })} />
              <p className="text-xs text-muted-foreground">O alerta será disparado quando o uso atingir esse percentual do limite.</p>
            </div>
            <div className="space-y-2">
              <Label>E-mail para notificação</Label>
              <Input type="email" placeholder="admin@escola.com" value={alertForm.alert_email} onChange={(e) => setAlertForm({ ...alertForm, alert_email: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={alertForm.notify_in_app} onCheckedChange={(v) => setAlertForm({ ...alertForm, notify_in_app: v })} />
                <Label className="text-sm">Notificar no sistema</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={alertForm.is_active} onCheckedChange={(v) => setAlertForm({ ...alertForm, is_active: v })} />
                <Label className="text-sm">Ativo</Label>
              </div>
            </div>
            <Button onClick={handleSaveAlert} className="w-full" disabled={savingAlert}>
              {savingAlert && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingAlert ? "Salvar alterações" : "Criar alerta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
