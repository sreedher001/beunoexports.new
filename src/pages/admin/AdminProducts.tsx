import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string; name: string; slug: string; description: string | null;
  price: number; mrp: number; image_url: string | null; stock: number;
  unit: string; weight: string | null; category_id: string | null; is_active: boolean;
  catalog_type: string; moq: number | null;
};

type Category = { id: string; name: string; slug: string };

const emptyForm = {
  name: "", slug: "", description: "", price: "", mrp: "", stock: "", unit: "kg", weight: "", category_id: "", image_url: "", is_active: true,
  catalog_type: "retail", moq: "",
};

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const fetchProducts = async () => {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    setProducts(prods || []);
    setCategories(cats || []);
  };

  useEffect(() => { fetchProducts(); }, []);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleNameChange = (name: string) => {
    setForm({ ...form, name, slug: editing ? form.slug : slugify(name) });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm({ ...form, image_url: data.publicUrl });
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      price: Number(form.price),
      mrp: Number(form.mrp),
      stock: Number(form.stock),
      unit: form.unit,
      weight: form.weight || null,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      is_active: form.is_active,
      catalog_type: form.catalog_type,
      moq: form.moq ? Number(form.moq) : null,
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing);
      if (error) toast.error("Update failed");
      else toast.success("Product updated!");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Product added!");
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    fetchProducts();
  };

  const editProduct = (p: Product) => {
    setForm({
      name: p.name, slug: p.slug, description: p.description || "",
      price: String(p.price), mrp: String(p.mrp), stock: String(p.stock),
      unit: p.unit, weight: p.weight || "", category_id: p.category_id || "",
      image_url: p.image_url || "", is_active: p.is_active,
      catalog_type: p.catalog_type, moq: p.moq ? String(p.moq) : "",
    });
    setEditing(p.id);
    setShowForm(true);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Deleted");
    fetchProducts();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products ({products.length})</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}
          className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold">{editing ? "Edit Product" : "Add Product"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (₹) *</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">MRP (₹)</label>
              <input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary">
                <option value="kg">kg</option><option value="g">g</option><option value="pack">pack</option><option value="piece">piece</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Weight/Size</label>
              <input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 500g, 1kg"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary">
                <option value="">No Category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Catalog</label>
              <select value={form.catalog_type} onChange={(e) => setForm({ ...form, catalog_type: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary">
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </select>
            </div>
            {form.catalog_type === "wholesale" && (
              <div>
                <label className="block text-sm font-medium mb-1">MOQ (Minimum Order Qty)</label>
                <input type="number" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} placeholder="e.g. 50"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Image</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
              {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-16 w-16 rounded object-cover" />}
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} id="active" />
              <label htmlFor="active" className="text-sm">Active (visible in shop)</label>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
                {editing ? "Update Product" : "Add Product"}
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
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Catalog</th>
                <th className="px-4 py-3 text-left font-medium">Price</th>
                <th className="px-4 py-3 text-left font-medium">Stock</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image_url || "/placeholder.svg"} alt="" className="h-10 w-10 rounded object-cover" />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.weight}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${p.catalog_type === "wholesale" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {p.catalog_type}
                    </span>
                    {p.catalog_type === "wholesale" && p.moq && <p className="text-xs text-muted-foreground mt-1">MOQ: {p.moq}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">₹{p.price}</p>
                    {p.mrp > p.price && <p className="text-xs text-muted-foreground line-through">₹{p.mrp}</p>}
                  </td>
                  <td className="px-4 py-3">{p.stock} {p.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => editProduct(p)} className="text-muted-foreground hover:text-foreground mr-2"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => deleteProduct(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No products yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
