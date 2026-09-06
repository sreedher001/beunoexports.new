import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

type Settings = {
  flat_shipping_rate: number;
  free_shipping_threshold: number | null;
  tax_percent: number;
  ga_measurement_id: string | null;
  meta_pixel_id: string | null;
  search_console_verification: string | null;
  default_meta_title: string | null;
  default_meta_description: string | null;
  default_og_image: string | null;
  cod_enabled: boolean;
  online_payment_enabled: boolean;
};

const empty: Settings = {
  flat_shipping_rate: 0, free_shipping_threshold: null, tax_percent: 0,
  ga_measurement_id: "", meta_pixel_id: "", search_console_verification: "",
  default_meta_title: "", default_meta_description: "", default_og_image: "",
  cod_enabled: true, online_payment_enabled: true,
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-medium mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary";

const AdminSeo = () => {
  const [settings, setSettings] = useState<Settings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").eq("id", true).single().then(({ data }) => {
      if (data) setSettings({ ...empty, ...data });
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!settings.cod_enabled && !settings.online_payment_enabled) {
      toast.error("Enable at least one payment method before saving");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({
      flat_shipping_rate: Number(settings.flat_shipping_rate) || 0,
      free_shipping_threshold: settings.free_shipping_threshold ? Number(settings.free_shipping_threshold) : null,
      tax_percent: Number(settings.tax_percent) || 0,
      ga_measurement_id: settings.ga_measurement_id || null,
      meta_pixel_id: settings.meta_pixel_id || null,
      search_console_verification: settings.search_console_verification || null,
      default_meta_title: settings.default_meta_title || null,
      default_meta_description: settings.default_meta_description || null,
      default_og_image: settings.default_og_image || null,
      cod_enabled: settings.cod_enabled,
      online_payment_enabled: settings.online_payment_enabled,
    }).eq("id", true);
    setSaving(false);
    if (error) toast.error("Failed to save settings");
    else toast.success("Settings saved!");
  };

  if (loading) return <div className="text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">SEO & Site Settings</h1>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm mb-6">
        <h3 className="font-semibold mb-4">Payment Methods</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cash on Delivery</p>
              <p className="text-xs text-muted-foreground">Let customers pay when their order arrives</p>
            </div>
            <Switch checked={settings.cod_enabled} onCheckedChange={(v) => setSettings({ ...settings, cod_enabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Online Payment (Razorpay)</p>
              <p className="text-xs text-muted-foreground">Let customers pay by card / UPI / netbanking</p>
            </div>
            <Switch checked={settings.online_payment_enabled} onCheckedChange={(v) => setSettings({ ...settings, online_payment_enabled: v })} />
          </div>
          {!settings.cod_enabled && !settings.online_payment_enabled && (
            <p className="text-xs text-destructive">Both payment methods are off — customers won't be able to check out. Enable at least one.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm mb-6">
        <h3 className="font-semibold mb-4">Shipping & Tax</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Flat Shipping Rate (₹)">
            <input type="number" className={inputCls} value={settings.flat_shipping_rate}
              onChange={(e) => setSettings({ ...settings, flat_shipping_rate: Number(e.target.value) })} />
          </Field>
          <Field label="Free Shipping Above (₹)" hint="Leave blank to disable free-shipping threshold">
            <input type="number" className={inputCls} value={settings.free_shipping_threshold ?? ""}
              onChange={(e) => setSettings({ ...settings, free_shipping_threshold: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <Field label="Tax (%)">
            <input type="number" className={inputCls} value={settings.tax_percent}
              onChange={(e) => setSettings({ ...settings, tax_percent: Number(e.target.value) })} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm mb-6">
        <h3 className="font-semibold mb-4">Analytics & Search Console</h3>
        <div className="grid gap-4">
          <Field label="Google Analytics 4 Measurement ID" hint="e.g. G-XXXXXXXXXX — leave blank to disable GA">
            <input className={inputCls} value={settings.ga_measurement_id ?? ""}
              onChange={(e) => setSettings({ ...settings, ga_measurement_id: e.target.value })} placeholder="G-XXXXXXXXXX" />
          </Field>
          <Field label="Meta (Facebook) Pixel ID" hint="Leave blank to disable Meta Pixel">
            <input className={inputCls} value={settings.meta_pixel_id ?? ""}
              onChange={(e) => setSettings({ ...settings, meta_pixel_id: e.target.value })} placeholder="123456789012345" />
          </Field>
          <Field label="Google Search Console Verification Code" hint="Paste just the content value from Google's meta tag, e.g. abc123... (not the full tag)">
            <input className={inputCls} value={settings.search_console_verification ?? ""}
              onChange={(e) => setSettings({ ...settings, search_console_verification: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm mb-6">
        <h3 className="font-semibold mb-4">Default Meta Tags</h3>
        <div className="grid gap-4">
          <Field label="Default Meta Title">
            <input className={inputCls} value={settings.default_meta_title ?? ""}
              onChange={(e) => setSettings({ ...settings, default_meta_title: e.target.value })} />
          </Field>
          <Field label="Default Meta Description">
            <textarea rows={2} className={inputCls + " resize-none"} value={settings.default_meta_description ?? ""}
              onChange={(e) => setSettings({ ...settings, default_meta_description: e.target.value })} />
          </Field>
          <Field label="Default OG Image URL" hint="Shown when the site is shared on social media">
            <input className={inputCls} value={settings.default_og_image ?? ""}
              onChange={(e) => setSettings({ ...settings, default_og_image: e.target.value })} />
          </Field>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
};

export default AdminSeo;
