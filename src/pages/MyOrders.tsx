import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package } from "lucide-react";
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
  const [orders, setOrders] = useState<Tables<"orders">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false); });
  }, [user]);

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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
