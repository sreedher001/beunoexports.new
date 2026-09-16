// Supabase Edge Function: sends order-confirmation / status-update emails via Resend.
// Deploy with: supabase functions deploy send-order-email
// Requires secret: RESEND_API_KEY
//
// Wire this up as a Supabase Database Webhook (Dashboard -> Database -> Webhooks):
//   - Table: orders, Events: INSERT and UPDATE, calling this function's URL.
// The webhook payload shape is { type: "INSERT"|"UPDATE", table, record, old_record }.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = "orders@buenoexports.com"; // must be a Resend-verified sending domain

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

    const orderNumber = escapeHtml(order.order_number);
    const status = escapeHtml(order.status);
    const totalAmount = escapeHtml(order.total_amount);

    const subject = isNew
      ? `Order Confirmed - ${order.order_number}`
      : `Order ${order.order_number} is now ${order.status}`;

    const html = isNew
      ? `<h2>Thank you for your order!</h2><p>Order #: <strong>${orderNumber}</strong></p><p>Total: ₹${totalAmount}</p><p>We'll notify you as your order progresses.</p>`
      : `<h2>Order Update</h2><p>Order #: <strong>${orderNumber}</strong></p><p>Status: <strong>${status}</strong></p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: order.email, subject, html }),
    });

    let customerEmailError: string | null = null;
    if (!res.ok) customerEmailError = await res.text();

    // Also notify the store admin at the same address configured for
    // contact-form submissions (Admin -> SEO -> Contact Form Notification Email).
    if (isNew) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, anonKey);
      const { data: settings } = await supabase.from("site_settings").select("contact_notification_email").eq("id", true).single();
      const notifyEmail = settings?.contact_notification_email;

      if (notifyEmail) {
        const adminHtml = `<h2>New Order Received</h2>
          <p><strong>Order #:</strong> ${orderNumber}</p>
          <p><strong>Customer:</strong> ${escapeHtml(order.full_name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(order.email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(order.phone)}</p>
          <p><strong>Total:</strong> ₹${totalAmount}</p>
          <p><strong>Address:</strong> ${escapeHtml(order.address)}, ${escapeHtml(order.city)}, ${escapeHtml(order.state)} - ${escapeHtml(order.pincode)}</p>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: FROM_EMAIL, to: notifyEmail, subject: `New Order - ${orderNumber}`, html: adminHtml }),
        });
      }
    }

    if (customerEmailError) {
      return new Response(JSON.stringify({ error: customerEmailError }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ sent: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
