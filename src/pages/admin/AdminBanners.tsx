import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Plus, X } from "lucide-react";

type BannerForm = { id?: string; image_url: string; title: string; subtitle: string; cta_text: string; cta_link: string };

const emptyBanner: BannerForm = { image_url: "", title: "", subtitle: "", cta_text: "", cta_link: "" };
const MAX_BANNERS = 3;
const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary";

// One editable banner card within a mode's list.
const BannerCard = ({
  mode, index, banner, onChange, onRemove,
}: {
  mode: "retail" | "wholesale";
  index: number;
  banner: BannerForm;
  onChange: (next: BannerForm) => void;
  onRemove: () => void;
}) => {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `banner-${mode}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    onChange({ ...banner, image_url: data.publicUrl });
    setUploading(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Banner {index + 1}</h4>
        <button type="button" onClick={onRemove} aria-label={`Remove banner ${index + 1}`}
          className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Banner Image</label>
          <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-secondary w-fit">
            <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload image"}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
          </label>
          {banner.image_url && (
            <img src={banner.image_url} alt={`Banner ${index + 1} preview`} className="mt-3 h-28 w-full max-w-md rounded-lg object-cover border border-border" />
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Title</label>
          <input className={inputCls} value={banner.title} placeholder="e.g. Premium Indian Spices Delivered to Your Doorstep"
            onChange={(e) => onChange({ ...banner, title: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Subtitle</label>
          <textarea rows={2} className={inputCls + " resize-none"} value={banner.subtitle}
            placeholder="e.g. Fresh, authentic spices straight from Indian farms."
            onChange={(e) => onChange({ ...banner, subtitle: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Button Text</label>
          <input className={inputCls} value={banner.cta_text} placeholder="e.g. Shop Now"
            onChange={(e) => onChange({ ...banner, cta_text: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Button Link</label>
          <input className={inputCls} value={banner.cta_link} placeholder="/shop"
            onChange={(e) => onChange({ ...banner, cta_link: e.target.value })} />
        </div>
      </div>
    </div>
  );
};

// A mode's whole list (up to MAX_BANNERS) plus its "Add Banner" control.
const BannerModeSection = ({
  mode, banners, setBanners,
}: {
  mode: "retail" | "wholesale";
  banners: BannerForm[];
  setBanners: (next: BannerForm[]) => void;
}) => (
  <div className="mb-10">
    <div className="flex items-center justify-between mb-1">
      <h3 className="font-semibold capitalize">{mode} Homepage Banners</h3>
      <span className="text-xs text-muted-foreground">{banners.length} / {MAX_BANNERS}</span>
    </div>
    <p className="text-xs text-muted-foreground mb-4">
      Shown on the homepage when a visitor has {mode === "retail" ? "Retail" : "Wholesale"} selected. With more than
      one banner, they rotate automatically. Leave everything blank to fall back to the site's built-in default.
    </p>
    {banners.map((banner, i) => (
      <BannerCard key={i} mode={mode} index={i} banner={banner}
        onChange={(next) => setBanners(banners.map((b, j) => j === i ? next : b))}
        onRemove={() => setBanners(banners.filter((_, j) => j !== i))} />
    ))}
    {banners.length < MAX_BANNERS && (
      <button type="button" onClick={() => setBanners([...banners, { ...emptyBanner }])}
        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
        <Plus className="h-3.5 w-3.5" /> Add Banner
      </button>
    )}
  </div>
);

const toForm = (row: { id: string; image_url: string | null; title: string | null; subtitle: string | null; cta_text: string | null; cta_link: string | null }): BannerForm => ({
  id: row.id, image_url: row.image_url || "", title: row.title || "", subtitle: row.subtitle || "",
  cta_text: row.cta_text || "", cta_link: row.cta_link || "",
});

const AdminBanners = () => {
  const [retailBanners, setRetailBanners] = useState<BannerForm[]>([]);
  const [wholesaleBanners, setWholesaleBanners] = useState<BannerForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("banners").select("*").order("sort_order").then(({ data }) => {
      const rows = data || [];
      setRetailBanners(rows.filter((r) => r.mode === "retail").map(toForm));
      setWholesaleBanners(rows.filter((r) => r.mode === "wholesale").map(toForm));
      setLoading(false);
    });
  }, []);

  // Diffs a mode's edited list against what's in the DB: deletes removed rows,
  // updates existing ones (and their new sort order), inserts new ones.
  const syncMode = async (mode: "retail" | "wholesale", list: BannerForm[]) => {
    const { data: existing } = await supabase.from("banners").select("id").eq("mode", mode);
    const existingIds = new Set((existing || []).map((r) => r.id));
    const keptIds = new Set(list.filter((b) => b.id).map((b) => b.id));
    const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
    if (toDelete.length > 0) {
      const { error } = await supabase.from("banners").delete().in("id", toDelete);
      if (error) return error;
    }
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const row = {
        mode, sort_order: i,
        image_url: b.image_url || null, title: b.title || null, subtitle: b.subtitle || null,
        cta_text: b.cta_text || null, cta_link: b.cta_link || null,
      };
      const { error } = b.id
        ? await supabase.from("banners").update(row).eq("id", b.id)
        : await supabase.from("banners").insert(row);
      if (error) return error;
    }
    return null;
  };

  const save = async () => {
    setSaving(true);
    const retailError = await syncMode("retail", retailBanners);
    const wholesaleError = await syncMode("wholesale", wholesaleBanners);
    setSaving(false);
    if (retailError || wholesaleError) { toast.error("Failed to save some banners"); return; }
    toast.success("Banners saved!");
  };

  if (loading) return <div className="text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Homepage Banners</h1>
      <BannerModeSection mode="retail" banners={retailBanners} setBanners={setRetailBanners} />
      <BannerModeSection mode="wholesale" banners={wholesaleBanners} setBanners={setWholesaleBanners} />
      <button onClick={save} disabled={saving}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {saving ? "Saving..." : "Save Banners"}
      </button>
    </div>
  );
};

export default AdminBanners;
