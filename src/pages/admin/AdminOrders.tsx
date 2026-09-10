import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Printer, Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const statusOptions = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Tables<"orders">[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Tables<"orders"> | null>(null);
  const [orderItems, setOrderItems] = useState<Tables<"order_items">[]>([]);
  const [filter, setFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data as Tables<"orders">[]) || []);
  };

  useEffect(() => { fetchOrders(); }, []);

  const viewOrder = async (order: Tables<"orders">) => {
    setSelectedOrder(order);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    setOrderItems(data || []);
  };

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.rpc("update_order_status", { _order_id: orderId, _status: status });
    if (error) { toast.error(error.message || "Failed to update status"); return; }
    toast.success(`Status updated to ${status}`);
    fetchOrders();
    if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status });
  };

  const filtered = orders.filter((o) => {
    const matchStatus = filter === "all" || o.status === filter;
    const orderDate = o.created_at.slice(0, 10);
    const matchFrom = !dateFrom || orderDate >= dateFrom;
    const matchTo = !dateTo || orderDate <= dateTo;
    return matchStatus && matchFrom && matchTo;
  });
  const filteredRevenue = filtered.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const exportCsv = () => {
    const headers = ["Order Number", "Date", "Customer", "Phone", "Email", "Status", "Payment Method", "Payment Status", "Total"];
    const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = filtered.map((o) => [
      o.order_number,
      new Date(o.created_at).toLocaleDateString("en-IN"),
      o.full_name,
      o.phone,
      o.email,
      o.status,
      o.payment_method,
      o.payment_status,
      String(o.total_amount),
    ].map(csvEscape).join(","));
    const csv = [headers.map(csvEscape).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Orders ({orders.length})</h1>
        <button onClick={exportCsv} disabled={filtered.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", ...statusOptions].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
            Clear dates
          </button>
        )}
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">{filtered.length} order{filtered.length !== 1 ? "s" : ""} · Revenue</p>
          <p className="text-lg font-bold">₹{filteredRevenue.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {filtered.map((o) => (
              <button key={o.id} onClick={() => viewOrder(o)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedOrder?.id === o.id ? "bg-muted/50" : ""}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{o.full_name} • {o.phone}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">₹{o.total_amount}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${statusColors[o.status] || "bg-muted"}`}>{o.status}</span>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">No orders</p>}
          </div>
        </div>

        {selectedOrder && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Order Details — {selectedOrder.order_number}</h3>
              <Link to={`/admin/print-invoice/${selectedOrder.id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                <Printer className="h-3.5 w-3.5" /> Print Bill
              </Link>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <p><strong>Customer:</strong> {selectedOrder.full_name}</p>
              <p><strong>Phone:</strong> {selectedOrder.phone}</p>
              <p><strong>Email:</strong> {selectedOrder.email}</p>
              <p><strong>Address:</strong> {selectedOrder.address}, {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</p>
              {selectedOrder.notes && <p><strong>Notes:</strong> {selectedOrder.notes}</p>}
              {selectedOrder.coupon_code && (
                <p><strong>Coupon:</strong> {selectedOrder.coupon_code} (-₹{selectedOrder.discount_amount})</p>
              )}
              <p><strong>Total:</strong> ₹{selectedOrder.total_amount}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Update Status</label>
              <select value={selectedOrder.status} onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none">
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <h4 className="font-medium mb-2 text-sm">Items</h4>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.id} className="flex gap-3 p-2 rounded bg-muted text-sm">
                  {item.product_image && <img src={item.product_image} alt="" className="h-10 w-10 rounded object-cover" />}
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ₹{item.price}{item.sku ? ` · SKU: ${item.sku}` : ""}</p>
                  </div>
                  <p className="font-semibold">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
