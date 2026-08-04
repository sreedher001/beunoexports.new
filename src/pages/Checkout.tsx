import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

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

type CartItemWithProduct = {
  id: string; quantity: number; product_id: string;
  products: { id: string; name: string; price: number; image_url: string | null; unit: string };
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
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", notes: "",
  });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    // Pre-fill from profile
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setForm((f) => ({
        ...f,
        full_name: data.full_name || "",
        phone: data.phone || "",
        email: user.email || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        pincode: data.pincode || "",
      }));
      else setForm((f) => ({ ...f, email: user.email || "" }));
    });

    supabase.from("cart_items").select("*, products(*)").eq("user_id", user.id)
      .then(({ data }) => { setCartItems((data as unknown as CartItemWithProduct[]) || []); setLoading(false); });
  }, [user, navigate]);

  const total = cartItems.reduce((sum, i) => sum + i.products.price * i.quantity, 0);

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
    setSubmitting(true);

    // Create order
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      user_id: user!.id,
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
    }).select().single();

    if (orderError || !order) {
      toast.error("Failed to place order");
      setSubmitting(false);
      return;
    }

    // Create order items
    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.products.id,
      product_name: item.products.name,
      product_image: item.products.image_url,
      quantity: item.quantity,
      price: item.products.price,
    }));
    await supabase.from("order_items").insert(orderItems);

    // Clear cart
    await supabase.from("cart_items").delete().eq("user_id", user!.id);

    // Google Sheets integration will be added later

    toast.success("Order placed successfully!");
    navigate(`/order-confirmation/${order.id}`);
    setSubmitting(false);
  };

  if (loading) return <div className="section-padding text-center text-muted-foreground">Loading...</div>;
  if (cartItems.length === 0) return (
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
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3 text-sm">
                      <img src={item.products.image_url || "/placeholder.svg"} alt="" className="h-12 w-12 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{item.products.name}</p>
                        <p className="text-muted-foreground">₹{item.products.price} × {item.quantity}</p>
                      </div>
                      <p className="font-semibold">₹{item.products.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{total}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="text-green-600">Free</span></div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Total</span><span>₹{total}</span></div>
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full mt-6 rounded-lg bg-secondary px-6 py-3 text-sm font-bold text-secondary-foreground shadow-md hover:shadow-lg active:scale-[0.97] disabled:opacity-50">
                  {submitting ? "Placing Order..." : "Place Order"}
                </button>
                <p className="text-xs text-muted-foreground mt-3 text-center">Our team will contact you with payment details after order confirmation.</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
