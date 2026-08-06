import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getBuyNowItem, clearBuyNowItem } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { Eye, EyeOff, Truck, Banknote } from "lucide-react";

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
  products: { id: string; name: string; price: number; image_url: string | null; unit: string };
  product_variants: { id: string; label: string; price: number } | null;
};

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [couponInput, setCouponInput] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  // Inline login/signup gate shown only when a guest hits "Place Order"
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [showAuthPw, setShowAuthPw] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const buyNow = getBuyNowItem();

      if (buyNow) {
        setIsBuyNow(true);
        const { data: product } = await supabase.from("products").select("id,name,price,image_url,unit")
          .eq("id", buyNow.product_id).single();
        if (!product) { setCheckoutItems([]); setLoading(false); return; }

        let variant: { id: string; label: string; price: number } | null = null;
        if (buyNow.variant_id) {
          const { data: v } = await supabase.from("product_variants").select("id,label,price")
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
  const total = Math.max(0, subtotal - discount);

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

  const placeOrder = async (asUser: User) => {
    setSubmitting(true);

    const { data: order, error: orderError } = await supabase.from("orders").insert({
      user_id: asUser.id,
      order_number: "temp", // trigger will overwrite
      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      total_amount: total,
      notes: form.notes || null,
      coupon_code: appliedCoupon?.code ?? null,
      discount_amount: discount,
      payment_method: paymentMethod,
    }).select().single();

    if (orderError || !order) {
      toast.error("Failed to place order");
      setSubmitting(false);
      return;
    }

    const orderItems = checkoutItems.map((item) => ({
      order_id: order.id,
      product_id: item.products.id,
      product_name: item.products.name,
      product_image: item.products.image_url,
      quantity: item.quantity,
      price: linePrice(item),
      variant_label: item.product_variants?.label ?? null,
    }));
    await supabase.from("order_items").insert(orderItems);

    if (isBuyNow) {
      clearBuyNowItem();
    } else {
      await supabase.from("cart_items").delete().eq("user_id", asUser.id);
    }

    if (appliedCoupon) await supabase.rpc("redeem_coupon", { _code: appliedCoupon.code });

    toast.success("Order placed successfully!");
    navigate(`/order-confirmation/${order.id}`);
    setSubmitting(false);
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

    if (user) {
      await placeOrder(user);
    } else {
      setAuthEmail(form.email);
      setShowAuthGate(true);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthInfo("");
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    setAuthLoading(false);
    if (error || !data.user) { setAuthError(error?.message || "Login failed"); return; }
    setShowAuthGate(false);
    await placeOrder(data.user);
  };

  const handleGuestSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthInfo("");
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: { data: { full_name: authFullName, phone: authPhone }, emailRedirectTo: window.location.origin },
    });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    if (data.session && data.user) {
      setShowAuthGate(false);
      await placeOrder(data.user);
    } else {
      setAuthInfo("Account created! Check your email to verify, then log in below to complete your order.");
      setAuthMode("login");
    }
  };

  if (loading) return <div className="section-padding text-center text-muted-foreground">Loading...</div>;
  if (checkoutItems.length === 0) return (
    <div className="section-padding text-center">
      <h2 className="mb-4">Your cart is empty</h2>
      <button onClick={() => navigate("/shop")} className="text-primary hover:underline">Go to Shop</button>
    </div>
  );

  const Field = ({ name, label, type = "text", placeholder = "" }: { name: string; label: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type={type} value={form[name as keyof typeof form]} placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30" />
      {errors[name] && <p className="text-xs text-destructive mt-1">{errors[name]}</p>}
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
                  <Field name="full_name" label="Full Name" placeholder="Your full name" />
                  <Field name="phone" label="Phone" type="tel" placeholder="+91 XXXXX XXXXX" />
                  <div className="sm:col-span-2"><Field name="email" label="Email" type="email" placeholder="you@example.com" /></div>
                  <div className="sm:col-span-2"><Field name="address" label="Address" placeholder="House no, street, area..." /></div>
                  <Field name="city" label="City" placeholder="City" />
                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-secondary">
                      <option value="">Select State</option>
                      {indianStates.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
                  </div>
                  <Field name="pincode" label="Pincode" placeholder="6-digit pincode" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Payment Method</h3>
                <div className="space-y-3">
                  <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${paymentMethod === "cod" ? "border-secondary bg-secondary/5" : "border-border"}`}>
                    <input type="radio" name="payment_method" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="mt-1" />
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${paymentMethod === "online" ? "border-secondary bg-secondary/5" : "border-border"}`}>
                    <input type="radio" name="payment_method" checked={paymentMethod === "online"} onChange={() => setPaymentMethod("online")} className="mt-1" />
                    <Banknote className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Online Payment (UPI / Bank Transfer)</p>
                      <p className="text-xs text-muted-foreground">Our team will share a payment link after confirming your order</p>
                    </div>
                  </label>
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
                  <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="text-green-600">Free</span></div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Total</span><span>₹{total}</span></div>
                </div>

                {!showAuthGate ? (
                  <>
                    <button type="submit" disabled={submitting}
                      className="w-full mt-6 rounded-lg bg-secondary px-6 py-3 text-sm font-bold text-secondary-foreground shadow-md hover:shadow-lg active:scale-[0.97] disabled:opacity-50">
                      {submitting ? "Placing Order..." : "Place Order"}
                    </button>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      {user ? "Our team will contact you to confirm your order." : "You'll be asked to sign in on the next step to complete your order."}
                    </p>
                  </>
                ) : (
                  <div className="mt-6 rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold mb-1">{authMode === "login" ? "Login to place your order" : "Create an account to place your order"}</p>
                    <p className="text-xs text-muted-foreground mb-3">Your delivery details are saved — just sign in to continue.</p>

                    {authError && <div className="rounded-lg bg-destructive/10 p-2.5 mb-3 text-xs text-destructive">{authError}</div>}
                    {authInfo && <div className="rounded-lg bg-green-100 p-2.5 mb-3 text-xs text-green-800">{authInfo}</div>}

                    <div className="space-y-3">
                      {authMode === "signup" && (
                        <>
                          <input value={authFullName} onChange={(e) => setAuthFullName(e.target.value)} required placeholder="Full name"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
                          <input value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} placeholder="Phone (optional)"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
                        </>
                      )}
                      <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="Email"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
                      <div className="relative">
                        <input type={showAuthPw ? "text" : "password"} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                          required minLength={6} placeholder="Password"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary pr-9" />
                        <button type="button" onClick={() => setShowAuthPw(!showAuthPw)} className="absolute right-2.5 top-2 text-muted-foreground">
                          {showAuthPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={authLoading}
                        onClick={authMode === "login" ? handleGuestLogin : handleGuestSignup}
                        className="w-full rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-secondary-foreground shadow-md hover:shadow-lg disabled:opacity-50"
                      >
                        {authLoading ? "Please wait..." : authMode === "login" ? "Login & Place Order" : "Sign Up & Place Order"}
                      </button>
                    </div>

                    <p className="text-xs text-center mt-3 text-muted-foreground">
                      {authMode === "login" ? "New here?" : "Already have an account?"}{" "}
                      <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); setAuthInfo(""); }}
                        className="font-semibold text-primary hover:underline">
                        {authMode === "login" ? "Create account" : "Login"}
                      </button>
                    </p>
                    <button type="button" onClick={() => setShowAuthGate(false)} className="block w-full text-center text-xs text-muted-foreground hover:underline mt-2">
                      Back to edit order
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
