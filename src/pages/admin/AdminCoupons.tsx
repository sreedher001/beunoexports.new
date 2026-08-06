import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Coupon = Tables<"coupons">;

const emptyForm = {
  code: "", discount_type: "percent", discount_value: "", min_order_amount: "",
  max_discount: "", usage_limit: "", expires_at: "", is_active: true,
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchCoupons = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data || []);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", editing);
      if (error) toast.error(error.message);
      else toast.success("Coupon updated!");
    } else {
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Coupon created!");
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    fetchCoupons();
  };

  const editCoupon = (c: Coupon) => {
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_amount: c.min_order_amount ? String(c.min_order_amount) : "",
      max_discount: c.max_discount ? String(c.max_discount) : "",
      usage_limit: c.usage_limit ? String(c.usage_limit) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      is_active: c.is_active,
    });
    setEditing(c.id);
    setShowForm(true);
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Deleted");
    fetchCoupons();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Coupons ({coupons.length})</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
          className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Coupon
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold">{editing ? "Edit Coupon" : "Add Coupon"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required
                placeholder="e.g. WELCOME10"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary">
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount Value *</label>
              <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} required
                placeholder={form.discount_type === "percent" ? "e.g. 10" : "e.g. 100"}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            {form.discount_type === "percent" && (
              <div>
                <label className="block text-sm font-medium mb-1">Max Discount (₹, optional)</label>
                <input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                  placeholder="Cap the % discount"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Order Amount (₹)</label>
              <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                placeholder="0"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Usage Limit (optional)</label>
              <input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                placeholder="Unlimited if blank"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expires On (optional)</label>
              <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} id="coupon-active" />
              <label htmlFor="coupon-active" className="text-sm">Active</label>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
                {editing ? "Update Coupon" : "Add Coupon"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Discount</th>
                <th className="px-4 py-3 text-left font-medium">Min Order</th>
                <th className="px-4 py-3 text-left font-medium">Usage</th>
                <th className="px-4 py-3 text-left font-medium">Expires</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `₹${c.discount_value}`}
                    {c.max_discount && <span className="text-xs text-muted-foreground"> (max ₹{c.max_discount})</span>}
                  </td>
                  <td className="px-4 py-3">{c.min_order_amount > 0 ? `₹${c.min_order_amount}` : "—"}</td>
                  <td className="px-4 py-3">{c.times_used}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-IN") : "Never"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${c.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => editCoupon(c)} className="text-muted-foreground hover:text-foreground mr-2"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => deleteCoupon(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No coupons yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCoupons;
