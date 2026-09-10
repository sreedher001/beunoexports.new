// Supabase Edge Function: sends order-confirmation / status-update emails via Resend.
// Deploy with: supabase functions deploy send-order-email
// Requires secret: RESEND_API_KEY
//
// Wire this up as a Supabase Database Webhook (Dashboard -> Database -> Webhooks):
//   - Table: orders, Events: INSERT and UPDATE, calling this function's URL.
// The webhook payload shape is { type: "INSERT"|"UPDATE", table, record, old_record }.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = "orders@beunoexports.com"; // must be a Resend-verified sending domain

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const order = payload.record;
    const isNew = payload.type === "INSERT";
    const statusChanged = payload.type === "UPDATE" && payload.old_record?.status !== order.status;

    if (!isNew && !statusChanged) {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Resend is not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const subject = isNew
      ? `Order Confirmed - ${order.order_number}`
      : `Order ${order.order_number} is now ${order.status}`;

    const html = isNew
      ? `<h2>Thank you for your order!</h2><p>Order #: <strong>${order.order_number}</strong></p><p>Total: ₹${order.total_amount}</p><p>We'll notify you as your order progresses.</p>`
      : `<h2>Order Update</h2><p>Order #: <strong>${order.order_number}</strong></p><p>Status: <strong>${order.status}</strong></p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: order.email, subject, html }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ sent: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
