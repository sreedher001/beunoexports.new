import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { getBuyNowItem, clearBuyNowItem } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod";
import { Truck, Banknote } from "lucide-react";

const orderSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(10, "Valid phone required").max(15),
  email: z.string().trim().email("Valid email required"),
  address: z.string().trim().min(1, "Address is required").max(500),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(100),
  pincode: z.string().trim().min(6, "Valid pincode required").max(10),
  notes: z.string().max(500).optional(),
});

type CheckoutItem = {
  id: string; quantity: number; product_id: string;
  products: { id: string; name: string; price: number; image_url: string | null; unit: string; sku: string | null };
  product_variants: { id: string; label: string; price: number; sku: string | null } | null;
};

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

type FormState = {
  full_name: string; phone: string; email: string; address: string;
  city: string; state: string; pincode: string; notes: string;
};

const Field = ({ name, label, type = "text", placeholder = "", form, errors, onChange }: {
  name: keyof FormState; label: string; type?: string; placeholder?: string;
  form: FormState; errors: Record<string, string>; onChange: (name: keyof FormState, value: string) => void;
}) => (
  <div>
    <label htmlFor={`checkout-${name}`} className="block text-sm font-medium mb-1">{label}</label>
    <input id={`checkout-${name}`} type={type} value={form[name]} placeholder={placeholder}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30" />
    {errors[name] && <p className="text-xs text-destructive mt-1">{errors[name]}</p>}
  </div>
);

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items: cartItems, loading: cartLoading, clearCart } = useCart();
  const [buyNowItem] = useState(() => getBuyNowItem());
  const isBuyNow = !!buyNowItem;
  const [buyNowCheckoutItem, setBuyNowCheckoutItem] = useState<CheckoutItem | null>(null);
  const [buyNowLoading, setBuyNowLoading] = useState(isBuyNow);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    full_name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", notes: "",
  });
  const updateForm = (name: keyof FormState, value: string) => setForm((f) => ({ ...f, [name]: value }));
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [couponInput, setCouponInput] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [siteSettings, setSiteSettings] = useState({
    flat_shipping_rate: 0, free_shipping_threshold: null as number | null, tax_percent: 0,
    cod_enabled: true, online_payment_enabled: true,
  });

  useEffect(() => {
    supabase.from("site_settings").select("flat_shipping_rate,free_shipping_threshold,tax_percent,cod_enabled,online_payment_enabled").eq("id", true).single()
      .then(({ data }) => { if (data) setSiteSettings(data); });
  }, []);

  // Pick up a coupon applied earlier on the Cart page and re-validate it here
  // (subtotal may differ — e.g. Buy Now vs cart — so never trust the stored discount blindly).
  useEffect(() => {
    const stored = sessionStorage.getItem("appliedCoupon");
    if (stored) {
      try {
        const { code } = JSON.parse(stored) as { code: string };
        if (code) setCouponInput(code);
      } catch { /* ignore malformed value */ }
      sessionStorage.removeItem("appliedCoupon");
    }
  }, []);

  useEffect(() => {
    if (paymentMethod === "cod" && !siteSettings.cod_enabled && siteSettings.online_payment_enabled) setPaymentMethod("online");
    else if (paymentMethod === "online" && !siteSettings.online_payment_enabled && siteSettings.cod_enabled) setPaymentMethod("cod");
  }, [siteSettings, paymentMethod]);

  useEffect(() => {
    if (!buyNowItem) return;
    const load = async () => {
      const { data: product } = await supabase.from("products").select("id,name,price,image_url,unit,sku")
        .eq("id", buyNowItem.product_id).single();
      if (!product) { setBuyNowCheckoutItem(null); setBuyNowLoading(false); return; }

      let variant: { id: string; label: string; price: number; sku: string | null } | null = null;
      if (buyNowItem.variant_id) {
        const { data: v } = await supabase.from("product_variants").select("id,label,price,sku")
          .eq("id", buyNowItem.variant_id).single();
        variant = v || null;
      }

      setBuyNowCheckoutItem({
        id: `buynow-${product.id}-${buyNowItem.variant_id ?? "base"}`,
        quantity: buyNowItem.quantity,
        product_id: product.id,
        products: product,
        product_variants: variant,
      });
      setBuyNowLoading(false);
    };
    load();
  }, [buyNowItem]);

  const checkoutItems: CheckoutItem[] = isBuyNow
    ? (buyNowCheckoutItem ? [buyNowCheckoutItem] : [])
    : cartItems.map((line) => ({
        id: line.key,
        quantity: line.quantity,
        product_id: line.product_id,
        products: { id: line.product.id, name: line.product.name, price: line.product.price, image_url: line.product.image_url, unit: line.product.unit, sku: line.product.sku },
        product_variants: line.variant ? { id: line.variant.id, label: line.variant.label, price: line.variant.price, sku: line.variant.sku } : null,
      }));

  const loading = isBuyNow ? buyNowLoading : cartLoading;

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, email: user.email || f.email }));
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setForm((f) => ({
        ...f,
        full_name: f.full_name || data.full_name || "",
        phone: f.phone || data.phone || "",
        address: f.address || data.address || "",
        city: f.city || data.city || "",
        state: f.state || data.state || "",
        pincode: f.pincode || data.pincode || "",
      }));
    });
  }, [user]);

  const linePrice = (item: CheckoutItem) => item.product_variants?.price ?? item.products.price;
  const subtotal = checkoutItems.reduce((sum, i) => sum + linePrice(i) * i.quantity, 0);
  const discount = appliedCoupon?.discount ?? 0;
  const shipping = siteSettings.free_shipping_threshold != null && subtotal >= siteSettings.free_shipping_threshold
    ? 0 : siteSettings.flat_shipping_rate;
  const tax = Math.round(((subtotal - discount) * siteSettings.tax_percent) / 100 * 100) / 100;
  const total = Math.max(0, subtotal - discount) + shipping + tax;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponApplying(true);
    setCouponError("");
    const { data, error } = await supabase.rpc("validate_coupon", { _code: code, _order_amount: subtotal });
    setCouponApplying(false);
    const result = data?.[0];
    if (error || !result) { setCouponError("Failed to check coupon"); return; }
    if (!result.valid) { setCouponError(result.message); setAppliedCoupon(null); return; }
    setAppliedCoupon({ code, discount: result.discount_amount });
    toast.success(result.message);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  // Auto-apply the coupon carried over from Cart once we know the real subtotal.
  useEffect(() => {
    if (!loading && checkoutItems.length > 0 && couponInput && !appliedCoupon) {
      applyCoupon();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, checkoutItems.length]);

  type PlacedOrder = { order_id: string; order_number: string; guest_access_token: string; total_amount: number };

  // Creates the order. All money fields (price, discount, shipping, tax, total)
  // are computed server-side inside place_order_atomic from the DB — the client
  // only supplies product_id/variant_id/quantity, never a price it computed itself.
  const createOrder = async (): Promise<PlacedOrder | null> => {
    const items = checkoutItems.map((item) => ({
      product_id: item.products.id,
      variant_id: item.product_variants?.id ?? null,
      quantity: item.quantity,
    }));

    const { data, error: orderError } = await supabase.rpc("place_order_atomic", {
      _full_name: form.full_name,
      _phone: form.phone,
      _email: form.email,
      _address: form.address,
      _city: form.city,
      _state: form.state,
      _pincode: form.pincode,
      _notes: form.notes || null,
      _coupon_code: appliedCoupon?.code ?? null,
      _payment_method: paymentMethod,
      _items: items,
    });
    const order = data?.[0];
    if (orderError || !order) {
      toast.error(orderError?.message || "Failed to place order");
      return null;
    }
    return order;
  };

  // Clears the cart/buy-now item, saves the guest access token, fires the
  // confirmation email, and navigates. Called once the order is confirmed
  // placed (COD) or paid (online).
  const finalizeOrder = async (order: PlacedOrder) => {
    if (isBuyNow) {
      clearBuyNowItem();
    } else {
      await clearCart();
    }

    if (!user) {
      try {
        localStorage.setItem(`guest_order_${order.order_id}`, order.guest_access_token);
      } catch { /* localStorage unavailable — guest just won't be able to reload the confirmation page */ }
    }

    // Fire the confirmation email directly so it doesn't depend on a Database Webhook
    // being configured in the Supabase dashboard. Best-effort — never blocks checkout.
    supabase.functions.invoke("send-order-email", {
      body: { type: "INSERT", table: "orders", record: { order_number: order.order_number, total_amount: order.total_amount, email: form.email, status: "pending" } },
    }).catch(() => {});

    toast.success("Order placed successfully! Check your email for confirmation.");
    // No router state is passed — OrderConfirmation re-fetches the order fresh
    // from the DB (by RLS for logged-in users, by guest token otherwise), so it
    // always shows the authoritative, server-computed totals.
    navigate(`/order-confirmation/${order.order_id}`);
  };

  const placeOrderCod = async () => {
    setSubmitting(true);
    const order = await createOrder();
    setSubmitting(false);
    if (!order) return;
    await finalizeOrder(order);
  };

  const loadRazorpayScript = () => new Promise<boolean>((resolve) => {
    if (document.getElementById("razorpay-checkout-js")) { resolve(true); return; }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v2/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const payWithRazorpay = async () => {
    setSubmitting(true);
    const loaded = await loadRazorpayScript();
    if (!loaded) { toast.error("Failed to load payment gateway"); setSubmitting(false); return; }

    // The order is created first (stock reserved, status "pending"); the Razorpay
    // charge amount is then read back from that DB row server-side — never sent
    // by this client — so there is no way to pay less than the real total.
    const order = await createOrder();
    if (!order) { setSubmitting(false); return; }

    const { data: rpOrder, error: rpError } = await supabase.functions.invoke("create-razorpay-order", { body: { order_id: order.order_id } });
    if (rpError || !rpOrder?.id) { toast.error("Failed to start payment"); setSubmitting(false); return; }

    type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
    const RazorpayCtor = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void; on: (e: string, cb: () => void) => void } }).Razorpay;

    const rzp = new RazorpayCtor({
      key: rpOrder.key_id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      order_id: rpOrder.id,
      name: "BuenoExports",
      prefill: { name: form.full_name, email: form.email, contact: form.phone },
      handler: async (response: RazorpayResponse) => {
        const { data: verify } = await supabase.functions.invoke("verify-razorpay-payment", {
          body: { order_id: order.order_id, ...response },
        });
        if (!verify?.valid) {
          toast.error(`Payment verification failed. If money was deducted, contact us with order ${order.order_number}.`);
          setSubmitting(false);
          return;
        }
        await finalizeOrder(order);
        setSubmitting(false);
      },
      modal: { ondismiss: () => setSubmitting(false) },
    });
    rzp.open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = orderSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    if (paymentMethod === "online") {
      await payWithRazorpay();
    } else {
      await placeOrderCod();
    }
  };

  if (loading) return <div className="section-padding text-center text-muted-foreground">Loading...</div>;
  if (checkoutItems.length === 0) return (
    <div className="section-padding text-center">
      <h2 className="mb-4">Your cart is empty</h2>
      <button onClick={() => navigate("/shop")} className="text-primary hover:underline">Go to Shop</button>
    </div>
  );

  return (
    <div className="section-padding">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Delivery Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="full_name" label="Full Name" placeholder="Your full name" form={form} errors={errors} onChange={updateForm} />
                  <Field name="phone" label="Phone" type="tel" placeholder="+91 XXXXX XXXXX" form={form} errors={errors} onChange={updateForm} />
                  <div className="sm:col-span-2"><Field name="email" label="Email" type="email" placeholder="you@example.com" form={form} errors={errors} onChange={updateForm} /></div>
                  <div className="sm:col-span-2"><Field name="address" label="Address" placeholder="House no, street, area..." form={form} errors={errors} onChange={updateForm} /></div>
                  <Field name="city" label="City" placeholder="City" form={form} errors={errors} onChange={updateForm} />
                  <div>
                    <label htmlFor="checkout-state" className="block text-sm font-medium mb-1">State</label>
                    <select id="checkout-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-secondary">
                      <option value="">Select State</option>
                      {indianStates.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
                  </div>
                  <Field name="pincode" label="Pincode" placeholder="6-digit pincode" form={form} errors={errors} onChange={updateForm} />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Payment Method</h3>
                <div className="space-y-3">
                  {siteSettings.cod_enabled && (
                  <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${paymentMethod === "cod" ? "border-secondary bg-secondary/5" : "border-border"}`}>
                    <input type="radio" name="payment_method" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="mt-1" />
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                    </div>
                  </label>
                  )}
                  {siteSettings.online_payment_enabled && (
                  <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${paymentMethod === "online" ? "border-secondary bg-secondary/5" : "border-border"}`}>
                    <input type="radio" name="payment_method" checked={paymentMethod === "online"} onChange={() => setPaymentMethod("online")} className="mt-1" />
                    <Banknote className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Online Payment (Cards / UPI / Netbanking)</p>
                      <p className="text-xs text-muted-foreground">Pay securely via Razorpay</p>
                    </div>
                  </label>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-semibold mb-2">Order Notes (optional)</h3>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  aria-label="Order notes" placeholder="Any special instructions..."
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none resize-none focus:border-secondary" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm sticky top-24">
                <h3 className="font-semibold mb-4">Order Summary</h3>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {checkoutItems.map((item) => (
                    <div key={item.id} className="flex gap-3 text-sm">
                      <img src={item.products.image_url || "/placeholder.svg"} alt={item.products.name} className="h-12 w-12 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{item.products.name}</p>
                        {item.product_variants && <p className="text-xs text-muted-foreground">{item.product_variants.label}</p>}
                        <p className="text-muted-foreground">₹{linePrice(item)} × {item.quantity}</p>
                      </div>
                      <p className="font-semibold">₹{linePrice(item) * item.quantity}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 mb-3">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                      <span className="text-green-700 font-medium">"{appliedCoupon.code}" applied</span>
                      <button type="button" onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-destructive underline">Remove</button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="Coupon code"
                          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
                        <button type="button" onClick={applyCoupon} disabled={couponApplying || !couponInput.trim()}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">
                          {couponApplying ? "..." : "Apply"}
                        </button>
                      </div>
                      {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{discount}</span></div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={shipping === 0 ? "text-green-600" : ""}>{shipping === 0 ? "Free" : `₹${shipping}`}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{tax}</span></div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full mt-6 rounded-lg bg-secondary px-6 py-3 text-sm font-bold text-secondary-foreground shadow-md hover:shadow-lg active:scale-[0.97] disabled:opacity-50">
                  {submitting ? "Placing Order..." : "Place Order"}
                </button>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  {user ? "Our team will contact you to confirm your order." : "Checking out as a guest — create an account any time from your order confirmation to track future orders."}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
