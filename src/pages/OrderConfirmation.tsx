import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ConfirmationItem = { product_name: string; variant_label: string | null; quantity: number; price: number };
type NavState = { guestOrder?: boolean; order?: Partial<Tables<"orders">>; items?: ConfirmationItem[] };

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navState = location.state as NavState | null;
  const [order, setOrder] = useState<Partial<Tables<"orders">> | null>(navState?.order ?? null);
  const [items, setItems] = useState<ConfirmationItem[]>(navState?.items ?? []);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (navState?.order || !orderId) return;

    const load = async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (data) {
        setOrder(data);
        const { data: orderItems } = await supabase.from("order_items").select("*").eq("order_id", orderId);
        setItems(orderItems || []);
        return;
      }

      // RLS blocked it (guest / not the owner) — try the token saved at checkout time.
      let token: string | null = null;
      try { token = localStorage.getItem(`guest_order_${orderId}`); } catch { /* ignore */ }
      if (token) {
        const { data: guestData } = await supabase.rpc("get_guest_order", { _order_id: orderId, _token: token });
        const result = guestData as { order: Tables<"orders">; items: ConfirmationItem[] } | null;
        if (result?.order) {
          setOrder(result.order);
          setItems(result.items || []);
          return;
        }
      }

      setNotFound(true);
    };
    load();
  }, [orderId, navState]);

  if (notFound) return (
    <div className="section-padding text-center">
      <h2 className="mb-2">Order details unavailable</h2>
      <p className="text-sm text-muted-foreground">This confirmation page can only be viewed right after checkout, or by a logged-in account. Check your email for order details.</p>
    </div>
  );
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
            {order.coupon_code && (
              <p className="text-sm"><strong>Coupon:</strong> {order.coupon_code} (-₹{order.discount_amount})</p>
            )}
            {!!order.shipping_amount && <p className="text-sm"><strong>Shipping:</strong> ₹{order.shipping_amount}</p>}
            {!!order.tax_amount && <p className="text-sm"><strong>Tax:</strong> ₹{order.tax_amount}</p>}
            <p className="text-sm"><strong>Total:</strong> ₹{order.total_amount}</p>
          </div>

          <div className="text-left mb-6">
            <h3 className="font-semibold mb-3">Order Items</h3>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm p-2 rounded bg-muted">
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
