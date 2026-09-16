import { useState, useEffect, cloneElement, isValidElement } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";

type Settings = {
  banner_retail_image_url: string | null;
  banner_retail_title: string | null;
  banner_retail_subtitle: string | null;
  banner_retail_cta_text: string | null;
  banner_retail_cta_link: string | null;
  banner_wholesale_image_url: string | null;
  banner_wholesale_title: string | null;
  banner_wholesale_subtitle: string | null;
  banner_wholesale_cta_text: string | null;
  banner_wholesale_cta_link: string | null;
};

const empty: Settings = {
  banner_retail_image_url: "", banner_retail_title: "", banner_retail_subtitle: "",
  banner_retail_cta_text: "", banner_retail_cta_link: "",
  banner_wholesale_image_url: "", banner_wholesale_title: "", banner_wholesale_subtitle: "",
  banner_wholesale_cta_text: "", banner_wholesale_cta_link: "",
};

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary";

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactElement }) => {
  const id = "banner-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">{label}</label>
      {isValidElement(children) ? cloneElement(children, { id } as Partial<unknown>) : children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
};

// One editable banner (image + title + subtitle + CTA button) for a single catalog mode.
const BannerEditor = ({
  mode, settings, setSettings,
}: {
  mode: "retail" | "wholesale";
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}) => {
  const [uploading, setUploading] = useState(false);
  const imageKey = `banner_${mode}_image_url` as const;
  const titleKey = `banner_${mode}_title` as const;
  const subtitleKey = `banner_${mode}_subtitle` as const;
  const ctaTextKey = `banner_${mode}_cta_text` as const;
  const ctaLinkKey = `banner_${mode}_cta_link` as const;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `banner-${mode}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setSettings((s) => ({ ...s, [imageKey]: data.publicUrl }));
    setUploading(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm mb-6">
      <h3 className="font-semibold mb-1 capitalize">{mode} Homepage Banner</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Shown on the homepage hero section when a visitor has {mode === "retail" ? "Retail" : "Wholesale"} selected
        (the toggle in the site header). Leave any field blank to fall back to the site's built-in default.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Banner Image</label>
          <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-secondary w-fit">
            <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload image"}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
          </label>
          {settings[imageKey] && (
            <img src={settings[imageKey] || ""} alt={`${mode} banner preview`} className="mt-3 h-28 w-full max-w-md rounded-lg object-cover border border-border" />
          )}
        </div>
        <div className="sm:col-span-2">
          <Field label="Title">
            <input className={inputCls} value={settings[titleKey] ?? ""} placeholder="e.g. Premium Indian Spices Delivered to Your Doorstep"
              onChange={(e) => setSettings((s) => ({ ...s, [titleKey]: e.target.value }))} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Subtitle">
            <textarea rows={2} className={inputCls + " resize-none"} value={settings[subtitleKey] ?? ""}
              placeholder="e.g. Fresh, authentic spices straight from Indian farms."
              onChange={(e) => setSettings((s) => ({ ...s, [subtitleKey]: e.target.value }))} />
          </Field>
        </div>
        <Field label="Button Text">
          <input className={inputCls} value={settings[ctaTextKey] ?? ""} placeholder="e.g. Shop Now"
            onChange={(e) => setSettings((s) => ({ ...s, [ctaTextKey]: e.target.value }))} />
        </Field>
        <Field label="Button Link" hint="A path on this site, e.g. /shop">
          <input className={inputCls} value={settings[ctaLinkKey] ?? ""} placeholder="/shop"
            onChange={(e) => setSettings((s) => ({ ...s, [ctaLinkKey]: e.target.value }))} />
        </Field>
      </div>
    </div>
  );
};

const AdminBanners = () => {
  const [settings, setSettings] = useState<Settings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_settings")
      .select("banner_retail_image_url,banner_retail_title,banner_retail_subtitle,banner_retail_cta_text,banner_retail_cta_link,banner_wholesale_image_url,banner_wholesale_title,banner_wholesale_subtitle,banner_wholesale_cta_text,banner_wholesale_cta_link")
      .eq("id", true).single().then(({ data }) => {
        if (data) setSettings({ ...empty, ...data });
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({
      banner_retail_image_url: settings.banner_retail_image_url || null,
      banner_retail_title: settings.banner_retail_title || null,
      banner_retail_subtitle: settings.banner_retail_subtitle || null,
      banner_retail_cta_text: settings.banner_retail_cta_text || null,
      banner_retail_cta_link: settings.banner_retail_cta_link || null,
      banner_wholesale_image_url: settings.banner_wholesale_image_url || null,
      banner_wholesale_title: settings.banner_wholesale_title || null,
      banner_wholesale_subtitle: settings.banner_wholesale_subtitle || null,
      banner_wholesale_cta_text: settings.banner_wholesale_cta_text || null,
      banner_wholesale_cta_link: settings.banner_wholesale_cta_link || null,
    }).eq("id", true);
    setSaving(false);
    if (error) toast.error("Failed to save banners");
    else toast.success("Banners saved!");
  };

  if (loading) return <div className="text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Homepage Banners</h1>
      <BannerEditor mode="retail" settings={settings} setSettings={setSettings} />
      <BannerEditor mode="wholesale" settings={settings} setSettings={setSettings} />
      <button onClick={save} disabled={saving}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {saving ? "Saving..." : "Save Banners"}
      </button>
    </div>
  );
};

export default AdminBanners;
