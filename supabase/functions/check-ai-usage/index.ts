import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch active alert settings
    const { data: settings, error: settingsErr } = await supabase
      .from("ai_alert_settings")
      .select("*")
      .eq("is_active", true);

    if (settingsErr || !settings?.length) {
      return new Response(JSON.stringify({ message: "No active alert settings" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // Get monthly token usage
    const { data: monthlyLogs } = await supabase
      .from("ai_usage_logs")
      .select("total_tokens")
      .gte("created_at", startOfMonth);

    const monthlyTokens = (monthlyLogs || []).reduce((sum: number, l: any) => sum + (l.total_tokens || 0), 0);

    // Get daily token usage
    const { data: dailyLogs } = await supabase
      .from("ai_usage_logs")
      .select("total_tokens")
      .gte("created_at", startOfDay);

    const dailyTokens = (dailyLogs || []).reduce((sum: number, l: any) => sum + (l.total_tokens || 0), 0);

    const alerts: { alert_type: string; message: string; tokens_used: number; token_limit: number; percentage: number }[] = [];

    for (const setting of settings) {
      const thresholdPct = setting.alert_threshold_pct || 80;

      // Check monthly limit
      if (setting.monthly_token_limit > 0) {
        const monthlyPct = (monthlyTokens / setting.monthly_token_limit) * 100;

        if (monthlyPct >= 100) {
          alerts.push({
            alert_type: "monthly_exceeded",
            message: `⚠️ Limite mensal de tokens EXCEDIDO! Uso: ${monthlyTokens.toLocaleString()} / ${setting.monthly_token_limit.toLocaleString()} tokens (${monthlyPct.toFixed(1)}%)`,
            tokens_used: monthlyTokens,
            token_limit: setting.monthly_token_limit,
            percentage: monthlyPct,
          });
        } else if (monthlyPct >= thresholdPct) {
          alerts.push({
            alert_type: "monthly_threshold",
            message: `🔔 Uso mensal de tokens atingiu ${monthlyPct.toFixed(1)}% do limite. Uso: ${monthlyTokens.toLocaleString()} / ${setting.monthly_token_limit.toLocaleString()} tokens`,
            tokens_used: monthlyTokens,
            token_limit: setting.monthly_token_limit,
            percentage: monthlyPct,
          });
        }
      }

      // Check daily limit
      if (setting.daily_token_limit > 0) {
        const dailyPct = (dailyTokens / setting.daily_token_limit) * 100;

        if (dailyPct >= 100) {
          alerts.push({
            alert_type: "daily_exceeded",
            message: `⚠️ Limite diário de tokens EXCEDIDO! Uso: ${dailyTokens.toLocaleString()} / ${setting.daily_token_limit.toLocaleString()} tokens (${dailyPct.toFixed(1)}%)`,
            tokens_used: dailyTokens,
            token_limit: setting.daily_token_limit,
            percentage: dailyPct,
          });
        } else if (dailyPct >= thresholdPct) {
          alerts.push({
            alert_type: "daily_threshold",
            message: `🔔 Uso diário de tokens atingiu ${dailyPct.toFixed(1)}% do limite. Uso: ${dailyTokens.toLocaleString()} / ${setting.daily_token_limit.toLocaleString()} tokens`,
            tokens_used: dailyTokens,
            token_limit: setting.daily_token_limit,
            percentage: dailyPct,
          });
        }
      }

      // Update last_alert_sent_at if we generated alerts
      if (alerts.length > 0) {
        await supabase
          .from("ai_alert_settings")
          .update({ last_alert_sent_at: now.toISOString() })
          .eq("id", setting.id);
      }
    }

    // Insert alert notifications
    if (alerts.length > 0) {
      // Check if we already sent a similar alert today to avoid spam
      const { data: existingAlerts } = await supabase
        .from("ai_alert_notifications")
        .select("alert_type")
        .gte("created_at", startOfDay);

      const existingTypes = new Set((existingAlerts || []).map((a: any) => a.alert_type));
      const newAlerts = alerts.filter(a => !existingTypes.has(a.alert_type));

      if (newAlerts.length > 0) {
        await supabase.from("ai_alert_notifications").insert(newAlerts);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      monthly_tokens: monthlyTokens,
      daily_tokens: dailyTokens,
      alerts_generated: alerts.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-ai-usage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
