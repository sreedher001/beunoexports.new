import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type LowStockRow = { id: string; name: string; stock: number; variantLabel?: string };

const STATUS_COLORS: Record<string, string> = {
  pending: "#eab308", confirmed: "#3b82f6", shipped: "#a855f7", delivered: "#22c55e", cancelled: "#ef4444",
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState<Tables<"orders">[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<{ date: string; revenue: number }[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ status: string; count: number }[]>([]);
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      const [{ count: pCount }, { count: oCount }, { count: uCount }, { data: orders }, { data: recentOrdersData }, { data: settings }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total_amount,status,created_at").gte("created_at", cutoff.toISOString()),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("site_settings").select("low_stock_threshold").eq("id", true).single(),
      ]);

      const revenue = (orders || []).reduce((s, o) => s + Number(o.total_amount), 0);
      setStats({ products: pCount || 0, orders: oCount || 0, users: uCount || 0, revenue });
      setRecentOrders((recentOrdersData as Tables<"orders">[]) || []);

      const byDay = new Map<string, number>();
      const byStatus = new Map<string, number>();
      (orders || []).forEach((o) => {
        const day = o.created_at.slice(5, 10);
        byDay.set(day, (byDay.get(day) || 0) + Number(o.total_amount));
        byStatus.set(o.status, (byStatus.get(o.status) || 0) + 1);
      });
      setRevenueByDay(Array.from(byDay.entries()).map(([date, revenue]) => ({ date, revenue })));
      setStatusBreakdown(Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })));

      const threshold = settings?.low_stock_threshold ?? 5;
      const [{ data: lowProducts }, { data: lowVariants }] = await Promise.all([
        supabase.from("products").select("id,name,stock").eq("is_active", true).lte("stock", threshold),
        supabase.from("product_variants").select("id,label,stock,products(name)").lte("stock", threshold),
      ]);
      const rows: LowStockRow[] = [
        ...(lowProducts || []).map((p) => ({ id: p.id, name: p.name, stock: p.stock })),
        ...(lowVariants || []).map((v) => ({
          id: v.id,
          name: (v as unknown as { products: { name: string } }).products?.name || "Unknown product",
          stock: v.stock,
          variantLabel: v.label,
        })),
      ];
      setLowStock(rows);
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

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Revenue — Last 30 Days</h3>
          {revenueByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders in the last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => [`₹${v}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Orders by Status — Last 30 Days</h3>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders in the last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 shadow-sm mb-8">
          <div className="p-5 border-b border-destructive/20 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="font-semibold">Low Stock ({lowStock.length})</h3>
          </div>
          <div className="divide-y divide-border">
            {lowStock.map((row) => (
              <Link key={row.id} to="/admin/products" className="flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/50">
                <span>{row.name}{row.variantLabel ? ` (${row.variantLabel})` : ""}</span>
                <span className="font-semibold text-destructive">{row.stock} left</span>
              </Link>
            ))}
          </div>
        </div>
      )}

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
