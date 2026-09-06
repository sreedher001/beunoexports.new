// Supabase Edge Function: finds carts untouched for 24h+ and emails a reminder via Resend.
// Deploy with: supabase functions deploy abandoned-cart-check
// Requires secrets: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (the last two
// are auto-injected by Supabase for Edge Functions, no need to set them manually).
//
// Schedule with pg_cron (run once in the SQL Editor, project must have pg_cron + pg_net enabled):
//   select cron.schedule('abandoned-cart-check', '0 */6 * * *', $$
//     select net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/abandoned-cart-check',
//       headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
//     );
//   $$);

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOURS_UNTIL_ABANDONED = 24;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const cutoff = new Date(Date.now() - HOURS_UNTIL_ABANDONED * 3600 * 1000).toISOString();

    const { data: carts, error } = await supabase
      .from("cart_items")
      .select("user_id, product_id, quantity, updated_at, products(name)")
      .lt("updated_at", cutoff);

    if (error) throw error;
    if (!carts || carts.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const byUser = new Map<string, { name: string }[]>();
    for (const row of carts) {
      const list = byUser.get(row.user_id) || [];
      list.push({ name: (row as unknown as { products: { name: string } }).products?.name || "an item" });
      byUser.set(row.user_id, list);
    }

    let sent = 0;
    if (resendKey) {
      for (const [userId] of byUser) {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const email = userData?.user?.email;
        if (!email) continue;

        const items = byUser.get(userId)!.map((i) => i.name).join(", ");
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "orders@yourdomain.com",
            to: email,
            subject: "You left something in your cart!",
            html: `<p>You still have ${items} waiting in your cart. Complete your order before stock runs out!</p>`,
          }),
        });
        sent++;
      }
    }

    return new Response(JSON.stringify({ carts: byUser.size, sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
