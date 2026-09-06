
-- Single-row site configuration: shipping/tax rules + SEO/analytics settings,
-- editable from the admin panel. Publicly readable (storefront needs shipping/tax
-- and analytics IDs client-side), admin-only writable.
CREATE TABLE public.site_settings (
    id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true), -- enforces a single row
    flat_shipping_rate NUMERIC NOT NULL DEFAULT 0,
    free_shipping_threshold NUMERIC,
    tax_percent NUMERIC NOT NULL DEFAULT 0,
    ga_measurement_id TEXT,
    meta_pixel_id TEXT,
    search_console_verification TEXT,
    default_meta_title TEXT,
    default_meta_description TEXT,
    default_og_image TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site settings are viewable by everyone" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (id) VALUES (true);
