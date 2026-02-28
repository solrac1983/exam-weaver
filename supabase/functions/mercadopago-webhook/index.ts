import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MP_API_URL = "https://api.mercadopago.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured");
    }

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Mercado Pago sends different notification types
    if (body.type !== "payment" && body.action !== "payment.updated" && body.action !== "payment.created") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.log("No payment ID in webhook body");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from Mercado Pago
    const mpResponse = await fetch(`${MP_API_URL}/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      const errData = await mpResponse.text();
      throw new Error(`MP payment fetch failed [${mpResponse.status}]: ${errData}`);
    }

    const payment = await mpResponse.json();
    console.log("Payment details:", JSON.stringify({
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount,
    }));

    const invoiceId = payment.external_reference;
    if (!invoiceId) {
      console.log("No external_reference (invoice_id) in payment");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to update invoice
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (payment.status === "approved") {
      // Update invoice to paid
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_date: new Date().toISOString().split("T")[0],
          notes: `Pago via Mercado Pago (ID: ${payment.id}). Método: ${payment.payment_type_id || "N/A"}`,
        })
        .eq("id", invoiceId);

      if (updateError) {
        console.error("Error updating invoice:", updateError);
        throw new Error(`Failed to update invoice: ${updateError.message}`);
      }

      // Unblock company if no more overdue invoices
      const { data: invoice } = await supabase
        .from("invoices")
        .select("company_id")
        .eq("id", invoiceId)
        .single();

      if (invoice?.company_id) {
        const { data: overdueInvoices } = await supabase
          .from("invoices")
          .select("id")
          .eq("company_id", invoice.company_id)
          .eq("status", "overdue");

        if (!overdueInvoices || overdueInvoices.length === 0) {
          await supabase
            .from("companies")
            .update({ billing_blocked: false })
            .eq("id", invoice.company_id);
        }
      }

      console.log(`Invoice ${invoiceId} marked as paid`);
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      console.log(`Payment ${payment.status} for invoice ${invoiceId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
