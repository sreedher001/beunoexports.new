import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const MyOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Tables<"orders">[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchOrders = () => {
    if (!user) return;
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false); });
  };

  useEffect(fetchOrders, [user]);

  const cancelOrder = async (e: React.MouseEvent, orderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setBusyId(orderId);
    const { error } = await supabase.rpc("update_order_status", { _order_id: orderId, _status: "cancelled" });
    setBusyId(null);
    if (error) { toast.error(error.message || "Failed to cancel order"); return; }
    toast.success("Order cancelled");
    fetchOrders();
  };

  const reorder = async (e: React.MouseEvent, orderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setBusyId(orderId);
    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    let added = 0;
    let skipped = 0;
    for (const item of items || []) {
      if (!item.product_id) { skipped++; continue; }
      const { data: product } = await supabase.from("products").select("id, stock, is_active").eq("id", item.product_id).maybeSingle();
      if (!product || !product.is_active) { skipped++; continue; }
      let stock = product.stock;
      if (item.variant_id) {
        const { data: variant } = await supabase.from("product_variants").select("id, stock").eq("id", item.variant_id).maybeSingle();
        if (!variant) { skipped++; continue; }
        stock = variant.stock;
      }
      if (stock < 1) { skipped++; continue; }
      const qty = Math.min(item.quantity, stock);
      let query = supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", item.product_id);
      query = item.variant_id ? query.eq("variant_id", item.variant_id) : query.is("variant_id", null);
      const { data: existing } = await query.maybeSingle();
      if (existing) {
        await supabase.from("cart_items").update({ quantity: Math.min(existing.quantity + qty, stock) }).eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert({ user_id: user.id, product_id: item.product_id, variant_id: item.variant_id, quantity: qty });
      }
      added++;
    }
    setBusyId(null);
    if (added === 0) { toast.error("None of these items are available anymore"); return; }
    toast.success(skipped > 0 ? `${added} item(s) added to cart, ${skipped} unavailable` : "Items added to cart");
    navigate("/cart");
  };

  if (!user) return (
    <div className="section-padding text-center">
      <h2 className="mb-2">Login to View Orders</h2>
      <Link to="/auth" className="text-primary hover:underline">Login</Link>
    </div>
  );

  return (
    <div className="section-padding">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">My Orders</h1>
        {loading ? <p className="text-muted-foreground">Loading...</p> : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-4">No orders yet</p>
            <Link to="/shop" className="inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <Link key={o.id} to={`/order-confirmation/${o.id}`}
                className="block rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.order_number}</p>
                    <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{o.total_amount}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${statusColors[o.status] || "bg-muted"}`}>
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 pt-3 border-t border-border">
                  <button onClick={(e) => reorder(e, o.id)} disabled={busyId === o.id}
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                    Reorder
                  </button>
                  {o.status === "pending" && (
                    <button onClick={(e) => cancelOrder(e, o.id)} disabled={busyId === o.id}
                      className="text-xs font-semibold text-destructive hover:underline disabled:opacity-50">
                      Cancel Order
                    </button>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
