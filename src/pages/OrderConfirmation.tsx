import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Tables<"orders"> | null>(null);
  const [items, setItems] = useState<Tables<"order_items">[]>([]);

  useEffect(() => {
    if (!orderId) return;
    supabase.from("orders").select("*").eq("id", orderId).single().then(({ data }) => setOrder(data));
    supabase.from("order_items").select("*").eq("order_id", orderId).then(({ data }) => setItems(data || []));
  }, [orderId]);

  if (!order) return <div className="section-padding text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="section-padding">
      <div className="container mx-auto max-w-2xl text-center">
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-4">Thank you for your order. Our team will contact you shortly with payment details.</p>
          <div className="rounded-lg bg-muted p-4 mb-6 text-left">
            <p className="text-sm"><strong>Order #:</strong> {order.order_number}</p>
            <p className="text-sm"><strong>Name:</strong> {order.full_name}</p>
            <p className="text-sm"><strong>Phone:</strong> {order.phone}</p>
            <p className="text-sm"><strong>Address:</strong> {order.address}, {order.city}, {order.state} - {order.pincode}</p>
            <p className="text-sm"><strong>Total:</strong> ₹{order.total_amount}</p>
          </div>

          <div className="text-left mb-6">
            <h3 className="font-semibold mb-3">Order Items</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm p-2 rounded bg-muted">
                  <span>{item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""} × {item.quantity}</span>
                  <span className="font-semibold">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/my-orders" className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
              View My Orders
            </Link>
            <Link to="/shop" className="rounded-lg border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
