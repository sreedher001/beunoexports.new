import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getBuyNowItem, clearBuyNowItem } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";
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
    <label className="block text-sm font-medium mb-1">{label}</label>
    <input type={type} value={form[name]} placeholder={placeholder}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30" />
    {errors[name] && <p className="text-xs text-destructive mt-1">{errors[name]}</p>}
  </div>
);

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [loading, setLoading] = useState(true);
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
    const load = async () => {
      const buyNow = getBuyNowItem();

      if (buyNow) {
        setIsBuyNow(true);
        const { data: product } = await supabase.from("products").select("id,name,price,image_url,unit,sku")
          .eq("id", buyNow.product_id).single();
        if (!product) { setCheckoutItems([]); setLoading(false); return; }

        let variant: { id: string; label: string; price: number; sku: string | null } | null = null;
        if (buyNow.variant_id) {
          const { data: v } = await supabase.from("product_variants").select("id,label,price,sku")
            .eq("id", buyNow.variant_id).single();
          variant = v || null;
        }

        setCheckoutItems([{
          id: `buynow-${product.id}-${buyNow.variant_id ?? "base"}`,
          quantity: buyNow.quantity,
          product_id: product.id,
          products: product,
          product_variants: variant,
        }]);
        setLoading(false);
      } else if (user) {
        setIsBuyNow(false);
        const { data } = await supabase.from("cart_items").select("*, products(*), product_variants(*)").eq("user_id", user.id);
        setCheckoutItems((data as unknown as CheckoutItem[]) || []);
        setLoading(false);
      } else {
        setCheckoutItems([]);
        setLoading(false);
      }
    };
    load();
  }, [user]);

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

  const placeOrder = async (
    asUser: User | null,
    payment?: { status: "paid"; razorpay_order_id: string; razorpay_payment_id: string }
  ) => {
    setSubmitting(true);

    const items = checkoutItems.map((item) => ({
      product_id: item.products.id,
      variant_id: item.product_variants?.id ?? null,
      product_name: item.products.name,
      product_image: item.products.image_url,
      quantity: item.quantity,
      price: linePrice(item),
      variant_label: item.product_variants?.label ?? null,
      sku: item.product_variants?.sku ?? item.products.sku ?? null,
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
      _discount_amount: discount,
      _payment_method: paymentMethod,
      _items: items,
      _shipping_amount: shipping,
      _tax_amount: tax,
      _payment_status: payment?.status ?? "pending",
      _razorpay_order_id: payment?.razorpay_order_id ?? null,
      _razorpay_payment_id: payment?.razorpay_payment_id ?? null,
    });
    const order = data?.[0];

    if (orderError || !order) {
      toast.error(orderError?.message || "Failed to place order");
      setSubmitting(false);
      return;
    }

    if (isBuyNow) {
      clearBuyNowItem();
    } else if (asUser) {
      await supabase.from("cart_items").delete().eq("user_id", asUser.id);
    }

    if (!asUser) {
      try {
        localStorage.setItem(`guest_order_${order.order_id}`, order.guest_access_token);
      } catch { /* localStorage unavailable — guest just won't be able to reload the confirmation page */ }
    }

    if (appliedCoupon) await supabase.rpc("redeem_coupon", { _code: appliedCoupon.code });

    // Fire the confirmation email directly so it doesn't depend on a Database Webhook
    // being configured in the Supabase dashboard. Best-effort — never blocks checkout.
    supabase.functions.invoke("send-order-email", {
      body: { type: "INSERT", table: "orders", record: { order_number: order.order_number, total_amount: total, email: form.email, status: "pending" } },
    }).catch(() => {});

    toast.success("Order placed successfully! Check your email for confirmation.");
    navigate(`/order-confirmation/${order.order_id}`, {
      state: {
        guestOrder: !asUser,
        order: { ...form, order_number: order.order_number, total_amount: total, coupon_code: appliedCoupon?.code ?? null, discount_amount: discount, shipping_amount: shipping, tax_amount: tax },
        items: checkoutItems.map((item) => ({
          product_name: item.products.name,
          variant_label: item.product_variants?.label ?? null,
          quantity: item.quantity,
          price: linePrice(item),
        })),
      },
    });
    setSubmitting(false);
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

    const { data: rpOrder, error: rpError } = await supabase.functions.invoke("create-razorpay-order", { body: { amount: total } });
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
        const { data: verify } = await supabase.functions.invoke("verify-razorpay-payment", { body: response });
        if (!verify?.valid) { toast.error("Payment verification failed"); setSubmitting(false); return; }
        await placeOrder(user, { status: "paid", razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id });
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
      await placeOrder(user);
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
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Delivery Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="full_name" label="Full Name" placeholder="Your full name" form={form} errors={errors} onChange={updateForm} />
                  <Field name="phone" label="Phone" type="tel" placeholder="+91 XXXXX XXXXX" form={form} errors={errors} onChange={updateForm} />
                  <div className="sm:col-span-2"><Field name="email" label="Email" type="email" placeholder="you@example.com" form={form} errors={errors} onChange={updateForm} /></div>
                  <div className="sm:col-span-2"><Field name="address" label="Address" placeholder="House no, street, area..." form={form} errors={errors} onChange={updateForm} /></div>
                  <Field name="city" label="City" placeholder="City" form={form} errors={errors} onChange={updateForm} />
                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
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
                  placeholder="Any special instructions..."
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none resize-none focus:border-secondary" />
              </div>
            </div>

            <div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm sticky top-24">
                <h3 className="font-semibold mb-4">Order Summary</h3>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {checkoutItems.map((item) => (
                    <div key={item.id} className="flex gap-3 text-sm">
                      <img src={item.products.image_url || "/placeholder.svg"} alt="" className="h-12 w-12 rounded object-cover" />
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
                          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
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
