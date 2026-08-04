import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
    await supabase.from("orders").update({ status }).eq("id", orderId);
    toast.success(`Status updated to ${status}`);
    fetchOrders();
    if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status });
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders ({orders.length})</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", ...statusOptions].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {s}
          </button>
        ))}
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
            <h3 className="font-semibold mb-4">Order Details — {selectedOrder.order_number}</h3>
            <div className="space-y-2 text-sm mb-4">
              <p><strong>Customer:</strong> {selectedOrder.full_name}</p>
              <p><strong>Phone:</strong> {selectedOrder.phone}</p>
              <p><strong>Email:</strong> {selectedOrder.email}</p>
              <p><strong>Address:</strong> {selectedOrder.address}, {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</p>
              {selectedOrder.notes && <p><strong>Notes:</strong> {selectedOrder.notes}</p>}
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
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ₹{item.price}</p>
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
