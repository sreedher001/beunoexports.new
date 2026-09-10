import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Printer, ArrowLeft } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const PrintInvoice = () => {
  const { orderId } = useParams();
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Tables<"orders"> | null>(null);
  const [items, setItems] = useState<Tables<"order_items">[]>([]);

  useEffect(() => {
    if (!orderId || !isAdmin) return;
    supabase.from("orders").select("*").eq("id", orderId).single().then(({ data }) => setOrder(data));
    supabase.from("order_items").select("*").eq("order_id", orderId).then(({ data }) => setItems(data || []));
  }, [orderId, isAdmin]);

  if (authLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!isAdmin) return (
    <div className="p-8 text-center">
      <h2 className="mb-4">Access Denied</h2>
      <button onClick={() => navigate("/")} className="text-primary hover:underline">Go Home</button>
    </div>
  );
  if (!order) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="min-h-screen bg-muted/30 p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link to="/admin/orders" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </Link>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:shadow-lg">
            <Printer className="h-4 w-4" /> Print / Send to Printer
          </button>
        </div>

        <div className="rounded-xl border border-border bg-white p-8 shadow-sm print:border-0 print:shadow-none print:rounded-none">
          <div className="flex items-start justify-between border-b border-border pb-6 mb-6">
            <div>
              <h1 className="text-xl font-bold">BuenoExports</h1>
              <p className="text-xs text-muted-foreground">Premium Indian Spices Exporter</p>
              <p className="text-xs text-muted-foreground">info@buenoexports.com · +91 84284 50081</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold">INVOICE</h2>
              <p className="text-xs text-muted-foreground">#{order.order_number}</p>
              <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Bill To</p>
              <p className="font-medium">{order.full_name}</p>
              <p className="text-muted-foreground">{order.phone}</p>
              <p className="text-muted-foreground">{order.email}</p>
              <p className="text-muted-foreground">{order.address}, {order.city}, {order.state} - {order.pincode}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Payment</p>
              <p className="capitalize">{order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}</p>
              <p className="text-muted-foreground capitalize">Status: {order.payment_status}</p>
              <p className="text-muted-foreground capitalize">Order Status: {order.status}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Item</th>
                <th className="py-2">SKU</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2">{item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</td>
                  <td className="py-2 font-mono text-xs">{item.sku || "—"}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">₹{item.price}</td>
                  <td className="py-2 text-right font-medium">₹{item.price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-56 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal}</span></div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600"><span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span><span>-₹{order.discount_amount}</span></div>
              )}
              {order.shipping_amount > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>₹{order.shipping_amount}</span></div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{order.tax_amount}</span></div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 font-bold text-base">
                <span>Total</span><span>₹{order.total_amount}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="mt-6 border-t border-border pt-4 text-sm">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</p>
              <p className="text-muted-foreground">{order.notes}</p>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
};

export default PrintInvoice;
