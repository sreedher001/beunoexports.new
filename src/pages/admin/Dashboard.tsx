import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, Users, TrendingUp } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState<Tables<"orders">[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ count: pCount }, { count: oCount }, { count: uCount }, { data: orders }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      const revenue = (orders || []).reduce((s: number, o: Tables<"orders">) => s + Number(o.total_amount), 0);
      setStats({ products: pCount || 0, orders: oCount || 0, users: uCount || 0, revenue });
      setRecentOrders((orders as Tables<"orders">[]) || []);
    };
    load();
  }, []);

  const statCards = [
    { label: "Products", value: stats.products, icon: Package, color: "bg-blue-100 text-blue-600" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, color: "bg-green-100 text-green-600" },
    { label: "Users", value: stats.users, icon: Users, color: "bg-purple-100 text-purple-600" },
    { label: "Revenue", value: `₹${stats.revenue}`, icon: TrendingUp, color: "bg-orange-100 text-orange-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-5 border-b border-border"><h3 className="font-semibold">Recent Orders</h3></div>
        <div className="divide-y divide-border">
          {recentOrders.map((o) => (
            <div key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium">{o.order_number}</p>
                <p className="text-xs text-muted-foreground">{o.full_name} • {new Date(o.created_at).toLocaleDateString("en-IN")}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">₹{o.total_amount}</p>
                <span className="text-xs capitalize">{o.status}</span>
              </div>
            </div>
          ))}
          {recentOrders.length === 0 && <p className="p-5 text-sm text-muted-foreground">No orders yet</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
